import React, { useState } from 'react';
import { Folder, CheckSquare, Square, Check, Copy, Trash2, X, Plus } from 'lucide-react';
import { Project } from '../types';

interface BulkActionToolbarProps {
    selectedCount: number;
    totalCount: number;
    projects: Project[];
    isCopying: boolean;
    onSelectAll: (select: boolean) => void;
    onCopy: () => void;
    onDeleteRequest: () => void;
    onCancel: () => void;
    onAddToProject: (projectId: string) => void;
    onCreateAndAddToProject: (name: string) => void;
}

export const BulkActionToolbar: React.FC<BulkActionToolbarProps> = ({
    selectedCount,
    totalCount,
    projects,
    isCopying,
    onSelectAll,
    onCopy,
    onDeleteRequest,
    onCancel,
    onAddToProject,
    onCreateAndAddToProject
}) => {
    const [showFolderMenu, setShowFolderMenu] = useState(false);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    if (selectedCount === 0) return null;

    return (
        <div className="sticky top-0 z-20 bg-[var(--bg-main)]/95 backdrop-blur-sm mb-2 h-14 flex items-center">
            <div className="w-full flex items-center justify-between bg-[var(--bg-card)] p-2 rounded-lg border border-[var(--border-main)] shadow-sm animate-in fade-in slide-in-from-top-1 duration-200 transition-all">
                <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3 pl-1">
                        <button
                            onClick={() => onSelectAll(selectedCount < totalCount)}
                            className="flex items-center text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                            title="Select All"
                        >
                            {selectedCount > 0 && selectedCount === totalCount ? (
                                <CheckSquare size={18} className="text-[var(--accent)]" />
                            ) : (
                                <Square size={18} />
                            )}
                        </button>
                        <div className="h-4 w-[1px] bg-[var(--border-main)] mx-1"></div>
                        <span className="text-xs sm:text-sm font-bold text-[var(--accent)]">
                            {selectedCount} Selected
                        </span>
                    </div>

                    <div className="flex items-center gap-0.5 sm:gap-1 pr-1">
                        {/* Folder Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setShowFolderMenu(!showFolderMenu)}
                                className="p-2 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--sidebar-hover)] rounded-full transition-all"
                                title="Move to Folder"
                            >
                                <Folder size={18} />
                            </button>

                            {showFolderMenu && (
                                <div className="absolute top-full right-0 mt-1 w-56 bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-main)] rounded-xl shadow-2xl z-[110] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                    <div className="p-2 border-b border-[var(--border-main)] bg-[var(--bg-sidebar)]">
                                        {isCreatingFolder ? (
                                            <div className="flex items-center gap-1">
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    placeholder="Folder Name..."
                                                    value={newFolderName}
                                                    onChange={(e) => setNewFolderName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && newFolderName.trim()) {
                                                            onCreateAndAddToProject(newFolderName);
                                                            setIsCreatingFolder(false);
                                                            setShowFolderMenu(false);
                                                            setNewFolderName('');
                                                        }
                                                        if (e.key === 'Escape') setIsCreatingFolder(false);
                                                    }}
                                                    className="flex-1 text-xs px-2 py-1.5 border border-[var(--accent-border)] rounded-md focus:ring-2 focus:ring-[var(--accent-ring)] focus:border-[var(--accent-border)] outline-none"
                                                />
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setIsCreatingFolder(true)}
                                                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-[var(--accent)] hover:bg-[var(--accent-soft)] rounded-md transition-colors font-bold"
                                            >
                                                <Plus size={14} /> New Folder
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-56 overflow-y-auto py-1">
                                        {projects.length === 0 && <div className="px-4 py-3 text-xs text-[var(--text-muted)] text-center">No existing folders</div>}
                                        {projects.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => {
                                                    onAddToProject(p.id);
                                                    setShowFolderMenu(false);
                                                }}
                                                className="w-full text-left px-4 py-2.5 text-xs text-[var(--text-main)] hover:bg-[var(--sidebar-hover)] flex items-center gap-2 transition-colors"
                                            >
                                                <Folder size={14} className="text-[var(--text-muted)]" />
                                                <span className="truncate">{p.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={onCopy}
                            className={`p-2 rounded-full transition-all ${isCopying ? 'text-emerald-600 bg-emerald-50' : 'text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--sidebar-hover)]'}`}
                            title="Copy to Clipboard"
                        >
                            {isCopying ? <Check size={18} /> : <Copy size={18} />}
                        </button>

                        <button
                            onClick={onDeleteRequest}
                            className="p-2 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                            title="Delete Selected"
                        >
                            <Trash2 size={18} />
                        </button>

                        <div className="h-4 w-[1px] bg-[var(--sidebar-hover)] mx-0.5 sm:mx-1"></div>

                        <button
                            onClick={onCancel}
                            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--sidebar-hover)] rounded-full transition-colors"
                            title="Cancel Selection"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
