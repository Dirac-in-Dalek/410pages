import React, { useState, useEffect } from 'react';
import { Send, User, Book as BookIcon, Hash, Type } from 'lucide-react';
import { Citation } from '../types';

interface CitationEditorProps {
  onAddCitation: (citation: Omit<Citation, 'id' | 'createdAt' | 'notes'>) => void;
  prefillData?: { author: string; book: string };
  username: string;
}

export const CitationEditor: React.FC<CitationEditorProps> = ({ onAddCitation, prefillData, username }) => {
  const [text, setText] = useState('');
  const [author, setAuthor] = useState(''); // Keep empty as default for "Self"
  const [book, setBook] = useState('');
  const [page, setPage] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Update inputs when prefillData changes
  useEffect(() => {
    if (prefillData) {
      setAuthor(prefillData.author);
      setBook(prefillData.book || '');
    } else {
      setAuthor(''); // Empty author means "Self"
      setBook('');
    }
  }, [prefillData]);

  const handleSubmit = () => {
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
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
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
        ${isDraggingOver ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-4 ring-indigo-100 dark:ring-indigo-900/30' : 'border-[var(--border-main)] bg-[var(--bg-card)] shadow-sm'}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Visual Cue for Drop */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg-card)]/80 rounded-lg backdrop-blur-sm pointer-events-none">
          <div className="text-indigo-600 font-medium flex items-center animate-bounce">
            <BookIcon className="mr-2" />
            Drop to auto-fill metadata
          </div>
        </div>
      )}

      {/* Main Text Input */}
      <div className="p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Start typing a citation or quote..."
          className="w-full text-lg font-serif placeholder:font-sans placeholder:text-[var(--text-muted)] text-[var(--text-main)] border-none resize-none focus:ring-0 bg-transparent p-0 min-h-[80px]"
        />
      </div>

      {/* Metadata Bar */}
      <div className="bg-[var(--bg-sidebar)] rounded-b-lg border-t border-[var(--border-main)] p-2 flex flex-wrap gap-2 items-center">

        {/* Author Input */}
        <div className="flex items-center bg-[var(--bg-card)] border border-[var(--border-main)] rounded-md px-2 py-1 flex-1 min-w-[120px] focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-100 transition-all">
          <User size={12} className={`mr-2 ${isSelf ? 'text-[var(--text-muted)]' : 'text-indigo-500'}`} />
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === 'Enter') handleSubmit();
            }}
            placeholder="Author (Empty = Self)"
            className="w-full text-xs border-none p-0 focus:ring-0 text-[var(--text-main)] placeholder:text-[var(--text-muted)] bg-transparent"
          />
        </div>

        {/* Book Input */}
        <div className="flex items-center bg-[var(--bg-input)] border border-[var(--border-main)] rounded-md px-2 py-1 flex-1 min-w-[120px] focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-100 transition-all">
          <BookIcon size={12} className="mr-2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={book}
            onChange={(e) => setBook(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === 'Enter') handleSubmit();
            }}
            placeholder="Book / Source"
            className="w-full text-xs border-none p-0 focus:ring-0 text-[var(--text-main)] placeholder:text-[var(--text-muted)] bg-transparent"
          />
        </div>

        {/* Page Input */}
        <div className="flex items-center bg-[var(--bg-input)] border border-[var(--border-main)] rounded-md px-2 py-1 w-24 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-100 transition-all">
          <Hash size={12} className="mr-2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={page}
            onChange={(e) => setPage(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === 'Enter') handleSubmit();
            }}
            placeholder="Page"
            className="w-full text-xs border-none p-0 focus:ring-0 text-[var(--text-main)] placeholder:text-[var(--text-muted)] bg-transparent"
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className={`
            ml-auto p-2 rounded-md transition-all
            ${text.trim() ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 hover:scale-105 active:scale-95' : 'bg-[var(--bg-sidebar)] text-[var(--text-muted)] cursor-not-allowed'}
          `}
        >
          <Send size={16} />
        </button>
      </div>

    </div>
  );
};