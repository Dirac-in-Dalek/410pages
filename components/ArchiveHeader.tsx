import React from 'react';
import { CitationEditor } from './CitationEditor';
import { Citation } from '../types';

interface ArchiveHeaderProps {
    title: string;
    showEditor: boolean;
    username: string;
    editorPrefill?: { author: string, book: string };
    onAddCitation: (data: Omit<Citation, 'id' | 'createdAt' | 'notes'>) => void;
}

export const ArchiveHeader: React.FC<ArchiveHeaderProps> = ({
    title,
    showEditor,
    username,
    editorPrefill,
    onAddCitation
}) => {
    return (
        <div className="pt-6 md:pt-10 pb-0">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="font-serif text-2xl md:text-3xl text-[var(--text-main)] mb-4 md:mb-6 truncate">
                    {title}
                </h2>
                {showEditor && (
                    <div className="mb-4">
                        <CitationEditor
                            onAddCitation={onAddCitation}
                            prefillData={editorPrefill}
                            username={username}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
