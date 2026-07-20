import React, { useEffect, useRef, useState } from 'react';
import { Folder, CheckSquare, Square, Check, Copy, Trash2, X, Plus } from 'lucide-react';
import { Project } from '../types';

interface BulkActionToolbarProps {
    selectedCount: number;
    totalCount: number;
    projects: Project[];
    isCopying: boolean;
    onSelectAll: (select: boolean) => void;
    onCopy: (includeNotes: boolean) => void | Promise<void>;
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
    const [showCopyMenu, setShowCopyMenu] = useState(false);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const toolbarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
                setShowFolderMenu(false);
                setShowCopyMenu(false);
                setIsCreatingFolder(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (selectedCount === 0) return null;

    return (
        <div ref={toolbarRef} className="sticky top-0 z-20 mb-2 flex min-h-14 items-center bg-[var(--bg-main)]">
            <div className="w-full rounded-xl bg-[var(--bg-card)] p-1.5 shadow-[var(--shadow-toolbar)] transition-[opacity,transform] duration-200 motion-reduce:transition-none">
                <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3 pl-1">
                        <button
                            onClick={() => onSelectAll(selectedCount < totalCount)}
                            className="flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg text-[var(--text-muted)] transition-[background-color,color,transform] hover:bg-[var(--sidebar-hover)] hover:text-[var(--accent)] active:scale-95 motion-reduce:transition-none"
                            aria-label={selectedCount === totalCount ? '전체 선택 해제' : '전체 선택'}
                        >
                            {selectedCount > 0 && selectedCount === totalCount ? (
                                <CheckSquare size={18} className="text-[var(--accent)]" />
                            ) : (
                                <Square size={18} />
                            )}
                        </button>
                        <div className="h-4 w-[1px] bg-[var(--border-main)] mx-1"></div>
                        <span className="type-label-bounded font-bold text-[var(--accent)]">
                            {selectedCount}개 선택
                        </span>
                    </div>

                    <div className="flex items-center gap-0.5 sm:gap-1 pr-1">
                        {/* Folder Menu */}
                        <div className="relative">
                            <button
                                onClick={() => {
                                    setShowCopyMenu(false);
                                    setShowFolderMenu(!showFolderMenu);
                                }}
                                className="flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg text-[var(--text-muted)] transition-[background-color,color,transform] hover:bg-[var(--sidebar-hover)] hover:text-[var(--accent)] active:scale-95 motion-reduce:transition-none"
                                aria-label="폴더에 추가"
                                aria-expanded={showFolderMenu}
                                aria-haspopup="menu"
                            >
                                <Folder size={18} />
                            </button>

                            {showFolderMenu && (
                                <div role="menu" aria-label="폴더 선택" className="absolute top-full right-0 mt-1 w-56 bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-main)] rounded-xl shadow-[var(--shadow-popover)] z-[110] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right motion-reduce:animate-none">
                                    <div className="p-2 border-b border-[var(--border-main)] bg-[var(--bg-sidebar)]">
                                        {isCreatingFolder ? (
                                            <div className="flex items-center gap-1">
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    placeholder="폴더 이름"
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
                                                    className="type-label-bounded min-h-11 flex-1 rounded-lg border border-[var(--accent-border)] bg-[var(--bg-input)] px-2 outline-none focus:border-[var(--accent-border)] focus:ring-2 focus:ring-[var(--accent-ring)]"
                                                />
                                            </div>
                                        ) : (
                                            <button
                                                role="menuitem"
                                                onClick={() => setIsCreatingFolder(true)}
                                                className="type-label-bounded flex min-h-11 w-full items-center gap-2 rounded-lg px-2 font-bold text-[var(--accent)] transition-[background-color,transform] hover:bg-[var(--accent-soft)] active:scale-95"
                                            >
                                                <Plus size={14} /> 새 폴더
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-56 overflow-y-auto py-1">
                                        {projects.length === 0 && <div className="type-body-muted px-4 py-3 text-center text-[var(--text-muted)]">아직 폴더가 없습니다</div>}
                                        {projects.map(p => (
                                            <button
                                                key={p.id}
                                                role="menuitem"
                                                onClick={() => {
                                                    onAddToProject(p.id);
                                                    setShowFolderMenu(false);
                                                }}
                                                className="type-label-bounded flex min-h-11 w-full items-center gap-2 px-4 text-left text-[var(--text-main)] transition-colors hover:bg-[var(--sidebar-hover)]"
                                            >
                                                <Folder size={14} className="text-[var(--text-muted)]" />
                                                <span className="truncate">{p.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => {
                                    setShowFolderMenu(false);
                                    setShowCopyMenu(!showCopyMenu);
                                }}
                                className={`flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg transition-[background-color,color,transform] active:scale-95 motion-reduce:transition-none ${isCopying ? 'text-emerald-700 bg-emerald-50' : 'text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--sidebar-hover)]'}`}
                                aria-label="클립보드에 복사"
                                aria-expanded={showCopyMenu}
                                aria-haspopup="menu"
                            >
                                {isCopying ? <Check size={18} /> : <Copy size={18} />}
                            </button>

                            {showCopyMenu && (
                                <div role="menu" aria-label="복사 형식" className="absolute top-full right-0 mt-1 w-56 bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-main)] rounded-xl shadow-[var(--shadow-popover)] z-[120] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right motion-reduce:animate-none">
                                    <button
                                        role="menuitem"
                                        onClick={() => {
                                            void onCopy(false);
                                            setShowCopyMenu(false);
                                        }}
                                        className="type-label-bounded min-h-11 w-full px-4 text-left text-[var(--text-main)] transition-colors hover:bg-[var(--sidebar-hover)]"
                                    >
                                        본문 복사
                                    </button>
                                    <button
                                        role="menuitem"
                                        onClick={() => {
                                            void onCopy(true);
                                            setShowCopyMenu(false);
                                        }}
                                        className="type-label-bounded min-h-11 w-full border-t border-[var(--border-main)] px-4 text-left text-[var(--text-main)] transition-colors hover:bg-[var(--sidebar-hover)]"
                                    >
                                        본문과 메모 복사
                                    </button>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={onDeleteRequest}
                            className="flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg text-[var(--text-muted)] transition-[background-color,color,transform] hover:bg-red-50 hover:text-red-600 active:scale-95 motion-reduce:transition-none"
                            aria-label="선택 항목 삭제"
                        >
                            <Trash2 size={18} />
                        </button>

                        <div className="h-4 w-[1px] bg-[var(--sidebar-hover)] mx-0.5 sm:mx-1"></div>

                        <button
                            onClick={onCancel}
                            className="flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg text-[var(--text-muted)] transition-[background-color,color,transform] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-main)] active:scale-95 motion-reduce:transition-none"
                            aria-label="선택 취소"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
