import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, ChevronDown, ChevronUp, Plus, Quote, User, Edit2, Trash2, X, Check, Folder, Copy, Trash } from 'lucide-react';
import { Citation, Note, Highlight } from '../types';

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

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Copy button state
  const [copied, setCopied] = useState(false);

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

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        window.getSelection()?.removeAllRanges();
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
  const handleCopy = async () => {
    let copyText = `"${citation.text}"`;

    if (!isSelf && citation.author) {
      copyText += ` — ${citation.author}`;
      if (citation.book) copyText += `, 『${citation.book}』`;
      if (citation.page) copyText += `, p.${citation.page}`;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(copyText);
      } else {
        // Fallback for non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = copyText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
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
          title="클릭하여 하이라이트 삭제"
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
            <button
              onClick={handleCopy}
              className={`p-1.5 rounded-md transition-colors ${copied
                ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                : 'text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-sidebar)]'
                }`}
              title={copied ? '복사됨!' : '복사하기'}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
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

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-30 bg-[var(--bg-card)]/95 backdrop-blur-sm rounded-lg flex items-center justify-center p-6 text-center">
            <div>
              <p className="text-[var(--text-main)] font-medium mb-4">정말로 이 인용구를 삭제하시겠습니까?</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-1.5 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg-sidebar)] rounded-md"
                >
                  취소
                </button>
                <button
                  onClick={() => onDelete(citation.id)}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-md shadow-sm"
                >
                  삭제하기
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
                className="w-full text-base md:text-lg font-serif p-2 bg-[var(--bg-input)] text-[var(--text-main)] border border-[var(--border-main)] rounded-md focus:ring-2 focus:ring-[var(--accent-ring)] focus:border-[var(--accent-border)] min-h-[100px] resize-none overflow-y-auto"
                style={{ height: 'auto' }}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1 ml-1">Author</label>
                  <input
                    type="text"
                    value={editAuthor}
                    onChange={(e) => setEditAuthor(e.target.value)}
                    placeholder="Self"
                    className="w-full text-xs p-2 bg-[var(--bg-input)] text-[var(--text-main)] border border-[var(--border-main)] rounded-md focus:border-[var(--accent-border)]"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1 ml-1">Source</label>
                  <input
                    type="text"
                    value={editBook}
                    onChange={(e) => setEditBook(e.target.value)}
                    className="w-full text-xs p-2 bg-[var(--bg-input)] text-[var(--text-main)] border border-[var(--border-main)] rounded-md focus:border-[var(--accent-border)]"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1 ml-1">Page</label>
                  <input
                    type="text"
                    value={editPage}
                    onChange={(e) => setEditPage(e.target.value)}
                    className="w-full text-xs p-2 bg-[var(--bg-input)] text-[var(--text-main)] border border-[var(--border-main)] rounded-md focus:border-[var(--accent-border)]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-main)]">
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg-sidebar)] rounded-md transition-colors"
                >
                  <X size={14} /> 취소
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent-strong)] rounded-md shadow-sm transition-colors"
                >
                  <Check size={14} /> 저장하기
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Quote Content */}
              <blockquote
                className="font-serif text-base md:text-lg leading-relaxed text-[var(--text-main)] mb-4 relative z-10 select-text whitespace-pre-wrap"
                onMouseUp={handleTextSelection}
              >
                {renderHighlightedText()}
              </blockquote>

              {/* Metadata Tags */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-sans mt-4">
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
                  group/note relative text-sm text-[var(--text-main)] bg-[var(--bg-card)] rounded border transition-all overflow-hidden
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
                          className="w-full text-sm bg-transparent text-[var(--text-main)] border-none p-3 focus:ring-0 focus:outline-none min-h-[80px] resize-none overflow-y-auto"
                        />
                        <div className="flex justify-end gap-3 p-2 bg-[var(--bg-sidebar)]/50 border-t border-[var(--border-main)]">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingNoteId(null); }}
                            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)]"
                          >
                            취소
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSaveNoteEdit(note.id); }}
                            className="text-xs text-[var(--accent)] font-bold hover:text-[var(--accent-strong)]"
                          >
                            저장
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
                  placeholder="새로운 메모를 입력하세요..."
                  className="w-full text-sm bg-transparent text-[var(--text-main)] border-none p-3 focus:ring-0 focus:outline-none min-h-[60px] resize-none overflow-y-auto"
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
                  px-3 py-1 text-xs font-bold rounded transition-colors
                  ${newNote.trim() ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)]' : 'bg-[var(--bg-sidebar)] text-[var(--text-muted)] cursor-not-allowed'}
                `}
                  >
                    메모 저장
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
