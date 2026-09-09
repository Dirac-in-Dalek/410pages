import React from 'react';
import { Check, Pencil, Send, SendHorizontal, Trash2, X } from 'lucide-react';
import type { Citation } from '../../../types';
import { useModalFocus } from '../../../shared/ui/useModalFocus';

type PassageNotesPanelProps = {
  citation: Citation;
  onClose: () => void;
  onAddNote: (citationId: string, content: string) => boolean | void | Promise<boolean | void>;
  onUpdateNote: (citationId: string, noteId: string, content: string) => boolean | void | Promise<boolean | void>;
  onDeleteNote: (citationId: string, noteId: string) => boolean | void | Promise<boolean | void>;
  readOnly?: boolean;
  onActivate?: () => void;
  mobile?: boolean;
  inline?: boolean;
};

export const PassageNotesPanel: React.FC<PassageNotesPanelProps> = ({
  citation,
  onClose,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  readOnly = false,
  onActivate,
  mobile = false,
  inline = false,
}) => {
  const titleId = React.useId();
  const rootRef = useModalFocus<HTMLElement>(mobile, onClose);
  const draftRef = React.useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = React.useState('');
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editDraft, setEditDraft] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const requestRef = React.useRef(0);
  const citationIdRef = React.useRef(citation.id);
  if (citationIdRef.current !== citation.id) {
    citationIdRef.current = citation.id;
    requestRef.current += 1;
  }

  React.useEffect(() => {
    setDraft('');
    setEditingId(null);
    setEditDraft('');
    setSaving(false);
  }, [citation.id]);

  React.useEffect(() => {
    if (readOnly) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!mobile && event.key === 'Escape') onClose();
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target || rootRef.current?.contains(target) || target.closest('[data-passage-note-trigger]')) return;
      if (inline && target.closest('[data-divider-toggle], [data-book-memo-panel]')) return;
      const viewport = target.closest<HTMLElement>('[data-archive-scroll]');
      if (inline && target === viewport && viewport) {
        const contentRight = viewport.getBoundingClientRect().left + viewport.clientLeft + viewport.clientWidth;
        if (event.clientX >= contentRight) return;
      }
      onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    if (!mobile) document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [mobile, inline, readOnly, onClose]);

  React.useLayoutEffect(() => {
    const input = draftRef.current;
    if (!inline || readOnly || !input) return;
    input.style.height = 'auto';
    input.style.height = `${input.scrollHeight}px`;
  }, [draft, inline, readOnly]);

  const saveNewNote = async () => {
    const content = draft.trim();
    if (!content || saving) return;
    const request = ++requestRef.current;
    const citationId = citation.id;
    setSaving(true);
    const didSave = await Promise.resolve(onAddNote(citationId, content));
    if (request !== requestRef.current || citationIdRef.current !== citationId) return;
    setSaving(false);
    if (didSave !== false) setDraft('');
  };

  const saveEdit = async (noteId: string) => {
    const content = editDraft.trim();
    if (!content || saving) return;
    const request = ++requestRef.current;
    const citationId = citation.id;
    setSaving(true);
    const didSave = await Promise.resolve(onUpdateNote(citationId, noteId, content));
    if (request !== requestRef.current || citationIdRef.current !== citationId) return;
    setSaving(false);
    if (didSave !== false) setEditingId(null);
  };

  return (
    <aside
      ref={rootRef}
      tabIndex={-1}
      role={mobile ? 'dialog' : 'complementary'}
      aria-modal={mobile || undefined}
      aria-labelledby={inline ? undefined : titleId}
      aria-label={inline ? `댓글: ${citation.text.slice(0, 40)}` : undefined}
      className={[
        'flex min-h-0 flex-col text-[var(--text-main)]',
        inline ? 'relative w-full flex-1 gap-1' : 'h-full bg-[var(--bg-card)]',
        inline ? '' : mobile ? 'rounded-t-2xl border-t border-[var(--border-main)] shadow-[var(--shadow-panel)]' : 'w-full border-r border-[var(--border-main)]',
      ].join(' ')}
    >
      {!inline && <header className={inline ? 'absolute -top-6 inset-x-0 flex h-6 items-start gap-3' : 'flex min-h-14 items-center gap-3 border-b border-[var(--border-main)] px-4'}>
        <div className="min-w-0 flex-1">
          {!inline && <p className="text-[0.7rem] font-medium text-[var(--accent)]">구절 메모</p>}
          <h2 id={titleId} className={inline ? 'text-xs leading-6 text-[var(--text-muted)]' : 'text-sm font-semibold'}>{inline ? `댓글${citation.page ? ` · ${citation.page}쪽` : ''}` : citation.notes.length ? `${citation.notes.length}개의 메모` : '메모 없음'}</h2>
        </div>
        <button type="button" onClick={onClose} className={`${inline ? 'h-6 w-6' : 'h-10 w-10'} flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)]`} aria-label="구절 메모 닫기">
          <X size={18} />
        </button>
      </header>}
      {inline && !readOnly && <button type="button" onClick={onClose} aria-label="구절 메모 닫기"
        className="absolute -top-5 right-0 flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)]"><X size={16} /></button>}

      <div className={inline ? 'px-1.5' : 'min-h-0 flex-1 overflow-y-auto'}>
        {!inline && <blockquote className="border-b border-[var(--border-main)] px-4 py-5 font-[var(--font-display-active)] text-[0.9rem] leading-6 text-[var(--text-secondary)]">
          “{citation.text}”
          <footer className="mt-2 text-[0.72rem] not-italic text-[var(--text-muted)]">{citation.page ? `${citation.page}쪽 · ` : ''}{new Date(citation.createdAt).toLocaleDateString('ko-KR')}</footer>
        </blockquote>}

        <div className={inline ? 'space-y-3' : 'divide-y divide-[var(--border-main)]'}>
          {citation.notes.map((note) => (
            <article key={note.id} className={inline ? 'group py-1.5 first:pt-0' : 'group px-4 py-4'}>
              {editingId === note.id && !readOnly ? (
                <div>
                  <textarea
                    autoFocus
                    value={editDraft}
                    onChange={(event) => setEditDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                        event.preventDefault();
                        void saveEdit(note.id);
                      }
                    }}
                    className="min-h-24 w-full resize-y rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] p-3 text-sm leading-6 focus:border-[var(--accent-border)] focus:ring-0"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button type="button" onClick={() => setEditingId(null)} className="min-h-10 rounded-lg px-3 text-sm text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)]">취소</button>
                    <button type="button" disabled={!editDraft.trim() || saving} onClick={() => void saveEdit(note.id)} className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-[var(--accent)] px-3 text-sm font-semibold text-white disabled:opacity-40"><Check size={14} /> 저장</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className={`whitespace-pre-wrap break-words text-sm leading-6 ${inline ? 'text-left' : ''}`}>{note.content}</p>
                  <div className={`${inline ? 'mt-0.5 justify-end' : 'mt-2 justify-between'} flex items-center text-[0.7rem] text-[var(--text-muted)]`}>
                    {!inline && <time>{new Date(note.createdAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>}
                    <div className="flex opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      <button type="button" data-passage-note-trigger onClick={() => { onActivate?.(); setEditingId(note.id); setEditDraft(note.content); }} className={`${inline ? 'h-8 w-8' : 'h-10 w-10'} flex items-center justify-center rounded-lg hover:bg-[var(--sidebar-hover)]`} aria-label="메모 수정"><Pencil size={14} /></button>
                      <button type="button" data-passage-note-trigger onClick={() => void Promise.resolve(onDeleteNote(citation.id, note.id))} className={`${inline ? 'h-8 w-8' : 'h-10 w-10'} flex items-center justify-center rounded-lg hover:bg-[var(--sidebar-hover)]`} aria-label="메모 삭제"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </>
              )}
            </article>
          ))}
          {!inline && !citation.notes.length ? <p className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">이 구절에 남긴 메모가 없습니다.</p> : null}
        </div>
      </div>

      {!readOnly && <div className={inline ? 'mt-auto grid grid-cols-[minmax(0,1fr)_2rem] items-end gap-1 rounded-md bg-[var(--bg-card)] p-1.5' : 'border-t border-[var(--border-main)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]'}>
        <textarea
          ref={draftRef}
          rows={inline ? 1 : undefined}
          aria-label="댓글 입력"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void saveNewNote();
            }
          }}
          placeholder={inline ? '댓글을 남기세요' : '이 구절에 대한 생각을 적으세요.'}
          className={inline ? 'min-h-6 w-full resize-none border-0 bg-transparent p-0 text-sm leading-6 placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-0' : 'min-h-24 w-full resize-none rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] p-3 text-sm leading-6 placeholder:text-[var(--text-muted)] focus:border-[var(--accent-border)] focus:ring-0'}
        />
        <div className={`flex items-center gap-2 ${inline ? 'justify-end' : 'mt-2 justify-between'}`}>
          <span className={inline ? 'sr-only' : 'min-w-0 text-[0.7rem] leading-4 text-[var(--text-muted)]'}>Enter 저장 · Shift+Enter 줄바꿈</span>
          <button type="button" disabled={!draft.trim() || saving} onClick={() => void saveNewNote()} className={`${inline ? 'h-8 w-8' : 'h-10 w-10'} inline-flex shrink-0 items-center justify-center rounded-lg transition-transform active:scale-95 disabled:opacity-40 motion-reduce:transition-none ${inline ? 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)]' : 'bg-[var(--accent)] text-white'}`} aria-label="메모 저장" title="저장 (Enter)">{inline ? <Send size={18} /> : <SendHorizontal size={16} />}</button>
        </div>
      </div>}
    </aside>
  );
};
