import React from 'react';
import { Citation, Project } from '../types';
import { CitationCard } from './CitationCard';

interface CitationListProps {
    citations: Citation[];
    projects: Project[];
    username: string;
    loading: boolean;
    searchTerm: string;
    selectedIds: Set<string>;
    onToggleSelect: (id: string, selected: boolean) => void;
    onAddNote: (citationId: string, content: string) => void;
    onUpdateNote: (citationId: string, noteId: string, content: string) => void;
    onDeleteNote: (citationId: string, noteId: string) => void;
    onDeleteCitation: (id: string) => void;
    onUpdateCitation: (id: string, data: Partial<Citation>) => void;
}

export const CitationList: React.FC<CitationListProps> = ({
    citations,
    projects,
    username,
    loading,
    searchTerm,
    selectedIds,
    onToggleSelect,
    onAddNote,
    onUpdateNote,
    onDeleteNote,
    onDeleteCitation,
    onUpdateCitation
}) => {
    if (loading) {
        return (
            <div className="text-center py-20 text-[var(--text-muted)]">
                Loading your citations...
            </div>
        );
    }

    if (citations.length === 0) {
        return (
            <div className="text-center py-20 text-[var(--text-muted)] border-2 border-dashed border-[var(--border-main)] rounded-xl">
                <p>{searchTerm ? 'No matches found.' : 'No citations found in this view.'}</p>
                <p className="text-xs mt-2">
                    {searchTerm ? 'Try another keyword.' : 'Drag items from the right or type above.'}
                </p>
            </div>
        );
    }

    return (
        <div className="w-full">
            {citations.map((citation, index) => {
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
                        isSelected={selectedIds.has(citation.id)}
                        onToggleSelect={onToggleSelect}
                        onAddNote={onAddNote}
                        onUpdateNote={onUpdateNote}
                        onDeleteNote={onDeleteNote}
                        onDelete={onDeleteCitation}
                        onUpdate={onUpdateCitation}
                    />
                );
            })}
        </div>
    );
};
