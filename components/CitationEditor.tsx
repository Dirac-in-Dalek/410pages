import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Book as BookIcon, Hash } from 'lucide-react';
import { AddCitationInput } from '../types';

type CitationEditorValues = {
  text: string;
  author: string;
  book: string;
  page: string;
};

interface CitationEditorProps {
  onAddCitation: (citation: AddCitationInput) => void | Promise<unknown>;
  prefillData?: { author: string; book: string };
  username: string;
  controlledValues?: Partial<CitationEditorValues>;
  readOnly?: boolean;
  hideSubmit?: boolean;
  placeholder?: string;
}

export const CitationEditor: React.FC<CitationEditorProps> = ({
  onAddCitation,
  prefillData,
  username,
  controlledValues,
  readOnly = false,
  hideSubmit = false,
  placeholder = 'Write a quote, sentence, or field note...'
}) => {
  const [text, setText] = useState('');
  const [author, setAuthor] = useState(''); // Keep empty as default for "Self"
  const [book, setBook] = useState('');
  const [page, setPage] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-expand textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 400); // Max height 400px
      textarea.style.height = `${newHeight}px`;
    }
  }, [text]);

  // Update inputs when prefillData changes
  useEffect(() => {
    if (controlledValues) return;

    if (prefillData) {
      setAuthor(prefillData.author);
      setBook(prefillData.book || '');
    } else {
      setAuthor(''); // Empty author means "Self"
      setBook('');
    }
  }, [controlledValues, prefillData]);

  useEffect(() => {
    if (!controlledValues) return;

    setText(controlledValues.text ?? '');
    setAuthor(controlledValues.author ?? '');
    setBook(controlledValues.book ?? '');
    setPage(controlledValues.page ?? '');
  }, [
    controlledValues,
    controlledValues?.author,
    controlledValues?.book,
    controlledValues?.page,
    controlledValues?.text
  ]);

  const handleSubmit = () => {
    if (readOnly) return;
    if (!text.trim()) return;

    onAddCitation({
      text,
      author,
      book,
      page: page || undefined,
      tags: [],
    });

    // Reset
    setText('');
    setAuthor(prefillData?.author || '');
    setBook(prefillData?.book || '');
    setPage('');
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (readOnly) return;
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (readOnly) return;
    e.preventDefault();
    setIsDraggingOver(false);

    try {
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;

      const data = JSON.parse(raw);
      if (data.type === 'reference') {
        if (data.author !== undefined) {
          setAuthor(data.author);
        }
        if (data.book !== undefined) setBook(data.book);
      }
    } catch (err) {
      console.error("Error parsing drop data", err);
    }
  };

  // Determine if this is a "Self" thought (empty name OR matching username)
  const isSelf = !author.trim() || author.trim() === username;

  return (
    <div
      className={`
        relative rounded-xl border-2 transition-all duration-300 p-1
        ${isDraggingOver ? 'border-[var(--accent-border)] bg-[var(--accent-soft)] ring-4 ring-[var(--accent-ring)]' : 'border-[var(--border-main)] bg-[var(--bg-card)] shadow-sm'}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Visual Cue for Drop */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg-card)]/80 rounded-lg backdrop-blur-sm pointer-events-none">
          <div className="text-[var(--accent)] font-medium flex items-center animate-bounce">
            <BookIcon className="mr-2" />
            Drop to auto-fill metadata
          </div>
        </div>
      )}

      {/* Main Text Input */}
      <div className="p-4">
        <textarea
          ref={textareaRef}
          value={text}
          readOnly={readOnly}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (readOnly) return;
            if (e.nativeEvent.isComposing) return;
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={placeholder}
          className="w-full text-base md:text-lg font-serif placeholder:font-sans placeholder:text-[var(--text-muted)] text-[var(--text-main)] border-none resize-none focus:ring-0 bg-transparent p-0 min-h-[80px] overflow-y-auto"
        />
      </div>

      {/* Metadata Bar */}
      <div className="bg-[var(--bg-sidebar)] rounded-b-lg border-t border-[var(--border-main)] p-2 flex flex-wrap gap-2 items-center">

        {/* Author Input */}
        <div className="flex items-center bg-[var(--bg-card)] border border-[var(--border-main)] rounded-md px-2 py-1 flex-1 min-w-[140px] focus-within:border-[var(--accent-border)] focus-within:ring-1 focus-within:ring-[var(--accent-ring)] transition-all">
          <User size={12} className={`mr-2 ${isSelf ? 'text-[var(--text-muted)]' : 'text-[var(--accent)]'}`} />
          <input
            type="text"
            value={author}
            readOnly={readOnly}
            onChange={(e) => setAuthor(e.target.value)}
            onKeyDown={(e) => {
              if (readOnly) return;
              if (e.nativeEvent.isComposing) return;
              if (e.key === 'Enter') handleSubmit();
            }}
            placeholder="Author (Leave blank for Self)"
            className="w-full text-xs border-none p-0 focus:ring-0 text-[var(--text-main)] placeholder:text-[var(--text-muted)] bg-transparent"
          />
        </div>

        {/* Book Input */}
        <div className="flex items-center bg-[var(--bg-input)] border border-[var(--border-main)] rounded-md px-2 py-1 flex-1 min-w-[140px] focus-within:border-[var(--accent-border)] focus-within:ring-1 focus-within:ring-[var(--accent-ring)] transition-all">
          <BookIcon size={12} className="mr-2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={book}
            readOnly={readOnly}
            onChange={(e) => setBook(e.target.value)}
            onKeyDown={(e) => {
              if (readOnly) return;
              if (e.nativeEvent.isComposing) return;
              if (e.key === 'Enter') handleSubmit();
            }}
            placeholder="Book or Source"
            className="w-full text-xs border-none p-0 focus:ring-0 text-[var(--text-main)] placeholder:text-[var(--text-muted)] bg-transparent"
          />
        </div>

        {/* Page Input */}
        <div className="flex items-center bg-[var(--bg-input)] border border-[var(--border-main)] rounded-md px-2 py-1 w-24 focus-within:border-[var(--accent-border)] focus-within:ring-1 focus-within:ring-[var(--accent-ring)] transition-all">
          <Hash size={12} className="mr-2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={page}
            readOnly={readOnly}
            onChange={(e) => setPage(e.target.value)}
            onKeyDown={(e) => {
              if (readOnly) return;
              if (e.nativeEvent.isComposing) return;
              if (e.key === 'Enter') handleSubmit();
            }}
            placeholder="Page"
            className="w-full text-xs border-none p-0 focus:ring-0 text-[var(--text-main)] placeholder:text-[var(--text-muted)] bg-transparent"
          />
        </div>

        {/* Submit Button */}
        {!hideSubmit && (
          <button
            onClick={handleSubmit}
            disabled={readOnly || !text.trim()}
            className={`
              ml-auto p-2 rounded-md transition-all
              ${text.trim() && !readOnly ? 'bg-[var(--accent)] text-white shadow-md hover:bg-[var(--accent-strong)] hover:scale-105 active:scale-95' : 'bg-[var(--bg-sidebar)] text-[var(--text-muted)] cursor-not-allowed'}
            `}
          >
            <Send size={16} />
          </button>
        )}
      </div>

    </div>
  );
};
