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
                    <div className={`mx-auto w-12 h-12 ${type === 'danger' ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : 'bg-[var(--accent-soft)] text-[var(--accent)]'} rounded-full flex items-center justify-center mb-4`}>
                        {type === 'danger' ? <Trash2 size={24} /> : null}
                    </div>
                    <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">{title}</h3>
                    <div className="text-sm text-[var(--text-muted)]">
                        {message}
                    </div>
                </div>
                <div className="flex border-t border-[var(--border-main)]">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-4 text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)] transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 px-4 py-4 text-sm font-semibold text-white ${type === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-[var(--accent)] hover:bg-[var(--accent-strong)]'} transition-colors`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
