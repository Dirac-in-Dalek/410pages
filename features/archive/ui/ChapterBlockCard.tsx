import React from 'react';
import { ChevronDown, ChevronRight, Pencil, Check, X } from 'lucide-react';
import { changeChapterDepth, getChapterLevelDirection } from '../logic/chapterHierarchy';

interface ChapterBlockCardProps {
  id: string;
  label: string;
  depth?: number;
  displayDepth?: number;
  onDepthPreview?: (id: string, depth?: number) => void;
  previousDepth?: number;
  collapsed?: boolean;
  onToggle?: () => void;
  onDragStart?: (event: React.DragEvent) => void;
  onDragEnd?: () => void;
  onMove?: (direction: -1 | 1) => void;
  onRename?: (label: string, depth?: number) => Promise<boolean> | boolean;
  onDelete?: (id: string) => void;
}

export const ChapterBlockCard: React.FC<ChapterBlockCardProps> = ({ id, label, depth = 0, displayDepth = depth, onDepthPreview, previousDepth, onDelete, collapsed = false, onToggle, onRename, onDragStart, onDragEnd, onMove }) => {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(label);
  const [draftDepth, setDraftDepth] = React.useState(depth);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(false);
  React.useEffect(() => {
    if (!editing || !onDepthPreview) return;
    onDepthPreview(id, draftDepth);
    return () => onDepthPreview(id);
  }, [id, editing, draftDepth, onDepthPreview]);
  const startEditing = () => { if (onRename) { setDraft(label); setDraftDepth(depth); setError(false); setEditing(true); } };
  const save = async () => {
    if (!onRename || !draft.trim() || saving) return;
    setSaving(true);
    try {
      const didSave = draftDepth === depth ? await onRename(draft.trim()) : await onRename(draft.trim(), draftDepth);
      if (didSave) setEditing(false);
      else setError(true);
    } catch { setError(true); }
    finally { setSaving(false); }
  };
  return (
    <div data-chapter-node={id} data-chapter-depth={editing ? draftDepth : displayDepth}
      style={{ '--chapter-depth': editing ? draftDepth : displayDepth } as React.CSSProperties}
      className="chapter-row group" data-chapter-editing={editing}>
      {onToggle ? (
        <button
          type="button"
          aria-label={`챕터 ${collapsed ? '펼치기' : '접기'} ${label}`}
          data-divider-toggle
          data-chapter-anchor
          aria-expanded={!collapsed}
          onClick={onToggle}
          className="chapter-control chapter-fold"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>
      ) : <span data-chapter-anchor className="chapter-control chapter-fold" aria-hidden="true" />}
      {editing ? <form className="contents" onSubmit={event => { event.preventDefault(); void save(); }}>
        <div className="contents">
          <input autoFocus aria-label="챕터 제목 수정" value={draft} disabled={saving}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={event => {
              const direction = getChapterLevelDirection(event);
              if (direction && !saving) {
                event.preventDefault();
                setDraftDepth(current => changeChapterDepth(current, previousDepth, direction));
                return;
              }
              if (event.key === 'Escape' && !saving) setEditing(false);
              if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault();
            }}
            className="chapter-title-input" />
          <button type="submit" disabled={saving || !draft.trim()} aria-label="챕터 제목 저장" className="chapter-control chapter-action-primary"><Check size={16} /></button>
          <button type="button" disabled={saving} onClick={() => setEditing(false)} aria-label="챕터 제목 수정 취소" className="chapter-control chapter-action-secondary"><X size={16} /></button>
        </div>
        <p role="status" className="chapter-hint">{draftDepth === 0 ? '상위 단계' : `하위 ${draftDepth}단계`} · 제목 맨 앞에서 Tab/Space로 하위, Delete/Backspace로 상위</p>
        {error && <p role="alert" className="chapter-hint text-red-600">제목과 단계를 저장하지 못했습니다. 다시 시도해 주세요.</p>}
      </form> : <h2 aria-level={displayDepth + 2} draggable={Boolean(onDragStart)}
        tabIndex={onDragStart ? 0 : undefined}
        title={onDragStart ? '드래그: 위아래로 순서, 좌우로 단계 · Alt+위/아래로 순서 이동' : undefined}
        aria-keyshortcuts={onDragStart && onMove ? 'Alt+ArrowUp Alt+ArrowDown' : undefined}
        onKeyDown={event => {
          if (onDragStart && onMove && event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
            event.preventDefault();
            onMove(event.key === 'ArrowUp' ? -1 : 1);
          }
        }} onDragStart={onDragStart} onDragEnd={onDragEnd} onDoubleClick={startEditing} className={`chapter-title ${displayDepth === 0 ? 'chapter-title-root' : displayDepth === 1 ? 'chapter-title-child' : 'chapter-title-deep'}`}>
        {label}
      </h2>}
      {!editing && onRename && <button type="button" aria-label={`챕터 제목 수정 ${label}`} onClick={startEditing} className="chapter-control chapter-action-primary"><Pencil size={14} /></button>}
      {onDelete && !editing ? (
        <button
          type="button"
          aria-label={`챕터 삭제 ${label}`}
          className="chapter-control chapter-action-secondary"
          onClick={() => onDelete(id)}
        >
          <X size={14} strokeWidth={2.2} />
        </button>
      ) : null}
    </div>
  );
};
