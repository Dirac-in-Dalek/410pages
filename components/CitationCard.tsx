import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, ChevronDown, ChevronUp, Plus, Quote, User, Edit2, Trash2, X, Check, Folder, Copy } from 'lucide-react';
import { Citation, Note, Highlight } from '../types';
import { formatCitationCopyText, writeTextToClipboard } from '../lib/citationCopy';

interface CitationCardProps {
  citation: Citation;
  index: number;
  username: string;
  projectNames?: string[];
  isSelected: boolean;
  onToggleSelect: (id: string, selected: boolean) => void;
  onAddNote: (citationId: string, content: string) => void;
  onUpdateNote: (citationId: string, noteId: string, content: string) => void;
  onDeleteNote: (citationId: string, noteId: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<Citation>) => void;
}

export const CitationCard: React.FC<CitationCardProps> = ({
  citation,
  index,
  username,
  projectNames = [],
  isSelected,
  onToggleSelect,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onDelete,
  onUpdate
}) => {
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const [newNote, setNewNote] = useState('');

  // Note editing state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(citation.text);
  const [editAuthor, setEditAuthor] = useState(citation.author);
  const [editBook, setEditBook] = useState(citation.book);
  const [editPage, setEditPage] = useState(citation.page?.toString() || '');

  // Copy button state
  const [copied, setCopied] = useState(false);
  const [showCopyMenu, setShowCopyMenu] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Highlight state
  const [localHighlights, setLocalHighlights] = useState<Highlight[]>(citation.highlights || []);
  const cardRef = useRef<HTMLDivElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editNoteTextareaRef = useRef<HTMLTextAreaElement>(null);
  const newNoteTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-expand helper
  const adjustHeight = (ref: React.RefObject<HTMLTextAreaElement>) => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      const newHeight = Math.min(ref.current.scrollHeight, 400); // Max height 400px
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

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        window.getSelection()?.removeAllRanges();
        setShowCopyMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const isSelf = citation.isSelf ?? (citation.author === username || !citation.author || citation.author === 'Self');

  // Drag handlers removed

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

  const handleSave = () => {
    if (!editText.trim()) return;
    onUpdate(citation.id, {
      text: editText,
      author: editAuthor,
      book: editBook,
      page: editPage || undefined
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(citation.text);
    setEditAuthor(citation.author);
    setEditBook(citation.book);
    setEditPage(citation.page?.toString() || '');
    setIsEditing(false);
  };

  // Copy with bibliographic info
  const handleCopy = async (includeNotes: boolean = false) => {
    const copyText = formatCitationCopyText(citation, username, includeNotes);
    try {
      await writeTextToClipboard(copyText);
      setShowCopyMenu(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Text selection for highlighting
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !cardRef.current) return;

    const range = selection.getRangeAt(0);
    const blockquote = cardRef.current.querySelector('blockquote');

    if (!blockquote || !blockquote.contains(range.commonAncestorContainer)) return;

    const selectedText = selection.toString();
    if (!selectedText.trim()) return;

    // Calculate the accurate start index relative to the entire blockquote text
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(blockquote);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);

    const start = preSelectionRange.toString().length;
    const end = start + selectedText.length;

    // Check for overlapping highlights
    const isOverlapping = localHighlights.some(
      h => (start < h.end && end > h.start)
    );
    if (isOverlapping) {
      selection.removeAllRanges();
      return;
    }

    // Automatically confirm highlight
    const newHighlight: Highlight = {
      id: `hl-${Date.now()}`,
      start: start,
      end: end,
      color: 'yellow'
    };

    const updatedHighlights = [...localHighlights, newHighlight];
    setLocalHighlights(updatedHighlights);
    onUpdate(citation.id, { highlights: updatedHighlights });

    // Clear selection
    selection.removeAllRanges();
  };

  // Remove a highlight
  const handleRemoveHighlight = (highlightId: string) => {
    const updatedHighlights = localHighlights.filter(h => h.id !== highlightId);
    setLocalHighlights(updatedHighlights);
    onUpdate(citation.id, { highlights: updatedHighlights });
  };

  // Render text with highlights
  const renderHighlightedText = () => {
    if (!localHighlights || localHighlights.length === 0) {
      return citation.text;
    }

    // Sort highlights by start position
    const sorted = [...localHighlights].sort((a, b) => a.start - b.start);
    const segments: React.ReactNode[] = [];
    let lastIndex = 0;

    sorted.forEach((hl, idx) => {
      // Add text before this highlight
      if (hl.start > lastIndex) {
        segments.push(citation.text.slice(lastIndex, hl.start));
      }
      // Add highlighted segment
      segments.push(
        <mark
          key={hl.id}
          className="cursor-pointer relative group/hl rounded px-0.5 transition-colors"
          style={{ backgroundColor: 'var(--highlight-bg)' }}
          onClick={(e) => {
            e.stopPropagation();
            handleRemoveHighlight(hl.id);
          }}
          title="Click to remove highlight"
        >
          {citation.text.slice(hl.start, hl.end)}
        </mark>
      );
      lastIndex = hl.end;
    });

    // Add remaining text after last highlight
    if (lastIndex < citation.text.length) {
      segments.push(citation.text.slice(lastIndex));
    }

    return segments;
  };

  return (
    <div
      ref={cardRef}
      className={`
        group relative rounded-lg border mb-4 transition-all duration-200 flex items-start gap-2
        ${isSelected ? 'bg-[var(--accent-soft)] border-[var(--accent-border)]' : 'bg-[var(--bg-card)] border-[var(--border-main)] hover:shadow-md'}
        ${isEditing ? 'cursor-default ring-2 ring-[var(--accent-ring)] border-transparent shadow-lg bg-[var(--bg-card)]' : ''}
        ${isSelf && !isSelected ? 'border-[var(--accent-border)]/60' : ''}
      `}
    >
      {/* Checkbox */}
      {!isEditing && (
        <div className="pt-6 pl-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onToggleSelect(citation.id, e.target.checked)}
            className="w-4 h-4 rounded border-[var(--border-main)] text-[var(--accent)] focus:ring-[var(--accent-ring)] cursor-pointer"
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        {/* Action Buttons (Hover) */}
        {!isEditing && !showDeleteConfirm && (
          <div className="absolute top-3 right-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex gap-1 z-20">
            <div className="relative">
              <button
                onClick={() => setShowCopyMenu(!showCopyMenu)}
                className={`p-1.5 rounded-md transition-colors ${copied
                  ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-sidebar)]'
                  }`}
                title={copied ? 'Copied' : 'Copy'}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>

              {showCopyMenu && (
                <div className="absolute top-full right-0 mt-1 w-52 bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-main)] rounded-xl shadow-2xl z-[120] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                  <button
                    onClick={() => void handleCopy(false)}
                    className="type-label-bounded w-full text-left px-3 py-2 text-[var(--text-main)] hover:bg-[var(--sidebar-hover)] transition-colors"
                  >
                    copy
                  </button>
                  <button
                    onClick={() => void handleCopy(true)}
                    className="type-label-bounded w-full text-left px-3 py-2 text-[var(--text-main)] hover:bg-[var(--sidebar-hover)] transition-colors border-t border-[var(--border-main)]"
                  >
                    copy + memo
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] rounded-md transition-colors"
              title="Edit"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="absolute inset-0 z-30 bg-[var(--bg-card)]/95 backdrop-blur-sm rounded-lg flex items-center justify-center p-6 text-center">
            <div>
              <p className="type-body text-[var(--text-main)] font-medium mb-4">Are you sure you want to delete this citation?</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="type-label-bounded px-4 py-1.5 font-medium text-[var(--text-muted)] hover:bg-[var(--bg-sidebar)] rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDelete(citation.id);
                    setShowDeleteConfirm(false);
                  }}
                  className="type-label-bounded px-4 py-1.5 font-medium text-white bg-red-500 hover:bg-red-600 rounded-md shadow-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="p-5">
          {isEditing ? (
            <div className="space-y-4">
              <textarea
                ref={editTextareaRef}
                autoFocus
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="type-body w-full p-2 bg-[var(--bg-input)] text-[var(--text-main)] border border-[var(--border-main)] rounded-md focus:ring-2 focus:ring-[var(--accent-ring)] focus:border-[var(--accent-border)] min-h-[100px] resize-none overflow-y-auto"
                style={{ height: 'auto' }}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="type-muted uppercase font-bold text-[var(--text-muted)] block mb-1 ml-1">Author</label>
                  <input
                    type="text"
                    value={editAuthor}
                    onChange={(e) => setEditAuthor(e.target.value)}
                    placeholder="Self"
                    className="type-label-bounded w-full p-2 bg-[var(--bg-input)] text-[var(--text-main)] border border-[var(--border-main)] rounded-md focus:border-[var(--accent-border)]"
                  />
                </div>
                <div className="col-span-1">
                  <label className="type-muted uppercase font-bold text-[var(--text-muted)] block mb-1 ml-1">Source</label>
                  <input
                    type="text"
                    value={editBook}
                    onChange={(e) => setEditBook(e.target.value)}
                    className="type-label-bounded w-full p-2 bg-[var(--bg-input)] text-[var(--text-main)] border border-[var(--border-main)] rounded-md focus:border-[var(--accent-border)]"
                  />
                </div>
                <div className="col-span-1">
                  <label className="type-muted uppercase font-bold text-[var(--text-muted)] block mb-1 ml-1">Page</label>
                  <input
                    type="text"
                    value={editPage}
                    onChange={(e) => setEditPage(e.target.value)}
                    className="type-label-bounded w-full p-2 bg-[var(--bg-input)] text-[var(--text-main)] border border-[var(--border-main)] rounded-md focus:border-[var(--accent-border)]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-main)]">
                <button
                  onClick={handleCancel}
                  className="type-label-bounded flex items-center gap-1 px-3 py-1.5 font-medium text-[var(--text-muted)] hover:bg-[var(--bg-sidebar)] rounded-md transition-colors"
                >
                  <X size={14} /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="type-label-bounded flex items-center gap-1 px-3 py-1.5 font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent-strong)] rounded-md shadow-sm transition-colors"
                >
                  <Check size={14} /> Save
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Quote Content */}
              <blockquote
                className="type-body leading-relaxed text-[var(--text-main)] mb-4 relative z-10 select-text whitespace-pre-wrap"
                onMouseUp={handleTextSelection}
              >
                {renderHighlightedText()}
              </blockquote>

              {/* Metadata Tags */}
              <div className="type-label-bounded flex flex-wrap items-center gap-2 font-sans mt-4">
                {/* Author Tag */}
                {isSelf ? (
                  <span className="px-2 py-1 bg-[var(--accent-soft)] text-[var(--accent-strong)] rounded-md border border-[var(--accent-border)] font-medium flex items-center">
                    <User size={10} className="mr-1" /> {username}
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-[var(--sidebar-active)] text-[var(--accent-strong)] dark:text-[var(--accent)] rounded-md border border-[var(--border-main)] font-medium">
                    {citation.author}
                  </span>
                )}

                {/* Book & Page Tags (Always show if exist) */}
                {citation.book && (
                  <span className="px-2 py-1 bg-[var(--bg-sidebar)] text-[var(--text-muted)] rounded-md border border-[var(--border-main)]">
                    {citation.book}
                  </span>
                )}
                {citation.page && (
                  <span className="px-2 py-1 bg-[var(--bg-input)] text-[var(--text-muted)] rounded-md border border-[var(--border-main)] font-mono">
                    p.{citation.page}
                  </span>
                )}

                {/* Project Tags */}
                {projectNames.map(name => (
                  <span key={name} className="px-2 py-1 bg-[var(--sidebar-active)] text-[var(--accent)] dark:text-[var(--accent)] rounded-md border border-[var(--border-main)] flex items-center gap-1 font-medium italic">
                    <Folder size={10} /> {name}
                  </span>
                ))}

                {/* Notes Toggle */}
                <button
                  onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                  className={`
                  ml-auto flex items-center gap-1 px-2 py-1 rounded-full transition-colors
                  ${citation.notes.length > 0 ? 'text-[var(--accent)] dark:text-[var(--accent)] bg-[var(--sidebar-active)] border border-[var(--border-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}
                `}
                >
                  <MessageSquare size={12} />
                  <span className="font-medium">{citation.notes.length}</span>
                  {isNotesExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>


            </>
          )}
        </div>

        {/* Collapsible Notes Section */}
        {
          isNotesExpanded && !isEditing && (
            <div className="border-t border-[var(--border-main)] bg-[var(--bg-sidebar)]/30 rounded-b-lg p-4">

              {/* List of Existing Notes */}
              <div className={`${citation.notes.length > 0 ? 'space-y-3 mb-4' : ''}`}>
                {citation.notes.map(note => (
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
                          onChange={(e) => setEditNoteContent(e.target.value)}
                          className="type-body w-full bg-transparent text-[var(--text-main)] border-none p-3 focus:ring-0 focus:outline-none min-h-[80px] resize-none overflow-y-auto"
                        />
                        <div className="flex justify-end gap-3 p-2 bg-[var(--bg-sidebar)]/50 border-t border-[var(--border-main)]">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingNoteId(null); }}
                            className="type-label-bounded text-[var(--text-muted)] hover:text-[var(--text-main)]"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSaveNoteEdit(note.id); }}
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

              {/* Direct New Note Input */}
              <div className="bg-[var(--bg-card)] rounded-md border border-[var(--border-main)] shadow-sm focus-within:border-[var(--accent-border)] focus-within:ring-1 focus-within:ring-[var(--accent-ring)] transition-all">
                <textarea
                  ref={newNoteTextareaRef}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a new note..."
                  className="type-body w-full bg-transparent text-[var(--text-main)] border-none p-3 focus:ring-0 focus:outline-none min-h-[60px] resize-none overflow-y-auto"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submitNote();
                    }
                  }}
                />
                <div className="flex justify-end p-2 bg-[var(--bg-sidebar)]/50 border-t border-[var(--border-main)]">
                  <button
                    onClick={submitNote}
                    disabled={!newNote.trim()}
                    className={`
                      type-label-bounded px-3 py-1 font-bold rounded transition-colors
                      ${newNote.trim() ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)]' : 'bg-[var(--bg-sidebar)] text-[var(--text-muted)] cursor-not-allowed'}
                    `}
                  >
                    Save note
                  </button>
                </div>
              </div>
            </div>
          )
        }
      </div>
    </div>
  );
};
