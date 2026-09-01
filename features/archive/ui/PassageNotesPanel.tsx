import React from 'react';
import { Check, Pencil, SendHorizontal, Trash2, X } from 'lucide-react';
import type { Citation } from '../../../types';
import { useModalFocus } from '../../../shared/ui/useModalFocus';

type PassageNotesPanelProps = {
  citation: Citation;
  onClose: () => void;
  onAddNote: (citationId: string, content: string) => boolean | void | Promise<boolean | void>;
  onUpdateNote: (citationId: string, noteId: string, content: string) => boolean | void | Promise<boolean | void>;
  onDeleteNote: (citationId: string, noteId: string) => boolean | void | Promise<boolean | void>;
  mobile?: boolean;
};

export const PassageNotesPanel: React.FC<PassageNotesPanelProps> = ({
  citation,
  onClose,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  mobile = false,
}) => {
  const rootRef = useModalFocus<HTMLElement>(mobile, onClose);
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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!mobile && event.key === 'Escape') onClose();
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target || rootRef.current?.contains(target) || target.closest('[data-passage-note-trigger]')) return;
      onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    if (!mobile) document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [mobile, onClose]);

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
      aria-labelledby="passage-notes-title"
      className={[
        'flex h-full min-h-0 flex-col bg-[var(--bg-card)] text-[var(--text-main)]',
        mobile ? 'rounded-t-2xl border-t border-[var(--border-main)] shadow-[var(--shadow-panel)]' : 'w-full border-r border-[var(--border-main)]',
      ].join(' ')}
    >
      <header className="flex min-h-14 items-center gap-3 border-b border-[var(--border-main)] px-4">
        <div className="min-w-0 flex-1">
          <p className="text-[0.7rem] font-medium text-[var(--accent)]">구절 메모</p>
          <h2 id="passage-notes-title" className="text-sm font-semibold">{citation.notes.length ? `${citation.notes.length}개의 메모` : '메모 없음'}</h2>
        </div>
        <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)]" aria-label="구절 메모 닫기">
          <X size={18} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <blockquote className="border-b border-[var(--border-main)] px-4 py-5 font-[var(--font-display-active)] text-[0.9rem] leading-6 text-[var(--text-secondary)]">
          “{citation.text}”
          <footer className="mt-2 text-[0.72rem] not-italic text-[var(--text-muted)]">{citation.page ? `${citation.page}쪽 · ` : ''}{new Date(citation.createdAt).toLocaleDateString('ko-KR')}</footer>
        </blockquote>

        <div className="divide-y divide-[var(--border-main)]">
          {citation.notes.map((note) => (
            <article key={note.id} className="group px-4 py-4">
              {editingId === note.id ? (
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
                  <p className="whitespace-pre-wrap text-sm leading-6">{note.content}</p>
                  <div className="mt-2 flex items-center justify-between text-[0.7rem] text-[var(--text-muted)]">
                    <time>{new Date(note.createdAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
                    <div className="flex opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      <button type="button" onClick={() => { setEditingId(note.id); setEditDraft(note.content); }} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-[var(--sidebar-hover)]" aria-label="메모 수정"><Pencil size={14} /></button>
                      <button type="button" onClick={() => void Promise.resolve(onDeleteNote(citation.id, note.id))} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-[var(--sidebar-hover)]" aria-label="메모 삭제"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </>
              )}
            </article>
          ))}
          {!citation.notes.length ? <p className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">이 구절에 남긴 메모가 없습니다.</p> : null}
        </div>
      </div>

      <div className="border-t border-[var(--border-main)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void saveNewNote();
            }
          }}
          placeholder="이 구절에 대한 생각을 적으세요."
          className="min-h-24 w-full resize-none rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] p-3 text-sm leading-6 placeholder:text-[var(--text-muted)] focus:border-[var(--accent-border)] focus:ring-0"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="min-w-0 text-[0.7rem] leading-4 text-[var(--text-muted)]">Enter 저장 · Shift+Enter 줄바꿈</span>
          <button type="button" disabled={!draft.trim() || saving} onClick={() => void saveNewNote()} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-white transition-transform active:scale-95 disabled:opacity-40 motion-reduce:transition-none" aria-label="메모 저장" title="저장 (Enter)"><SendHorizontal size={16} /></button>
        </div>
      </div>
    </aside>
  );
};
