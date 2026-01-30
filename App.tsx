import React, { useState, useMemo, useEffect } from 'react';
import { MainLayout } from './components/MainLayout';
import { CitationEditor } from './components/CitationEditor';
import { CitationCard } from './components/CitationCard';
import { Project, Citation, SidebarItem } from './types';
import { supabase } from './lib/supabase';
import { api } from './lib/api';
import { Auth } from './Auth';
import { MobileLanding } from './components/MobileLanding';
import { FolderPlus, CheckSquare, Square, Trash2, Plus, X, Folder, Check, Copy } from 'lucide-react';

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

  // --- Batch State ---
  const [selectedCitationIds, setSelectedCitationIds] = useState<Set<string>>(new Set());
  const [showBatchFolderMenu, setShowBatchFolderMenu] = useState(false);
  const [isCreatingBatchFolder, setIsCreatingBatchFolder] = useState(false);
  const [newBatchFolderName, setNewBatchFolderName] = useState('');
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [isBatchCopying, setIsBatchCopying] = useState(false);

  // --- Handlers ---
  const handleToggleSelect = (id: string, selected: boolean) => {
    setSelectedCitationIds(prev => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSelectAll = (select: boolean) => {
    if (select) {
      setSelectedCitationIds(new Set(filteredCitations.map(c => c.id)));
    } else {
      setSelectedCitationIds(new Set());
    }
  };

  const handleBatchAddToProject = async (projectId: string) => {
    if (!session || selectedCitationIds.size === 0) return;
    try {
      await api.addCitationsToProject(session.user.id, projectId, Array.from(selectedCitationIds));

      // Update local state to reflect changes
      setProjects(prev => prev.map(p => {
        if (p.id === projectId) {
          // Add only new IDs
          const newIds = Array.from(selectedCitationIds).filter(cid => !p.citationIds.includes(cid));
          return { ...p, citationIds: [...p.citationIds, ...newIds] };
        }
        return p;
      }));

      setSelectedCitationIds(new Set());
      setShowBatchFolderMenu(false);
    } catch (error) {
      console.error('Error batch adding to project:', error);
    }
  };

  const handleBatchCopy = async () => {
    if (selectedCitationIds.size === 0) return;
    setIsBatchCopying(true);

    const selectedCitationsList = filteredCitations.filter(c => selectedCitationIds.has(c.id));
    const copyText = selectedCitationsList.map(citation => {
      let text = `"${citation.text}"`;
      const isSelf = citation.isSelf ?? (citation.author === username || !citation.author || citation.author === 'Self');
      if (!isSelf && citation.author) {
        text += ` — ${citation.author}`;
        if (citation.book) text += `, 《${citation.book}》`;
        if (citation.page) text += `, p.${citation.page}`;
      }
      return text;
    }).join('\n\n');

    try {
      await navigator.clipboard.writeText(copyText);
      // Optional: show a mini toast instead of alert
      setTimeout(() => setIsBatchCopying(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      setIsBatchCopying(false);
    }
  };

  const handleBatchCreateAndAddToProject = async () => {
    if (!session || !newBatchFolderName.trim() || selectedCitationIds.size === 0) return;
    try {
      // 1. Create Project
      const newProject = await api.createProject(session.user.id, newBatchFolderName);
      setProjects(prev => [...prev, newProject]);

      // 2. Add Citations
      await api.addCitationsToProject(session.user.id, newProject.id, Array.from(selectedCitationIds));

      // 3. Update Project State with citations
      setProjects(prev => prev.map(p => {
        if (p.id === newProject.id) {
          return { ...p, citationIds: Array.from(selectedCitationIds) };
        }
        return p;
      }));

      setNewBatchFolderName('');
      setIsCreatingBatchFolder(false);
      setShowBatchFolderMenu(false);
      setSelectedCitationIds(new Set());
    } catch (error) {
      console.error('Error creating batch folder:', error);
    }
  };

  const handleBatchDelete = async () => {
    if (!session || selectedCitationIds.size === 0) return;

    try {
      const idsToDelete = Array.from(selectedCitationIds);
      await Promise.all(idsToDelete.map((id: string) => api.deleteCitation(session.user.id, id)));

      setCitations(prev => prev.filter(c => !selectedCitationIds.has(c.id)));
      setProjects(prev => prev.map(p => ({
        ...p,
        citationIds: p.citationIds.filter(cid => !selectedCitationIds.has(cid))
      })));

      setSelectedCitationIds(new Set());
      setShowBatchDeleteModal(false);
    } catch (error) {
      console.error('Error batch deleting:', error);
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
        <div className="pt-10 pb-0">
          <div className="max-w-3xl mx-auto px-8">
            <h2 className="font-serif text-3xl text-slate-800 mb-6 truncate">
              {viewTitle}
            </h2>
            {!searchTerm && !selectedProjectId && (
              <div className="mb-4">
                <CitationEditor onAddCitation={handleAddCitation} prefillData={editorPrefill} username={username} />
              </div>
            )}
          </div>
        </div>

        <div className="px-8 pb-20">
          <div className="max-w-3xl mx-auto">
            {/* Toolbar Area - Reserved space to prevent jumping */}
            <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm mb-2 h-14 flex items-center">
              {selectedCitationIds.size > 0 && filteredCitations.length > 0 && (
                <div className="w-full flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200/60 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200 transition-all">
                  <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-3 pl-1">
                      <button
                        onClick={() => handleSelectAll(selectedCitationIds.size < filteredCitations.length)}
                        className="flex items-center text-slate-400 hover:text-indigo-600 transition-colors"
                        title="Select All"
                      >
                        {selectedCitationIds.size > 0 && selectedCitationIds.size === filteredCitations.length ? (
                          <CheckSquare size={18} className="text-indigo-600" />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                      <div className="h-4 w-[1px] bg-slate-300 mx-1"></div>
                      <span className="text-sm font-bold text-indigo-600">
                        {selectedCitationIds.size} Selected
                      </span>
                    </div>

                    <div className="flex items-center gap-1 pr-1">
                      {/* Folder Menu */}
                      <div className="relative">
                        <button
                          onClick={() => setShowBatchFolderMenu(!showBatchFolderMenu)}
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-full transition-all"
                          title="Move to Folder"
                        >
                          <Folder size={18} />
                        </button>

                        {showBatchFolderMenu && (
                          <div className="absolute top-full right-0 mt-1 w-56 bg-white text-slate-800 border border-slate-200 rounded-xl shadow-2xl z-[110] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                            <div className="p-2 border-b border-slate-100 bg-slate-50">
                              {isCreatingBatchFolder ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    autoFocus
                                    type="text"
                                    placeholder="Folder Name..."
                                    value={newBatchFolderName}
                                    onChange={(e) => setNewBatchFolderName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleBatchCreateAndAddToProject();
                                      if (e.key === 'Escape') setIsCreatingBatchFolder(false);
                                    }}
                                    className="flex-1 text-xs px-2 py-1.5 border border-indigo-200 rounded-md focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none"
                                  />
                                </div>
                              ) : (
                                <button
                                  onClick={() => setIsCreatingBatchFolder(true)}
                                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors font-bold"
                                >
                                  <Plus size={14} /> New Folder
                                </button>
                              )}
                            </div>
                            <div className="max-h-56 overflow-y-auto py-1">
                              {projects.length === 0 && <div className="px-4 py-3 text-xs text-slate-400 text-center">No existing folders</div>}
                              {projects.map(p => (
                                <button
                                  key={p.id}
                                  onClick={() => handleBatchAddToProject(p.id)}
                                  className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                >
                                  <Folder size={14} className="text-slate-400" />
                                  <span className="truncate">{p.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleBatchCopy}
                        className={`p-2 rounded-full transition-all ${isBatchCopying ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-50'}`}
                        title="Copy to Clipboard"
                      >
                        {isBatchCopying ? <Check size={18} /> : <Copy size={18} />}
                      </button>

                      <button
                        onClick={() => setShowBatchDeleteModal(true)}
                        className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                        title="Delete Selected"
                      >
                        <Trash2 size={18} />
                      </button>

                      {(filter || searchTerm) && (
                        <>
                          <div className="h-4 w-[1px] bg-slate-300 mx-1"></div>
                          <button
                            onClick={() => { setFilter(null); setSearchTerm(''); setEditorPrefill(undefined); }}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
                            title="Clear Filters"
                          >
                            <X size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Clear Results Button (When nothing selected but filtered) */}
            {selectedCitationIds.size === 0 && (filter || searchTerm) && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => { setFilter(null); setSearchTerm(''); setEditorPrefill(undefined); }}
                  className="text-xs px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-full transition-colors font-medium"
                >
                  Clear search results
                </button>
              </div>
            )}


            {/* Delete Confirmation Modal */}
            {showBatchDeleteModal && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <div
                  className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                ></div>
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 fade-in duration-200">
                  <div className="p-6 pt-8 text-center">
                    <div className="mx-auto w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                      <Trash2 size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">삭제하시겠습니까?</h3>
                    <p className="text-sm text-slate-500">
                      선택한 <span className="font-bold text-slate-700">{selectedCitationIds.size}</span>개의 인용구가 영구히 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                    </p>
                  </div>
                  <div className="flex border-t border-slate-100">
                    <button
                      onClick={() => setShowBatchDeleteModal(false)}
                      className="flex-1 px-4 py-4 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleBatchDelete}
                      className="flex-1 px-4 py-4 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
                    >
                      삭제하기
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                      isSelected={selectedCitationIds.has(citation.id)}
                      onToggleSelect={handleToggleSelect}
                      onAddNote={handleAddNote}
                      onUpdateNote={handleUpdateNote}
                      onDeleteNote={handleDeleteNote}
                      onDelete={handleDeleteCitation}
                      onUpdate={handleUpdateCitation}
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
      </div>
    </MainLayout>
  );
};

export default App;