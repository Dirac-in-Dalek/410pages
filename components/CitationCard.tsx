import React, { useState } from 'react';
import { MessageSquare, ChevronDown, ChevronUp, Plus, Quote, User, Edit2, Trash2, X, Check, Folder } from 'lucide-react';
import { Citation, Note } from '../types';

interface CitationCardProps {
  citation: Citation;
  index: number;
  username: string;
  projectNames?: string[];
  onAddNote: (citationId: string, content: string) => void;
  onUpdateNote: (citationId: string, noteId: string, content: string) => void;
  onDeleteNote: (citationId: string, noteId: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<Citation>) => void;
  onReorder: (dragIndex: number, hoverIndex: number) => void;
}

export const CitationCard: React.FC<CitationCardProps> = ({
  citation,
  index,
  username,
  projectNames = [],
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onDelete,
  onUpdate,
  onReorder
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
  const [isDragOver, setIsDragOver] = useState(false);

  const isSelf = citation.isSelf ?? (citation.author === username || !citation.author || citation.author === 'Self');

  const handleDragStart = (e: React.DragEvent) => {
    if (isEditing) return;

    // Support both reordering and moving to projects
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'citation',
      id: citation.id,
      index: index
    }));

    // Specific key for internal reordering
    e.dataTransfer.setData('citation_sort_index', index.toString());
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isEditing) return;
    setIsDragOver(true);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const dragIndexStr = e.dataTransfer.getData('citation_sort_index');
    if (dragIndexStr !== '') {
      const dragIndex = parseInt(dragIndexStr, 10);
      if (!isNaN(dragIndex) && dragIndex !== index) {
        onReorder(dragIndex, index);
      }
    }
  };

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
      page: editPage ? parseInt(editPage, 10) : undefined
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

  return (
    <article
      draggable={!isEditing}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        group relative rounded-lg border mb-4 transition-all duration-200
        ${isDragOver ? 'border-t-4 border-t-indigo-500 pt-2' : ''}
        ${isEditing ? 'cursor-default ring-2 ring-indigo-400 border-transparent shadow-lg bg-white' : 'cursor-grab active:cursor-grabbing bg-white hover:shadow-md'}
        ${isSelf ? 'border-emerald-100' : 'border-slate-200'}
      `}
    >
      {/* Action Buttons (Hover) */}
      {!isEditing && !showDeleteConfirm && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-20">
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
            title="Edit"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-30 bg-white/95 backdrop-blur-sm rounded-lg flex items-center justify-center p-6 text-center">
          <div>
            <p className="text-slate-700 font-medium mb-4">정말로 이 인용구를 삭제하시겠습니까?</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-md"
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

      {/* Drag Handle Indicator (3 dots) */}
      {!isEditing && (
        <div className="absolute -left-3 top-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-300">
          <div className="cursor-grab active:cursor-grabbing p-1">
            <svg width="6" height="18" viewBox="0 0 6 18" fill="currentColor">
              <circle cx="3" cy="3" r="1.5" />
              <circle cx="3" cy="9" r="1.5" />
              <circle cx="3" cy="15" r="1.5" />
            </svg>
          </div>
        </div>
      )}

      <div className="p-5">
        {isEditing ? (
          <div className="space-y-4">
            <textarea
              autoFocus
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full text-lg font-serif p-2 border border-indigo-200 rounded-md focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 min-h-[100px] resize-none overflow-hidden"
              style={{ height: 'auto' }}
            />
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1 ml-1">Author</label>
                <input
                  type="text"
                  value={editAuthor}
                  onChange={(e) => setEditAuthor(e.target.value)}
                  placeholder="Self"
                  className="w-full text-xs p-2 border border-slate-200 rounded-md focus:border-indigo-300"
                />
              </div>
              <div className="col-span-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1 ml-1">Source</label>
                <input
                  type="text"
                  value={editBook}
                  onChange={(e) => setEditBook(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded-md focus:border-indigo-300"
                />
              </div>
              <div className="col-span-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1 ml-1">Page</label>
                <input
                  type="text"
                  value={editPage}
                  onChange={(e) => setEditPage(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded-md focus:border-indigo-300"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-50">
              <button
                onClick={handleCancel}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-md transition-colors"
              >
                <X size={14} /> 취소
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm transition-colors"
              >
                <Check size={14} /> 저장하기
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Quote Content */}
            <blockquote className="font-serif text-lg leading-relaxed text-slate-700 mb-4 relative z-10">
              {!isSelf && <span className="text-slate-300 text-2xl absolute -top-2 -left-2 select-none">“</span>}
              {citation.text}
              {!isSelf && <span className="text-slate-300 text-2xl absolute -bottom-4 -right-0 select-none">”</span>}
            </blockquote>

            {/* Metadata Tags */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-sans mt-4">
              {/* Author Tag */}
              {isSelf ? (
                <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100 font-medium flex items-center">
                  <User size={10} className="mr-1" /> {username}
                </span>
              ) : (
                <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100 font-medium">
                  {citation.author}
                </span>
              )}

              {/* Book & Page Tags (Always show if exist) */}
              {citation.book && (
                <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                  {citation.book}
                </span>
              )}
              {citation.page && (
                <span className="px-2 py-1 bg-slate-50 text-slate-500 rounded-md border border-slate-100 font-mono">
                  p. {citation.page}
                </span>
              )}

              {/* Project Tags */}
              {projectNames.map(name => (
                <span key={name} className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100 flex items-center gap-1 font-medium italic">
                  <Folder size={10} /> {name}
                </span>
              ))}

              {/* Notes Toggle */}
              <button
                onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                className={`
                  ml-auto flex items-center gap-1 px-2 py-1 rounded-full transition-colors
                  ${citation.notes.length > 0 ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' : 'text-slate-400 hover:text-slate-600'}
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
      {isNotesExpanded && !isEditing && (
        <div className="border-t border-slate-100 bg-slate-50/50 rounded-b-lg p-4">

          {/* List of Existing Notes */}
          <div className="space-y-3 mb-4">
            {citation.notes.map(note => (
              <div
                key={note.id}
                className={`
                  group/note relative text-sm text-slate-600 bg-white rounded border transition-all overflow-hidden
                  ${editingNoteId === note.id ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500/10' : 'p-2 border-slate-200 hover:border-indigo-300 cursor-pointer'}
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
                      autoFocus
                      value={editNoteContent}
                      onChange={(e) => setEditNoteContent(e.target.value)}
                      className="w-full text-sm border-none p-3 focus:ring-0 focus:outline-none min-h-[80px] resize-none"
                    />
                    <div className="flex justify-end gap-3 p-2 bg-slate-50/50 border-t border-slate-100">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingNoteId(null); }}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        취소
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSaveNoteEdit(note.id); }}
                        className="text-xs text-indigo-600 font-bold hover:text-indigo-800"
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
            {citation.notes.length === 0 && (
              <div className="text-xs text-slate-400 italic text-center py-2">No memos yet.</div>
            )}
          </div>

          {/* Direct New Note Input */}
          <div className="bg-white rounded-md border border-slate-200 shadow-sm focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-100 transition-all">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="새로운 메모를 입력하세요..."
              className="w-full text-sm border-none p-3 focus:ring-0 focus:outline-none min-h-[60px] resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submitNote();
                }
              }}
            />
            <div className="flex justify-end p-2 bg-slate-50/50 border-t border-slate-50">
              <button
                onClick={submitNote}
                disabled={!newNote.trim()}
                className={`
                  px-3 py-1 text-xs font-bold rounded transition-colors
                  ${newNote.trim() ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}
                `}
              >
                메모 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
};