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
        <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm mb-2 h-14 flex items-center">
            <div className="w-full flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200/60 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200 transition-all">
                <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-3 pl-1">
                        <button
                            onClick={() => onSelectAll(selectedCount < totalCount)}
                            className="flex items-center text-slate-400 hover:text-indigo-600 transition-colors"
                            title="Select All"
                        >
                            {selectedCount > 0 && selectedCount === totalCount ? (
                                <CheckSquare size={18} className="text-indigo-600" />
                            ) : (
                                <Square size={18} />
                            )}
                        </button>
                        <div className="h-4 w-[1px] bg-slate-300 mx-1"></div>
                        <span className="text-sm font-bold text-indigo-600">
                            {selectedCount} Selected
                        </span>
                    </div>

                    <div className="flex items-center gap-1 pr-1">
                        {/* Folder Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setShowFolderMenu(!showFolderMenu)}
                                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-full transition-all"
                                title="Move to Folder"
                            >
                                <Folder size={18} />
                            </button>

                            {showFolderMenu && (
                                <div className="absolute top-full right-0 mt-1 w-56 bg-white text-slate-800 border border-slate-200 rounded-xl shadow-2xl z-[110] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                    <div className="p-2 border-b border-slate-100 bg-slate-50">
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
                                                    className="flex-1 text-xs px-2 py-1.5 border border-indigo-200 rounded-md focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none"
                                                />
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setIsCreatingFolder(true)}
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
                                                onClick={() => {
                                                    onAddToProject(p.id);
                                                    setShowFolderMenu(false);
                                                }}
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
                            onClick={onCopy}
                            className={`p-2 rounded-full transition-all ${isCopying ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-50'}`}
                            title="Copy to Clipboard"
                        >
                            {isCopying ? <Check size={18} /> : <Copy size={18} />}
                        </button>

                        <button
                            onClick={onDeleteRequest}
                            className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                            title="Delete Selected"
                        >
                            <Trash2 size={18} />
                        </button>

                        <div className="h-4 w-[1px] bg-slate-200 mx-1"></div>

                        <button
                            onClick={onCancel}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
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
