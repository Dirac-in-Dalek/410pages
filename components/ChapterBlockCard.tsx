import React from 'react';
import { ChevronDown, ChevronRight, Pencil, Check, GripVertical, X } from 'lucide-react';

interface ChapterBlockCardProps {
  id: string;
  label: string;
  collapsed?: boolean;
  onToggle?: () => void;
  onDragStart?: (event: React.DragEvent) => void;
  onDragEnd?: () => void;
  onMove?: (direction: -1 | 1) => void;
  onRename?: (label: string) => Promise<boolean> | boolean;
  onDelete?: (id: string) => void;
}

export const ChapterBlockCard: React.FC<ChapterBlockCardProps> = ({ id, label, onDelete, collapsed = false, onToggle, onRename, onDragStart, onDragEnd, onMove }) => {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(label);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(false);
  const startEditing = () => { if (onRename) { setDraft(label); setError(false); setEditing(true); } };
  const save = async () => {
    if (!onRename || !draft.trim() || saving) return;
    setSaving(true);
    try {
      if (await onRename(draft.trim())) setEditing(false);
      else setError(true);
    } catch { setError(true); }
    finally { setSaving(false); }
  };
  return (
    <div className="group relative mb-3 mt-8 flex items-start gap-2 pl-12 pr-1">
      {onToggle ? (
        <button
          type="button"
          aria-label={`챕터 ${collapsed ? '펼치기' : '접기'} ${label}`}
          data-divider-toggle
          aria-expanded={!collapsed}
          onClick={onToggle}
          className="absolute left-0 top-0 inline-flex h-11 w-11 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>
      ) : null}
      {!editing && onDragStart && <button type="button" draggable data-passage-note-trigger
        aria-label={`챕터 이동 ${label}`} title="드래그하여 이동 · Alt+위/아래로 이동"
        onDragStart={onDragStart} onDragEnd={onDragEnd}
        onKeyDown={event => { if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) { event.preventDefault(); onMove?.(event.key === 'ArrowUp' ? -1 : 1); } }}
        className="h-10 w-7 shrink-0 cursor-grab text-[var(--text-muted)] active:cursor-grabbing focus-visible:outline focus-visible:outline-2">
        <GripVertical size={16} />
      </button>}
      {editing ? <form className="min-w-0 flex-1" onSubmit={event => { event.preventDefault(); void save(); }}>
        <div className="flex items-center gap-1">
          <input autoFocus aria-label="챕터 제목 수정" value={draft} disabled={saving}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={event => { if (event.key === 'Escape' && !saving) setEditing(false); if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault(); }}
            className="min-w-0 flex-1 rounded-md bg-[var(--bg-input)] px-2 py-1 text-lg text-[var(--text-main)]" />
          <button type="submit" disabled={saving || !draft.trim()} aria-label="챕터 제목 저장" className="h-10 w-10"><Check size={16} /></button>
          <button type="button" disabled={saving} onClick={() => setEditing(false)} aria-label="챕터 제목 수정 취소" className="h-10 w-10"><X size={16} /></button>
        </div>
        {error && <p role="alert" className="text-sm text-red-600">제목을 저장하지 못했습니다. 다시 시도해 주세요.</p>}
      </form> : <h2 draggable={Boolean(onDragStart)} onDragStart={onDragStart} onDragEnd={onDragEnd} onDoubleClick={startEditing} className="min-w-0 flex-1 whitespace-normal break-words font-[var(--font-display-active)] text-left text-xl font-semibold leading-relaxed text-[var(--text-main)] sm:text-2xl">
        {label}
      </h2>}
      {!editing && onRename && <button type="button" aria-label={`챕터 제목 수정 ${label}`} onClick={startEditing} className="h-10 w-10 shrink-0 text-[var(--text-muted)] sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"><Pencil size={14} /></button>}
      {onDelete && !editing ? (
        <button
          type="button"
          aria-label={`챕터 삭제 ${label}`}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-secondary)] focus-visible:opacity-100 sm:h-8 sm:w-8 sm:opacity-0 sm:group-hover:opacity-100"
          onClick={() => onDelete(id)}
        >
          <X size={14} strokeWidth={2.2} />
        </button>
      ) : null}
    </div>
  );
};
