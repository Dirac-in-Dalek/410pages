import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, Copy, MessageSquare, ChevronDown, ChevronUp, User, X, Check, Folder, RefreshCw } from 'lucide-react';
import { Highlight } from '../../../types';
import { formatCitationRecoveryText, writeTextToClipboard } from '../../../lib/citationCopy';
import { CITATION_SAVE_FAILED_MESSAGE } from '../logic/optimisticCitation';
import type { CitationCardProps } from '../contract/citationCardContract';

export const CitationCard: React.FC<CitationCardProps> = ({
  citation,
  username,
  selectedFilter = null,
  projectNames = [],
  isTextExpanded,
  onTextExpandedChange,
  onTextOverflowChange,
  isSelected,
  onToggleSelect,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onUpdate,
  onRetrySave
}) => {
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [recoveryCopied, setRecoveryCopied] = useState(false);

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(citation.text);
  const [editAuthor, setEditAuthor] = useState(citation.author);
  const [editBook, setEditBook] = useState(citation.book);
  const [editPage, setEditPage] = useState(citation.page?.toString() || '');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [collapsedTextEnd, setCollapsedTextEnd] = useState<number | null>(null);

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
  const isSaveFailed = citation.saveStatus === 'failed';
  const isSavingCitation = citation.saveStatus === 'saving';
  const isUnsaved = isSaveFailed || isSavingCitation;
  const effectiveIsExpanded = isTextExpanded ?? isExpanded;
  const quoteId = `citation-text-${citation.id}`;

  const toggleTextExpansion = () => {
    const nextExpanded = !effectiveIsExpanded;
    onTextExpandedChange?.(citation.id, nextExpanded);
    if (isTextExpanded === undefined) {
      setIsExpanded(nextExpanded);
    }
  };

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
    if (isTextExpanded !== undefined) return;
    setIsExpanded(false);
    setCollapsedTextEnd(null);
  }, [citation.id, citation.text, isTextExpanded]);

  useEffect(() => {
    if (isEditing) {
      setIsOverflowing(false);
      return;
    }

    const quote = quoteRef.current;
    if (!quote) return;

    const getCollapsedQuoteHeight = () => {
      if (!effectiveIsExpanded) {
        return quote.clientHeight;
      }

      const styles = window.getComputedStyle(quote);
      const fontSize = Number.parseFloat(styles.fontSize) || 16;
      const lineHeight = Number.parseFloat(styles.lineHeight) || fontSize * 1.55;
      const clampedLines = window.matchMedia?.('(min-width: 1024px)').matches ? 3 : 2;
      return lineHeight * clampedLines;
    };

    const checkOverflow = () => {
      const collapsedHeight = getCollapsedQuoteHeight();
      const measure = document.createElement('div');
      measure.dataset.testid = 'citation-text';
      const styles = window.getComputedStyle(quote);
      Object.assign(measure.style, {
        position: 'absolute',
        visibility: 'hidden',
        pointerEvents: 'none',
        zIndex: '-1',
        top: '-9999px',
        left: '-9999px',
        width: `${quote.clientWidth}px`,
        boxSizing: 'border-box',
        whiteSpace: 'pre-wrap',
        overflowWrap: styles.overflowWrap,
        wordBreak: styles.wordBreak,
        fontFamily: styles.fontFamily,
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight,
        letterSpacing: styles.letterSpacing,
        lineHeight: styles.lineHeight,
      });
      document.body.appendChild(measure);

      measure.textContent = citation.text;
      const fullHeight = measure.scrollHeight;
      const nextIsOverflowing = fullHeight - collapsedHeight > 1;
      setIsOverflowing(nextIsOverflowing);
      onTextOverflowChange?.(citation.id, nextIsOverflowing);

      if (!nextIsOverflowing || effectiveIsExpanded) {
        setCollapsedTextEnd(null);
        measure.remove();
        return;
      }

      let low = 0;
      let high = citation.text.length;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        measure.textContent = `${citation.text.slice(0, mid).trimEnd()}...More`;
        if (measure.scrollHeight <= collapsedHeight + 1) {
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      setCollapsedTextEnd(Math.max(0, high));
      measure.remove();
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(checkOverflow) : null;
    resizeObserver?.observe(quote);
    return () => {
      window.removeEventListener('resize', checkOverflow);
      resizeObserver?.disconnect();
    };
  }, [citation.id, citation.text, effectiveIsExpanded, isEditing, localHighlights, onTextOverflowChange]);

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
    if (isUnsaved) return;
    if (!newNote.trim()) return;
    onAddNote(citation.id, newNote);
    setNewNote('');
    setIsNotesExpanded(true);
  };

  const handleCancelNewNote = () => {
    setNewNote('');
    if (!isEditing) {
      setIsNotesExpanded(false);
    }
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
    if (trimmedNote && !isUnsaved) {
      await Promise.resolve(onAddNote(citation.id, trimmedNote));
    }

    closeEditingSession();
  };

  const openEditor = () => {
    if (isSavingCitation) return;
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
    if (isSavingCitation) return;

    const target = event.target as HTMLElement;
    if (target.closest('button, input, textarea, select, option, label, a')) {
      return;
    }

    window.getSelection()?.removeAllRanges();
    openEditor();
  };

  const handleCopyRecoveryText = async () => {
    try {
      await writeTextToClipboard(formatCitationRecoveryText(citation, username));
      setRecoveryCopied(true);
      window.setTimeout(() => setRecoveryCopied(false), 1600);
    } catch (error) {
      console.error('Failed to copy failed citation:', error);
    }
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

  const renderHighlightedText = (endIndex = citation.text.length) => {
    const boundedEndIndex = Math.max(0, Math.min(endIndex, citation.text.length));

    if (!localHighlights || localHighlights.length === 0) {
      return citation.text.slice(0, boundedEndIndex);
    }

    const sorted = [...localHighlights].sort((a, b) => a.start - b.start);
    const segments: React.ReactNode[] = [];
    let lastIndex = 0;

    sorted.forEach((hl) => {
      if (hl.start >= boundedEndIndex) return;

      if (hl.start > lastIndex) {
        segments.push(citation.text.slice(lastIndex, Math.min(hl.start, boundedEndIndex)));
      }
      const highlightEnd = Math.min(hl.end, boundedEndIndex);
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
          {citation.text.slice(hl.start, highlightEnd)}
        </mark>
      );
      lastIndex = highlightEnd;
    });

    if (lastIndex < boundedEndIndex) {
      segments.push(citation.text.slice(lastIndex, boundedEndIndex));
    }

    return segments;
  };

  const metadataChips = [
    !shouldHideAuthor && (isSelf ? (
      <span
        key="author"
        className="inline-flex items-center rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2 py-0.5 text-[0.84rem] text-[var(--accent-strong)]"
      >
        <User size={10} className="mr-1" />
        {username}
      </span>
    ) : (
      <span
        key="author"
        className="inline-flex items-center rounded-full border border-[var(--border-main)] bg-[var(--sidebar-active)] px-2 py-0.5 text-[0.84rem] text-[var(--accent-strong)] dark:text-[var(--accent)]"
      >
        {citation.author}
      </span>
    )),
    !shouldHideBook && citation.book ? (
      <span
        key="book"
        className="inline-flex items-center rounded-full border border-[var(--border-main)] bg-[var(--bg-sidebar)] px-2 py-0.5 text-[0.84rem] text-[var(--text-muted)]"
      >
        {citation.book}
      </span>
    ) : null,
    citation.page ? (
      <span
        key="page"
        className="inline-flex items-center rounded-full border border-[var(--border-main)] bg-[var(--bg-input)] px-2 py-0.5 font-mono text-[0.82rem] text-[var(--text-muted)]"
      >
        p.{citation.page}
      </span>
    ) : null,
  ].filter(Boolean);

  const projectChips = projectNames.map((name) => (
    <span
      key={name}
      className="inline-flex items-center rounded-full border border-[var(--border-main)] bg-[var(--sidebar-active)] px-2 py-0.5 text-[0.84rem] text-[var(--text-secondary)]"
    >
      <Folder size={10} className="mr-1 opacity-80" />
      {name}
    </span>
  ));
  const hasProjectChips = projectChips.length > 0;

  const notesButtonLabel = `Notes ${citation.notes.length}`;
  const shouldShowInlineMore = isOverflowing && !effectiveIsExpanded && collapsedTextEnd !== null;

  return (
    <div
      ref={cardRef}
      onDoubleClick={handleCardDoubleClick}
      className={`
        group relative mb-2.5 flex items-start gap-1.5 rounded-[0.75rem] border transition-all duration-200
        ${isSelected ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] shadow-[var(--shadow-card)]' : 'bg-[var(--bg-card)] border-[var(--border-main)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]'}
        ${isEditing ? 'cursor-default ring-2 ring-[var(--accent-ring)] border-transparent shadow-[var(--shadow-card-hover)] bg-[var(--bg-card)]' : ''}
        ${isSelf && !isSelected ? 'border-[var(--accent-border)]/60' : ''}
      `}
    >
      {!isEditing && (
        <div className="pl-2.5 pt-3.5">
          <input
            type="checkbox"
            checked={isSelected}
            disabled={isSavingCitation}
            onChange={(event) => onToggleSelect(citation.id, event.target.checked)}
            className={`w-4 h-4 rounded border-[var(--border-main)] text-[var(--accent)] focus:ring-[var(--accent-ring)] ${
              isSavingCitation ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
            }`}
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="p-2.5 md:p-3">
          {isEditing ? (
            <div className="space-y-3">
              <textarea
                ref={editTextareaRef}
                autoFocus
                value={editText}
                onChange={(event) => setEditText(event.target.value)}
                className="type-body min-h-[84px] w-full resize-none overflow-y-auto rounded-md border border-[var(--border-main)] bg-[var(--bg-input)] p-2 text-[var(--text-main)] focus:border-[var(--accent-border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
                style={{ height: 'auto' }}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="type-muted ml-1 mb-1 block text-[0.72rem] font-bold uppercase text-[var(--text-muted)]">Author</label>
                  <input
                    type="text"
                    value={editAuthor}
                    onChange={(event) => setEditAuthor(event.target.value)}
                    placeholder="Self"
                    className="type-label-bounded w-full rounded-md border border-[var(--border-main)] bg-[var(--bg-input)] p-2 text-[var(--text-main)] focus:border-[var(--accent-border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
                  />
                </div>
                <div className="col-span-1">
                  <label className="type-muted ml-1 mb-1 block text-[0.72rem] font-bold uppercase text-[var(--text-muted)]">Source</label>
                  <input
                    type="text"
                    value={editBook}
                    onChange={(event) => setEditBook(event.target.value)}
                    className="type-label-bounded w-full rounded-md border border-[var(--border-main)] bg-[var(--bg-input)] p-2 text-[var(--text-main)] focus:border-[var(--accent-border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
                  />
                </div>
                <div className="col-span-1">
                  <label className="type-muted ml-1 mb-1 block text-[0.72rem] font-bold uppercase text-[var(--text-muted)]">Page</label>
                  <input
                    type="text"
                    value={editPage}
                    onChange={(event) => setEditPage(event.target.value)}
                    className="type-label-bounded w-full rounded-md border border-[var(--border-main)] bg-[var(--bg-input)] p-2 text-[var(--text-main)] focus:border-[var(--accent-border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <blockquote
                id={quoteId}
                ref={quoteRef}
                data-testid="citation-text"
                className={[
                  'citation-copy type-body relative z-10 select-text whitespace-pre-wrap text-[var(--text-main)] leading-[1.55]',
                  effectiveIsExpanded || shouldShowInlineMore ? 'mb-1.5' : 'mb-1.5 line-clamp-2 lg:line-clamp-3'
                ].join(' ')}
                onMouseUp={handleTextSelection}
              >
                {renderHighlightedText(shouldShowInlineMore ? collapsedTextEnd : undefined)}
                {shouldShowInlineMore ? (
                  <button
                    type="button"
                    onClick={toggleTextExpansion}
                    className="type-label-bounded ml-0.5 inline text-[0.82rem] text-[var(--accent)] underline-offset-2 transition-colors hover:text-[var(--accent-strong)] hover:underline active:scale-95"
                    aria-label="More"
                    aria-controls={quoteId}
                    aria-expanded={false}
                  >
                    ...More
                  </button>
                ) : null}
              </blockquote>

              {isOverflowing && effectiveIsExpanded ? (
                <button
                  type="button"
                  onClick={toggleTextExpansion}
                  className="type-label-bounded mb-2 text-[0.82rem] text-[var(--text-muted)] underline-offset-2 hover:text-[var(--text-main)] hover:underline"
                  aria-label="Less"
                  aria-controls={quoteId}
                  aria-expanded={true}
                >
                  Less
                </button>
              ) : null}

              <div className="mt-2 border-t border-[var(--border-main)]/70 pt-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {metadataChips}

                  <button
                    onClick={() => {
                      if (isUnsaved) return;
                      setIsNotesExpanded(!isNotesExpanded);
                    }}
                    disabled={isUnsaved}
                    className={`
                      ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.84rem] transition-colors active:scale-95
                      ${isUnsaved
                        ? 'cursor-not-allowed border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-muted)] opacity-60'
                        : citation.notes.length > 0
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
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {projectChips}
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>

        {isNotesExpanded && (
          <div className="rounded-b-[0.75rem] border-t border-[var(--border-main)] bg-[var(--bg-sidebar)]/30 p-2.5">
            {!isUnsaved ? (
              <>
                <div className={`${citation.notes.length > 0 ? 'mb-2.5 space-y-2' : ''}`}>
                  {citation.notes.map((note) => (
                    <div
                      key={note.id}
                      className={`
                      group/note relative type-note text-[var(--text-main)] bg-[var(--bg-card)] rounded border transition-all overflow-hidden
                      ${editingNoteId === note.id ? 'border-[var(--accent-border)] shadow-md ring-1 ring-[var(--accent-ring)]' : 'p-1.5 border-[var(--border-main)] hover:border-[var(--accent-border)] cursor-pointer'}
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
                            className="type-note min-h-[70px] w-full resize-none overflow-y-auto border-none bg-transparent p-2.5 text-[var(--text-main)] focus:outline-none focus:ring-0"
                          />
                          <div className="flex justify-end gap-2.5 border-t border-[var(--border-main)] bg-[var(--bg-sidebar)]/50 p-1.5">
                            <button
                              onClick={(event) => { event.stopPropagation(); setEditingNoteId(null); }}
                              className="type-label-bounded text-[0.82rem] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={(event) => { event.stopPropagation(); handleSaveNoteEdit(note.id); }}
                              className="type-label-bounded text-[0.82rem] font-bold text-[var(--accent)] hover:text-[var(--accent-strong)]"
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

                <div className="rounded-[0.9rem] border border-[var(--border-main)] bg-[var(--bg-card)] shadow-sm transition-all focus-within:border-[var(--accent-border)] focus-within:ring-1 focus-within:ring-[var(--accent-ring)]">
                  <textarea
                    ref={newNoteTextareaRef}
                    value={newNote}
                    onChange={(event) => setNewNote(event.target.value)}
                    placeholder="Add a new note..."
                    className="type-note min-h-[52px] w-full resize-none overflow-y-auto border-none bg-transparent p-2.5 text-[var(--text-main)] focus:outline-none focus:ring-0"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        submitNote();
                      }
                    }}
                  />
                  {!isEditing ? (
                    <div className="flex items-center justify-end gap-1.5 border-t border-[var(--border-main)]/80 bg-[var(--bg-sidebar)]/45 px-2 py-1.5">
                      <button
                        type="button"
                        onClick={handleCancelNewNote}
                        className="type-label-bounded inline-flex items-center gap-1 rounded-md px-2.5 py-[0.3125rem] text-[0.82rem] font-medium text-[var(--text-muted)] transition-all hover:bg-[var(--bg-sidebar)] hover:text-[var(--text-main)] active:scale-95"
                      >
                        <X size={14} /> Cancel
                      </button>
                      <button
                        type="button"
                        onClick={submitNote}
                        disabled={!newNote.trim()}
                        className={`type-label-bounded inline-flex items-center gap-1 rounded-md px-2.5 py-[0.3125rem] text-[0.82rem] font-medium shadow-sm transition-all active:scale-95 ${
                          newNote.trim()
                            ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)]'
                            : 'cursor-not-allowed bg-[var(--bg-input)] text-[var(--text-muted)] shadow-none'
                        }`}
                      >
                        <Check size={14} /> Confirm
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}

            {isEditing && (
              <div className="flex justify-end gap-2 pt-3">
                <button
                  onClick={() => void handleCancel()}
                  className="type-label-bounded flex items-center gap-1 rounded-md px-2.5 py-[0.3125rem] text-[0.82rem] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-sidebar)]"
                >
                  <X size={14} /> Cancel
                </button>
                <button
                  onClick={() => void handleSave()}
                  className="type-label-bounded flex items-center gap-1 rounded-md bg-[var(--accent)] px-2.5 py-[0.3125rem] text-[0.82rem] font-medium text-white shadow-sm transition-colors hover:bg-[var(--accent-strong)]"
                >
                  <Check size={14} /> Save
                </button>
              </div>
            )}
          </div>
        )}

        {isSaveFailed ? (
          <div className="mx-2.5 mb-2.5 rounded-[0.65rem] border border-red-200 bg-red-50 px-2.5 py-2 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-1.5 text-[0.82rem] font-medium">
                <AlertCircle size={14} className="shrink-0" />
                <span>{CITATION_SAVE_FAILED_MESSAGE}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void handleCopyRecoveryText()}
                  className="type-label-bounded inline-flex items-center gap-1 rounded-md bg-white/70 px-2 py-1 text-[0.78rem] font-medium text-red-900 shadow-sm transition-transform active:scale-95 dark:bg-white/10 dark:text-red-100"
                >
                  <Copy size={12} />
                  {recoveryCopied ? '복사됨' : '복사'}
                </button>
                <button
                  type="button"
                  onClick={() => void Promise.resolve(onRetrySave(citation.id))}
                  className="type-label-bounded inline-flex items-center gap-1 rounded-md bg-red-700 px-2 py-1 text-[0.78rem] font-semibold text-white shadow-sm transition-transform active:scale-95 dark:bg-red-400 dark:text-red-950"
                >
                  <RefreshCw size={12} />
                  다시 저장하기
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CitationCard;
