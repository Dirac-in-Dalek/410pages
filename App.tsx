import React, { useState, useMemo, useEffect } from 'react';
import { MainLayout } from './components/MainLayout';
import { CitationEditor } from './components/CitationEditor';
import { CitationCard } from './components/CitationCard';
import { Project, Citation, SidebarItem } from './types';
import { supabase } from './lib/supabase';
import { api } from './lib/api';
import { Auth } from './Auth';
import { MobileLanding } from './components/MobileLanding';

interface FilterState {
  type: 'author' | 'book';
  value: string;
  author?: string;
}

const App: React.FC = () => {
  // --- Auth & System State ---
  const [session, setSession] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [username, setUsername] = useState('Researcher');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // --- App Data State ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterState | null>(null);
  const [editorPrefill, setEditorPrefill] = useState<{ author: string, book: string } | undefined>(undefined);

  // --- Effects ---

  // Check Mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check Auth & Fetch Data
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        fetchData();
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        fetchData();
      } else {
        setUsername('Researcher');
        setCitations([]);
        setProjects([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();

      if (data?.username) {
        setUsername(data.username);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [citationsData, projectsData] = await Promise.all([
        api.fetchCitations(),
        api.fetchProjects()
      ]);
      setCitations(citationsData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUsername = async (newUsername: string) => {
    if (!session) return;
    try {
      await api.updateProfile(session.user.id, newUsername);
      setUsername(newUsername);
    } catch (error) {
      console.error('Error updating username:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // --- Handlers ---

  const handleAddCitation = async (data: Omit<Citation, 'id' | 'createdAt' | 'notes'>) => {
    if (!session) return;
    try {
      const newCitation = await api.addCitation(session.user.id, data);
      setCitations(prev => [newCitation, ...prev]);
    } catch (error) {
      console.error('Error adding citation:', error);
    }
  };

  const handleAddNote = async (citationId: string, content: string) => {
    if (!session) return;
    try {
      const newNote = await api.addNote(session.user.id, citationId, content);
      setCitations(prev => prev.map(c => {
        if (c.id === citationId) {
          return { ...c, notes: [...c.notes, newNote] };
        }
        return c;
      }));
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const handleUpdateNote = async (citationId: string, noteId: string, content: string) => {
    if (!session) return;
    try {
      await api.updateNote(session.user.id, noteId, content);
      setCitations(prev => prev.map(c => {
        if (c.id === citationId) {
          return {
            ...c,
            notes: c.notes.map(n => n.id === noteId ? { ...n, content } : n)
          };
        }
        return c;
      }));
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const handleDeleteNote = async (citationId: string, noteId: string) => {
    if (!session) return;
    try {
      await api.deleteNote(session.user.id, noteId);
      setCitations(prev => prev.map(c => {
        if (c.id === citationId) {
          return {
            ...c,
            notes: c.notes.filter(n => n.id !== noteId)
          };
        }
        return c;
      }));
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleDeleteCitation = async (id: string) => {
    if (!session) return;
    try {
      await api.deleteCitation(session.user.id, id);
      setCitations(prev => prev.filter(c => c.id !== id));
      setProjects(prev => prev.map(p => ({
        ...p,
        citationIds: p.citationIds.filter(cid => cid !== id)
      })));
    } catch (error) {
      console.error('Error deleting citation:', error);
    }
  };

  const handleUpdateCitation = async (id: string, data: Partial<Citation>) => {
    if (!session) return;
    try {
      await api.updateCitation(session.user.id, id, data);
      setCitations(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    } catch (error) {
      console.error('Error updating citation:', error);
    }
  };

  const handleCreateProject = async (name: string) => {
    if (!session) return;
    try {
      const newProject = await api.createProject(session.user.id, name);
      setProjects(prev => [...prev, newProject]);
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const handleRenameProject = async (id: string, name: string) => {
    if (!session) return;
    try {
      await api.renameProject(session.user.id, id, name);
      setProjects(prev => prev.map(p => p.id === id ? { ...p, name } : p));
    } catch (error) {
      console.error('Error renaming project:', error);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!session) return;
    try {
      await api.deleteProject(session.user.id, id);
      setProjects(prev => prev.filter(p => p.id !== id));
      if (selectedProjectId === id) setSelectedProjectId(null);
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const handleProjectSelect = (id: string | null) => {
    setSelectedProjectId(id);
    setFilter(null);
    setSearchTerm('');
    setEditorPrefill(undefined);
  };

  const handleDropCitationToProject = async (projectId: string, citationId: string) => {
    if (!session) return;
    try {
      await api.addCitationToProject(session.user.id, projectId, citationId);
      setProjects(prev => prev.map(p => {
        if (p.id === projectId && !p.citationIds.includes(citationId)) {
          return { ...p, citationIds: [...p.citationIds, citationId] };
        }
        return p;
      }));
    } catch (error) {
      console.error('Error adding citation to project:', error);
    }
  };

  const handleTreeItemClick = (item: SidebarItem) => {
    if (item.data) {
      setEditorPrefill({
        author: item.data.author,
        book: item.data.book || ''
      });
      setFilter({
        type: item.type === 'book' ? 'book' : 'author',
        value: item.type === 'book' ? item.data.book! : item.data.author,
        author: item.data.author
      });
      setSelectedProjectId(null);
      setSearchTerm('');
    }
  };

  // --- Derived State ---
  const treeData = useMemo(() => {
    const rootID = 'root-user';
    const rootItems: SidebarItem[] = [
      {
        id: rootID,
        label: username,
        type: 'root',
        data: { author: username, book: '' }
      }
    ];

    const authorsMap = new Map<string, Set<string>>();
    citations.forEach(c => {
      // Map isSelf authors to the actual username for grouping
      const effectiveAuthor = c.isSelf ? username : c.author;
      if (effectiveAuthor) {
        if (!authorsMap.has(effectiveAuthor)) authorsMap.set(effectiveAuthor, new Set());
        if (c.book) authorsMap.get(effectiveAuthor)?.add(c.book);
      }
    });

    // Group user's books under the root item
    const userBooks = authorsMap.get(username);
    if (userBooks) {
      rootItems[0].children = Array.from(userBooks).map(book => ({
        id: `book-${username}-${book}`,
        label: book,
        type: 'book',
        data: { author: username, book }
      }));
      rootItems[0].children.sort((a, b) => a.label.localeCompare(b.label));
    }

    const authorItems: SidebarItem[] = Array.from(authorsMap.entries())
      .filter(([author]) => author !== username)
      .map(([author, books]) => {
        const bookItems: SidebarItem[] = Array.from(books).map(book => ({
          id: `book-${author}-${book}`,
          label: book,
          type: 'book',
          data: { author, book }
        }));
        bookItems.sort((a, b) => a.label.localeCompare(b.label));
        return {
          id: `author-${author}`,
          label: author,
          type: 'author',
          data: { author },
          children: bookItems.length > 0 ? bookItems : undefined
        };
      });

    authorItems.sort((a, b) => a.label.localeCompare(b.label));
    return [...rootItems, ...authorItems];
  }, [citations, username]);

  const filteredCitations = useMemo(() => {
    let result = citations;

    // Filter by project or tree node
    if (selectedProjectId) {
      const project = projects.find(p => p.id === selectedProjectId);
      result = result.filter(c => project?.citationIds.includes(c.id));
    } else if (filter) {
      if (filter.type === 'author') {
        result = result.filter(c => {
          const effectiveAuthor = c.isSelf ? username : c.author;
          return effectiveAuthor === filter.value;
        });
      } else if (filter.type === 'book') {
        result = result.filter(c => {
          const isSameBook = c.book === filter.value;
          const effectiveAuthor = c.isSelf ? username : c.author;
          const isSameAuthor = !filter.author || effectiveAuthor === filter.author;
          return isSameBook && isSameAuthor;
        });
      }
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      result = result.filter(c =>
        c.text.toLowerCase().includes(s) ||
        c.author.toLowerCase().includes(s) ||
        c.book.toLowerCase().includes(s)
      );
    }

    return result;
  }, [citations, selectedProjectId, projects, filter, searchTerm]);

  let viewTitle = 'The Archive';
  if (searchTerm.trim()) {
    viewTitle = `Search: ${searchTerm}`;
  } else if (selectedProjectId) {
    viewTitle = projects.find(p => p.id === selectedProjectId)?.name || 'Project';
  } else if (filter) {
    viewTitle = filter.value || (filter.type === 'author' ? 'Author View' : 'Book View');
  }

  // --- RENDER ---
  if (isMobile) {
    return <MobileLanding />;
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <MainLayout
      projects={projects}
      selectedProjectId={selectedProjectId}
      onProjectSelect={handleProjectSelect}
      onDropCitationToProject={handleDropCitationToProject}
      onCreateProject={handleCreateProject}
      onRenameProject={handleRenameProject}
      onDeleteProject={handleDeleteProject}
      onReorderProjects={() => { }} // No server-side reordering yet
      treeData={treeData}
      onTreeItemClick={handleTreeItemClick}
      username={username}
      onUpdateUsername={handleUpdateUsername}
      onSignOut={handleSignOut}
      onSearch={setSearchTerm}
      searchTerm={searchTerm}
    >
      <div className="h-full overflow-y-auto bg-slate-50">
        <div className="p-8 pb-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-serif text-3xl text-slate-800 mb-2 truncate">
              {viewTitle}
            </h2>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-slate-500 text-sm">
                {filteredCitations.length} {filteredCitations.length === 1 ? 'citation' : 'citations'} {searchTerm ? 'matched' : 'collected'}
              </span>
              {(filter || searchTerm) && (
                <button
                  onClick={() => { setFilter(null); setSearchTerm(''); setEditorPrefill(undefined); }}
                  className="text-xs px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-full transition-colors"
                >
                  Clear Results
                </button>
              )}
            </div>

            {!searchTerm && !selectedProjectId && (
              <div className="mb-10">
                <CitationEditor onAddCitation={handleAddCitation} prefillData={editorPrefill} username={username} />
              </div>
            )}
          </div>
        </div>

        <div className="px-8 pb-20">
          <div className="max-w-3xl mx-auto">
            {loading ? (
              <div className="text-center py-20 text-slate-400">Loading your citations...</div>
            ) : filteredCitations.length > 0 ? (
              filteredCitations.map((citation, index) => {
                const citationProjects = projects
                  .filter(p => p.citationIds.includes(citation.id))
                  .map(p => p.name);

                return (
                  <CitationCard
                    key={citation.id}
                    index={index}
                    citation={citation}
                    username={username}
                    projectNames={citationProjects}
                    onAddNote={handleAddNote}
                    onUpdateNote={handleUpdateNote}
                    onDeleteNote={handleDeleteNote}
                    onDelete={handleDeleteCitation}
                    onUpdate={handleUpdateCitation}
                    onReorder={() => { }} // No local reordering for now during sync
                  />
                );
              })
            ) : (
              <div className="text-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                <p>{searchTerm ? 'No matches found.' : 'No citations found in this view.'}</p>
                <p className="text-xs mt-2">{searchTerm ? 'Try another keyword.' : 'Drag items from the right or type above.'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default App;