import React from 'react';
import { Trash2 } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'primary';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Delete',
    cancelText = 'Cancel',
    type = 'danger'
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onCancel}
            ></div>
            <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 fade-in duration-200">
                <div className="p-6 pt-8 text-center">
                    <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${type === 'danger' ? 'bg-red-50 text-red-500 dark:bg-red-900/20' : 'bg-[var(--accent-soft)] text-[var(--accent)]'}`}>
                        {type === 'danger' ? <Trash2 size={24} /> : null}
                    </div>
                    <h3 className="ui-title mb-2">{title}</h3>
                    <div className="ui-body text-[var(--text-muted)]">
                        {message}
                    </div>
                </div>
                <div className="flex border-t border-[var(--border-main)]">
                    <button
                        onClick={onCancel}
                        className="ui-btn flex-1 rounded-none border-0 bg-transparent text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)]"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`ui-btn flex-1 rounded-none border-0 text-white ${
                            type === 'danger'
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-[var(--accent)] hover:bg-[var(--accent-strong)]'
                        }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
