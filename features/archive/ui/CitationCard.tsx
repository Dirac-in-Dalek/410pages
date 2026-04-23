import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, ChevronDown, ChevronUp, User, X, Check, Folder } from 'lucide-react';
import { Highlight } from '../../../types';
import type { CitationCardProps } from '../contract/citationCardContract';

export const CitationCard: React.FC<CitationCardProps> = ({
  citation,
  username,
  selectedFilter = null,
  projectNames = [],
  isSelected,
  onToggleSelect,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onUpdate
}) => {
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const [newNote, setNewNote] = useState('');

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(citation.text);
  const [editAuthor, setEditAuthor] = useState(citation.author);
  const [editBook, setEditBook] = useState(citation.book);
  const [editPage, setEditPage] = useState(citation.page?.toString() || '');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const [localHighlights, setLocalHighlights] = useState<Highlight[]>(citation.highlights || []);
  const cardRef = useRef<HTMLDivElement>(null);
  const quoteRef = useRef<HTMLElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editNoteTextareaRef = useRef<HTMLTextAreaElement>(null);
  const newNoteTextareaRef = useRef<HTMLTextAreaElement>(null);
  const effectiveAuthor = citation.isSelf ? username : citation.author;
  const normalizedAuthorFilter = selectedFilter?.type === 'author' ? selectedFilter.value.trim().toLocaleLowerCase() : null;
  const normalizedBookFilter = selectedFilter?.type === 'book' ? selectedFilter.value.trim().toLocaleLowerCase() : null;
  const normalizedCitationAuthor = effectiveAuthor.trim().toLocaleLowerCase();
  const normalizedCitationBook = citation.book.trim().toLocaleLowerCase();
  const isAuthorScoped = normalizedAuthorFilter !== null && normalizedAuthorFilter === normalizedCitationAuthor;
  const isBookScoped =
    normalizedBookFilter !== null &&
    normalizedBookFilter === normalizedCitationBook &&
    (!selectedFilter?.author || selectedFilter.author.trim().toLocaleLowerCase() === normalizedCitationAuthor);
  const shouldHideAuthor = isAuthorScoped || isBookScoped;
  const shouldHideBook = isBookScoped;

  const adjustHeight = (ref: React.RefObject<HTMLTextAreaElement>) => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      const newHeight = Math.min(ref.current.scrollHeight, 400);
      ref.current.style.height = `${newHeight}px`;
    }
  };

  useEffect(() => {
    if (isEditing) adjustHeight(editTextareaRef);
  }, [isEditing, editText]);

  useEffect(() => {
    if (editingNoteId) adjustHeight(editNoteTextareaRef);
  }, [editingNoteId, editNoteContent]);

  useEffect(() => {
    if (isNotesExpanded) adjustHeight(newNoteTextareaRef);
  }, [isNotesExpanded, newNote]);

  useEffect(() => {
    setLocalHighlights(citation.highlights || []);
  }, [citation.highlights]);

  useEffect(() => {
    setIsExpanded(false);
  }, [citation.id, citation.text]);

  useEffect(() => {
    if (isEditing) {
      setIsOverflowing(false);
      return;
    }

    const quote = quoteRef.current;
    if (!quote) return;

    const checkOverflow = () => {
      if (isExpanded) {
        setIsOverflowing(true);
        return;
      }

      setIsOverflowing(quote.scrollHeight - quote.clientHeight > 1);
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [citation.text, isEditing, isExpanded, localHighlights]);

  const activeNote = editingNoteId ? citation.notes.find((note) => note.id === editingNoteId) : null;
  const isEditSessionPristine =
    editText === citation.text &&
    editAuthor === citation.author &&
    editBook === citation.book &&
    editPage === (citation.page?.toString() || '') &&
    newNote === '' &&
    (!editingNoteId || editNoteContent === (activeNote?.content ?? ''));

  const isSelf = citation.isSelf ?? (citation.author === username || !citation.author || citation.author === 'Self');

  const submitNote = () => {
    if (!newNote.trim()) return;
    onAddNote(citation.id, newNote);
    setNewNote('');
    setIsNotesExpanded(true);
  };

  const handleSaveNoteEdit = (noteId: string) => {
    if (!editNoteContent.trim()) {
      onDeleteNote(citation.id, noteId);
    } else {
      onUpdateNote(citation.id, noteId, editNoteContent);
    }
    setEditingNoteId(null);
  };

  const closeEditingSession = () => {
    setIsEditing(false);
    setIsNotesExpanded(false);
    setEditingNoteId(null);
    setEditNoteContent('');
    setNewNote('');
  };

  const handleSave = async () => {
    if (!editText.trim()) return;

    await Promise.resolve(onUpdate(citation.id, {
      text: editText,
      author: editAuthor,
      book: editBook,
      page: editPage || undefined
    }));

    const trimmedNote = newNote.trim();
    if (trimmedNote) {
      await Promise.resolve(onAddNote(citation.id, trimmedNote));
    }

    closeEditingSession();
  };

  const openEditor = () => {
    setIsEditing(true);
    setIsNotesExpanded(true);
    setEditingNoteId(null);
  };

  const handleCancel = () => {
    setEditText(citation.text);
    setEditAuthor(citation.author);
    setEditBook(citation.book);
    setEditPage(citation.page?.toString() || '');
    closeEditingSession();
  };

  useEffect(() => {
    if (!isEditing) return;

    const handlePointerDownOutside = (event: MouseEvent) => {
      if (!cardRef.current) return;
      if (cardRef.current.contains(event.target as Node)) return;
      if (!isEditSessionPristine) return;

      handleCancel();
    };

    document.addEventListener('mousedown', handlePointerDownOutside);
    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
    };
  }, [handleCancel, isEditSessionPristine, isEditing]);

  const handleCardDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isEditing) return;

    const target = event.target as HTMLElement;
    if (target.closest('button, input, textarea, select, option, label, a')) {
      return;
    }

    window.getSelection()?.removeAllRanges();
    openEditor();
  };

  const handleTextSelection = (event: React.MouseEvent<HTMLElement>) => {
    if (event.detail > 1) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !cardRef.current) return;

    const range = selection.getRangeAt(0);
    const blockquote = cardRef.current.querySelector('blockquote');

    if (!blockquote || !blockquote.contains(range.commonAncestorContainer)) return;

    const selectedText = selection.toString();
    if (!selectedText.trim()) return;

    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(blockquote);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);

    const start = preSelectionRange.toString().length;
    const end = start + selectedText.length;

    const isOverlapping = localHighlights.some((highlight) => start < highlight.end && end > highlight.start);
    if (isOverlapping) {
      selection.removeAllRanges();
      return;
    }

    const newHighlight: Highlight = {
      id: `hl-${Date.now()}`,
      start,
      end,
      color: 'yellow'
    };

    const updatedHighlights = [...localHighlights, newHighlight];
    setLocalHighlights(updatedHighlights);
    onUpdate(citation.id, { highlights: updatedHighlights });

    selection.removeAllRanges();
  };

  const handleRemoveHighlight = (highlightId: string) => {
    const updatedHighlights = localHighlights.filter((highlight) => highlight.id !== highlightId);
    setLocalHighlights(updatedHighlights);
    onUpdate(citation.id, { highlights: updatedHighlights });
  };

  const renderHighlightedText = () => {
    if (!localHighlights || localHighlights.length === 0) {
      return citation.text;
    }

    const sorted = [...localHighlights].sort((a, b) => a.start - b.start);
    const segments: React.ReactNode[] = [];
    let lastIndex = 0;

    sorted.forEach((hl) => {
      if (hl.start > lastIndex) {
        segments.push(citation.text.slice(lastIndex, hl.start));
      }
      segments.push(
        <mark
          key={hl.id}
          className="cursor-pointer relative group/hl rounded px-0.5 transition-colors"
          style={{ backgroundColor: 'var(--highlight-bg)' }}
          onClick={(event) => {
            event.stopPropagation();
            handleRemoveHighlight(hl.id);
          }}
          title="Click to remove highlight"
        >
          {citation.text.slice(hl.start, hl.end)}
        </mark>
      );
      lastIndex = hl.end;
    });

    if (lastIndex < citation.text.length) {
      segments.push(citation.text.slice(lastIndex));
    }

    return segments;
  };

  const metadataChips = [
    !shouldHideAuthor && (isSelf ? (
      <span
        key="author"
        className="inline-flex items-center rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2.5 py-1 text-[var(--accent-strong)]"
      >
        <User size={10} className="mr-1" />
        {username}
      </span>
    ) : (
      <span
        key="author"
        className="inline-flex items-center rounded-full border border-[var(--border-main)] bg-[var(--sidebar-active)] px-2.5 py-1 text-[var(--accent-strong)] dark:text-[var(--accent)]"
      >
        {citation.author}
      </span>
    )),
    !shouldHideBook && citation.book ? (
      <span
        key="book"
        className="inline-flex items-center rounded-full border border-[var(--border-main)] bg-[var(--bg-sidebar)] px-2.5 py-1 text-[var(--text-muted)]"
      >
        {citation.book}
      </span>
    ) : null,
    citation.page ? (
      <span
        key="page"
        className="inline-flex items-center rounded-full border border-[var(--border-main)] bg-[var(--bg-input)] px-2.5 py-1 font-mono text-[var(--text-muted)]"
      >
        p.{citation.page}
      </span>
    ) : null,
  ].filter(Boolean);

  const projectChips = projectNames.map((name) => (
    <span
      key={name}
      className="inline-flex items-center rounded-full border border-[var(--border-main)] bg-[var(--sidebar-active)] px-2.5 py-1 text-[var(--text-secondary)]"
    >
      <Folder size={10} className="mr-1 opacity-80" />
      {name}
    </span>
  ));
  const hasProjectChips = projectChips.length > 0;

  const notesButtonLabel = `Notes ${citation.notes.length}`;

  return (
    <div
      ref={cardRef}
      onDoubleClick={handleCardDoubleClick}
      className={`
        group relative rounded-lg border mb-3 transition-all duration-200 flex items-start gap-2
        ${isSelected ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] shadow-[var(--shadow-card)]' : 'bg-[var(--bg-card)] border-[var(--border-main)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]'}
        ${isEditing ? 'cursor-default ring-2 ring-[var(--accent-ring)] border-transparent shadow-[var(--shadow-card-hover)] bg-[var(--bg-card)]' : ''}
        ${isSelf && !isSelected ? 'border-[var(--accent-border)]/60' : ''}
      `}
    >
      {!isEditing && (
        <div className="pt-6 pl-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(event) => onToggleSelect(citation.id, event.target.checked)}
            className="w-4 h-4 rounded border-[var(--border-main)] text-[var(--accent)] focus:ring-[var(--accent-ring)] cursor-pointer"
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="p-3.5 md:p-4">
          {isEditing ? (
            <div className="space-y-4">
              <textarea
                ref={editTextareaRef}
                autoFocus
                value={editText}
                onChange={(event) => setEditText(event.target.value)}
                className="type-body w-full p-2 bg-[var(--bg-input)] text-[var(--text-main)] border border-[var(--border-main)] rounded-md focus:ring-2 focus:ring-[var(--accent-ring)] focus:border-[var(--accent-border)] min-h-[100px] resize-none overflow-y-auto"
                style={{ height: 'auto' }}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="type-muted uppercase font-bold text-[var(--text-muted)] block mb-1 ml-1">Author</label>
                  <input
                    type="text"
                    value={editAuthor}
                    onChange={(event) => setEditAuthor(event.target.value)}
                    placeholder="Self"
                    className="type-label-bounded w-full p-2 bg-[var(--bg-input)] text-[var(--text-main)] border border-[var(--border-main)] rounded-md focus:border-[var(--accent-border)]"
                  />
                </div>
                <div className="col-span-1">
                  <label className="type-muted uppercase font-bold text-[var(--text-muted)] block mb-1 ml-1">Source</label>
                  <input
                    type="text"
                    value={editBook}
                    onChange={(event) => setEditBook(event.target.value)}
                    className="type-label-bounded w-full p-2 bg-[var(--bg-input)] text-[var(--text-main)] border border-[var(--border-main)] rounded-md focus:border-[var(--accent-border)]"
                  />
                </div>
                <div className="col-span-1">
                  <label className="type-muted uppercase font-bold text-[var(--text-muted)] block mb-1 ml-1">Page</label>
                  <input
                    type="text"
                    value={editPage}
                    onChange={(event) => setEditPage(event.target.value)}
                    className="type-label-bounded w-full p-2 bg-[var(--bg-input)] text-[var(--text-main)] border border-[var(--border-main)] rounded-md focus:border-[var(--accent-border)]"
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <blockquote
                ref={quoteRef}
                data-testid="citation-text"
                className={[
                  'type-body leading-relaxed text-[var(--text-main)] relative z-10 select-text whitespace-pre-wrap',
                  isExpanded ? 'mb-2' : 'mb-2 line-clamp-2 lg:line-clamp-3'
                ].join(' ')}
                onMouseUp={handleTextSelection}
              >
                {renderHighlightedText()}
              </blockquote>

              {isOverflowing && (
                <button
                  type="button"
                  onClick={() => setIsExpanded((prev) => !prev)}
                  className="type-label-bounded mb-3 text-[var(--text-muted)] underline-offset-2 hover:text-[var(--text-main)] hover:underline"
                  aria-label={isExpanded ? 'Less' : 'More'}
                >
                  {isExpanded ? 'Less' : 'More'}
                </button>
              )}

              <div className="mt-3 border-t border-[var(--border-main)]/70 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  {metadataChips}

                  <button
                    onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                    className={`
                      ml-auto inline-flex items-center gap-1 rounded-full border px-2.5 py-1 transition-colors
                      ${citation.notes.length > 0
                        ? 'border-[var(--border-main)] bg-[var(--sidebar-active)] text-[var(--accent)] shadow-sm'
                        : 'border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-main)]'}
                    `}
                    aria-label={notesButtonLabel}
                  >
                    <MessageSquare size={12} />
                    <span className="font-medium">{citation.notes.length}</span>
                    {isNotesExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>

                {hasProjectChips ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {projectChips}
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>

        {isNotesExpanded && (
          <div className="border-t border-[var(--border-main)] bg-[var(--bg-sidebar)]/30 rounded-b-lg p-3.5">
            <div className={`${citation.notes.length > 0 ? 'space-y-2.5 mb-3' : ''}`}>
              {citation.notes.map((note) => (
                <div
                  key={note.id}
                  className={`
                  group/note relative type-body text-[var(--text-main)] bg-[var(--bg-card)] rounded border transition-all overflow-hidden
                  ${editingNoteId === note.id ? 'border-[var(--accent-border)] shadow-md ring-1 ring-[var(--accent-ring)]' : 'p-2 border-[var(--border-main)] hover:border-[var(--accent-border)] cursor-pointer'}
                `}
                  onClick={() => {
                    if (editingNoteId !== note.id) {
                      setEditingNoteId(note.id);
                      setEditNoteContent(note.content);
                    }
                  }}
                >
                  {editingNoteId === note.id ? (
                    <div className="flex flex-col">
                      <textarea
                        ref={editNoteTextareaRef}
                        autoFocus
                        value={editNoteContent}
                        onChange={(event) => setEditNoteContent(event.target.value)}
                        className="type-body w-full bg-transparent text-[var(--text-main)] border-none p-3 focus:ring-0 focus:outline-none min-h-[80px] resize-none overflow-y-auto"
                      />
                      <div className="flex justify-end gap-3 p-2 bg-[var(--bg-sidebar)]/50 border-t border-[var(--border-main)]">
                        <button
                          onClick={(event) => { event.stopPropagation(); setEditingNoteId(null); }}
                          className="type-label-bounded text-[var(--text-muted)] hover:text-[var(--text-main)]"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={(event) => { event.stopPropagation(); handleSaveNoteEdit(note.id); }}
                          className="type-label-bounded text-[var(--accent)] font-bold hover:text-[var(--accent-strong)]"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{note.content}</div>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-[var(--bg-card)] rounded-md border border-[var(--border-main)] shadow-sm focus-within:border-[var(--accent-border)] focus-within:ring-1 focus-within:ring-[var(--accent-ring)] transition-all">
              <textarea
                ref={newNoteTextareaRef}
                value={newNote}
                onChange={(event) => setNewNote(event.target.value)}
                placeholder="Add a new note..."
                className="type-body w-full bg-transparent text-[var(--text-main)] border-none p-3 focus:ring-0 focus:outline-none min-h-[60px] resize-none overflow-y-auto"
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    submitNote();
                  }
                }}
              />
            </div>

            {isEditing && (
              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => void handleCancel()}
                  className="type-label-bounded flex items-center gap-1 px-3 py-1.5 font-medium text-[var(--text-muted)] hover:bg-[var(--bg-sidebar)] rounded-md transition-colors"
                >
                  <X size={14} /> Cancel
                </button>
                <button
                  onClick={() => void handleSave()}
                  className="type-label-bounded flex items-center gap-1 px-3 py-1.5 font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent-strong)] rounded-md shadow-sm transition-colors"
                >
                  <Check size={14} /> Save
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CitationCard;
