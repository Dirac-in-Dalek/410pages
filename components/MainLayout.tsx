import React, { useState, useRef, useEffect } from 'react';
import { Folder, FolderOpen, Plus, Search, User, Book, ChevronRight, ChevronDown, Layers, Edit2, Trash2, Check, X, Settings, GripVertical, LogOut } from 'lucide-react';
import { Project, SidebarItem } from '../types';

interface MainLayoutProps {
  children: React.ReactNode;
  projects: Project[];
  onProjectSelect: (projectId: string | null) => void;
  selectedProjectId: string | null;
  onDropCitationToProject: (projectId: string, citationId: string) => void;
  onCreateProject: (name: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
  onReorderProjects: (dragIndex: number, hoverIndex: number) => void;
  treeData: SidebarItem[];
  onTreeItemClick: (item: SidebarItem) => void;
  username?: string;
  onUpdateUsername?: (name: string) => void;
  onSignOut?: () => void;
  onSearch?: (term: string) => void;
  searchTerm?: string;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  projects,
  onProjectSelect,
  selectedProjectId,
  onDropCitationToProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onReorderProjects,
  treeData,
  onTreeItemClick,
  username = 'Researcher',
  onUpdateUsername,
  onSignOut,
  onSearch,
  searchTerm = ''
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['benjamin']));
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, projectId: string } | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isManageMode, setIsManageMode] = useState(false);
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(username);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const toggleNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(expandedNodes);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedNodes(newSet);
  };
  // ... (rest of the component logic remains strictly same until return)
  // To ensure I don't break the file, I will use precise targeting for the Footer part separately?
  // replace_file_content is for SINGLE CONTIGuous block.
  // I am changing the props interface AND the component signature. 
  // I can do this in one block if I select lines 17 to approx 40.
  // However, I also need to update the Footer which is at line 360.
  // This requires MULTI_REPLACE.

  // Changing tool to multi_replace in my thought process.
  // Wait, the tool definition says "Do NOT use this tool (replace_file_content) if you are only editing a single contiguous block of lines."
  // I have TWO blocks to edit: Interface/Signature AND Footer.
  // I should use `multi_replace_file_content`.

  // Re-evaluating. I will use multi_replace interaction in the next turn or right now.

  // Handlers ...
  const handleDragStartRef = (e: React.DragEvent, data: any) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'reference',
      ...data
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };
  // ...

  const handleDragOver = (e: React.DragEvent, projectId?: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (projectId && !isManageMode && dragOverProjectId !== projectId) {
      setDragOverProjectId(projectId);
    }
  };

  const handleDropOnProject = (e: React.DragEvent, projectId: string) => {
    e.preventDefault();
    setDragOverProjectId(null);
    try {
      // Check if it's a citation drop (JSON data)
      const rawData = e.dataTransfer.getData('application/json');
      if (rawData) {
        const data = JSON.parse(rawData);
        if (data.type === 'citation') {
          onDropCitationToProject(projectId, data.id);
        }
      }
    } catch (err) {
      console.error("Failed to parse drop data", err);
    }
  };

  // --- Project Reordering Logic ---
  const handleProjectDragStart = (e: React.DragEvent, index: number) => {
    // Set a custom format for internal reordering
    e.dataTransfer.setData('project_sort_index', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleProjectDropSort = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndexStr = e.dataTransfer.getData('project_sort_index');
    if (dragIndexStr) {
      const dragIndex = parseInt(dragIndexStr, 10);
      if (!isNaN(dragIndex) && dragIndex !== dropIndex) {
        onReorderProjects(dragIndex, dropIndex);
      }
    }
  };

  // --- Context Menu Logic ---
  const handleContextMenu = (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, projectId });
  };

  const startRename = (id: string, currentName: string) => {
    setEditingProjectId(id);
    setEditingName(currentName);
    setContextMenu(null);
    setIsManageMode(false); // Exit manage mode if entered via context menu
  };

  const submitRename = () => {
    if (editingProjectId && editingName.trim()) {
      onRenameProject(editingProjectId, editingName.trim());
    }
    setEditingProjectId(null);
  };

  const submitCreate = () => {
    if (newProjectName.trim()) {
      onCreateProject(newProjectName.trim());
    }
    setIsCreating(false);
    setNewProjectName('');
  };

  const submitUsername = () => {
    if (newUsername.trim() && onUpdateUsername) {
      onUpdateUsername(newUsername.trim());
    }
    setIsEditingUsername(false);
  };

  const renderTree = (items: SidebarItem[], depth = 0) => {
    return items.map(item => {
      const isExpanded = expandedNodes.has(item.id);
      const paddingLeft = depth * 12 + 12;

      return (
        <div key={item.id}>
          <div
            className={`
              flex items-center py-1.5 px-2 text-sm cursor-pointer select-none
              hover:bg-slate-100 text-slate-600 rounded-md my-0.5
              transition-colors duration-150 group
            `}
            style={{ paddingLeft: `${paddingLeft}px` }}
            onClick={() => onTreeItemClick(item)}
            draggable
            onDragStart={(e) => handleDragStartRef(e, item.data)}
          >
            <span
              className="mr-1 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              onClick={(e) => item.children ? toggleNode(item.id, e) : undefined}
            >
              {item.children ? (
                isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
              ) : (
                <span className="w-[14px] inline-block"></span>
              )}
            </span>

            {item.type === 'root' && <User size={14} className="mr-2 text-indigo-500" />}
            {item.type === 'author' && <User size={14} className="mr-2 text-slate-400" />}
            {item.type === 'book' && <Book size={14} className="mr-2 text-slate-400" />}

            <span className="truncate">{item.label}</span>
          </div>

          {item.children && isExpanded && (
            <div>{renderTree(item.children, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden font-sans">

      {/* Context Menu Popup */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-white border border-slate-200 shadow-xl rounded-md py-1 w-32"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 text-slate-700 flex items-center"
            onClick={() => startRename(contextMenu.projectId, projects.find(p => p.id === contextMenu.projectId)?.name || '')}
          >
            <Edit2 size={12} className="mr-2" /> Rename
          </button>
          <button
            className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 text-red-600 flex items-center"
            onClick={() => { setDeletingProjectId(contextMenu.projectId); setContextMenu(null); }}
          >
            <Trash2 size={12} className="mr-2" /> Delete
          </button>
        </div>
      )}

      {/* Left Sidebar: Projects */}
      <aside className="w-64 flex-shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col z-20 shadow-sm">
        <div className="h-16 flex items-center px-4 border-b border-slate-200 bg-white gap-3">
          <div className="text-slate-900">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 6 L12 3 H18 V18 L13 21 H7 V6" />
            </svg>
          </div>
          <h1 className="font-bold text-xl tracking-tight text-slate-900">
            410pages
          </h1>
        </div>

        <div
          className="flex-1 overflow-y-auto p-3"
          onDragLeave={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            if (
              e.clientX < rect.left ||
              e.clientX >= rect.right ||
              e.clientY < rect.top ||
              e.clientY >= rect.bottom
            ) {
              setDragOverProjectId(null);
            }
          }}
        >
          <div
            className={`
              flex items-center p-2 rounded-md cursor-pointer mb-1 text-sm font-medium
              ${selectedProjectId === null ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}
            `}
            onClick={() => onProjectSelect(null)}
          >
            <FolderOpen size={16} className="mr-2" />
            All Citations
          </div>

          <div className="mt-4 mb-2 px-2 flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>Folders</span>
            <button
              onClick={() => { setIsManageMode(!isManageMode); setDeletingProjectId(null); }}
              className={`p-1 rounded transition-colors ${isManageMode ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-200 text-slate-400'}`}
              title="Manage Folders"
            >
              <Settings size={14} />
            </button>
          </div>

          {projects.map((project, index) => {
            if (deletingProjectId === project.id) {
              return (
                <div key={project.id} className="p-3 mb-1 text-sm bg-red-50 border border-red-200 rounded-md shadow-inner">
                  <div className="text-red-800 text-xs mb-3 font-semibold text-center leading-tight">정말로 제거하시겠습니까?</div>
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => setDeletingProjectId(null)}
                      className="px-3 py-1 text-xs text-slate-600 bg-white border border-slate-300 rounded shadow-sm hover:bg-slate-50"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => { onDeleteProject(project.id); setDeletingProjectId(null); }}
                      className="px-3 py-1 text-xs text-white bg-red-600 border border-red-700 rounded shadow-sm hover:bg-red-700"
                    >
                      제거
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={project.id}
                className={`
                  group flex items-center p-2 rounded-md cursor-pointer mb-1 text-sm relative
                  transition-all duration-200 border
                  ${dragOverProjectId === project.id ? 'bg-indigo-100 border-indigo-300 scale-[1.02] shadow-md z-10' : ''}
                  ${selectedProjectId === project.id && dragOverProjectId !== project.id ? 'bg-white shadow-sm border-slate-200 text-indigo-700' : 'border-transparent text-slate-600 hover:bg-slate-200'}
                `}
                onClick={() => !isManageMode && onProjectSelect(project.id)}
                onContextMenu={(e) => handleContextMenu(e, project.id)}
                draggable={!editingProjectId}
                onDragStart={(e) => handleProjectDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, project.id)}
                onDrop={(e) => {
                  setDragOverProjectId(null);
                  // Determine drop type
                  if (e.dataTransfer.types.includes('project_sort_index'.toLowerCase())) {
                    handleProjectDropSort(e, index);
                  } else {
                    handleDropOnProject(e, project.id);
                  }
                }}
              >
                {editingProjectId === project.id ? (
                  <div className="flex items-center w-full" onClick={(e) => e.stopPropagation()}>
                    <input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && submitRename()}
                      className="w-full text-sm border border-indigo-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                    <button onClick={submitRename} className="ml-1 text-emerald-600"><Check size={14} /></button>
                  </div>
                ) : (
                  <>
                    {isManageMode ? (
                      <GripVertical size={14} className="mr-2 text-slate-300 cursor-grab" />
                    ) : (
                      <Folder size={16} className={`mr-2 flex-shrink-0 ${selectedProjectId === project.id ? 'fill-indigo-100 text-indigo-500' : 'text-slate-400'}`} />
                    )}

                    <span className="truncate flex-1">{project.name}</span>

                    {isManageMode ? (
                      <div className="flex items-center ml-2 space-x-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); startRename(project.id, project.name); }}
                          className="p-1 hover:bg-slate-300 rounded text-slate-500"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeletingProjectId(project.id); }}
                          className="p-1 hover:bg-red-100 rounded text-red-500"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ) : (
                      <span className="ml-auto text-xs bg-slate-100 text-slate-400 py-0.5 px-1.5 rounded-full group-hover:hidden">
                        {project.citationIds.length}
                      </span>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {/* New Project Creator */}
          {isCreating ? (
            <div className="mt-2 flex items-center p-2 bg-white rounded-md border border-indigo-300 shadow-sm">
              <input
                autoFocus
                placeholder="Project Name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitCreate();
                  if (e.key === 'Escape') setIsCreating(false);
                }}
                className="w-full text-sm border-none p-0 focus:ring-0 placeholder:text-slate-400"
              />
              <button onClick={submitCreate} className="ml-2 text-indigo-600 hover:bg-indigo-50 rounded p-1"><Check size={14} /></button>
              <button onClick={() => setIsCreating(false)} className="ml-1 text-slate-400 hover:bg-slate-100 rounded p-1"><X size={14} /></button>
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full mt-2 flex items-center p-2 text-sm text-slate-500 hover:text-indigo-600 bg-white hover:bg-slate-50 rounded-md border border-slate-200 shadow-sm transition-all"
            >
              <Plus size={16} className="mr-2" />
              New Project
            </button>
          )}
        </div>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 mt-auto">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs mr-3 border border-indigo-200 flex-shrink-0">
              {username.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              {isEditingUsername ? (
                <div className="flex items-center">
                  <input
                    autoFocus
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitUsername()}
                    onBlur={() => setIsEditingUsername(false)}
                    className="w-full text-xs border border-indigo-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                </div>
              ) : (
                <div className="flex items-center group/user cursor-pointer" onClick={() => { setIsEditingUsername(true); setNewUsername(username); }}>
                  <p className="text-sm font-medium text-slate-700 truncate">{username}</p>
                  <Edit2 size={10} className="ml-1.5 text-slate-300 opacity-0 group-hover/user:opacity-100 transition-opacity" />
                </div>
              )}
              <p className="text-[10px] text-slate-400 truncate">Synced</p>
            </div>
            <button
              onClick={onSignOut}
              className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-200 transition-colors ml-2"
              title="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Center: Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {children}
      </main>

      {/* Right Sidebar: Library */}
      <aside className="w-80 border-l border-slate-200 bg-white flex flex-col h-full sticky top-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">Library</span>
          </div>
          {!isSearchExpanded ? (
            <button
              onClick={() => setIsSearchExpanded(true)}
              className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 transition-colors"
              title="Search Library"
            >
              <Search size={16} />
            </button>
          ) : (
            <div className="flex items-center w-full bg-slate-100 rounded-md px-2 py-1.5 animate-in slide-in-from-right-4 duration-300">
              <Search size={14} className="text-slate-400 mr-2 flex-shrink-0" />
              <input
                autoFocus
                className="bg-transparent border-none p-0 text-sm focus:ring-0 w-full placeholder:text-slate-400"
                placeholder="Search everything..."
                value={searchTerm}
                onChange={(e) => onSearch?.(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && (setIsSearchExpanded(false), onSearch?.(''))}
              />
              <button
                onClick={() => { setIsSearchExpanded(false); onSearch?.(''); }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-2 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Authors & Books
          </div>
          {renderTree(treeData)}
        </div>

        <div className="p-4 bg-slate-100 text-xs text-slate-500 border-t border-slate-200">
          <p>Drag or Click an Author/Book to auto-fill metadata.</p>
        </div>
      </aside >
    </div >
  );
};