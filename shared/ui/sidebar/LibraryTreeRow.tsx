import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { SidebarItem } from '../../../types';
import { getLibraryTreePaddingLeft } from '../../lib/libraryTree';

interface LibraryTreeRowProps {
  item: SidebarItem;
  depth: number;
  isActive: boolean;
  isExpanded: boolean;
  title: string;
  showBefore?: boolean;
  showAfter?: boolean;
  activeClassName: string;
  inactiveClassName: string;
  indicatorOffset?: number;
  baseClassName?: string;
  onToggle?: (event: React.MouseEvent) => void;
  onClick: () => void;
  onDoubleClick?: (event: React.MouseEvent) => void;
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (event: React.DragEvent<HTMLDivElement>) => void;
  onTouchStart?: (event: React.TouchEvent<HTMLDivElement>) => void;
  onReorderByKeyboard?: (direction: -1 | 1) => void;
  children: React.ReactNode;
}

export const LibraryTreeRow: React.FC<LibraryTreeRowProps> = ({
  item,
  depth,
  isActive,
  isExpanded,
  title,
  showBefore = false,
  showAfter = false,
  activeClassName,
  inactiveClassName,
  indicatorOffset = 22,
  baseClassName = '',
  onToggle,
  onClick,
  onDoubleClick,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragLeave,
  onDragEnd,
  onTouchStart,
  onReorderByKeyboard,
  children,
}) => {
  const paddingLeft = getLibraryTreePaddingLeft(depth);
  const hasChildren = item.type === 'author_folder' || Boolean(item.children?.length);
  const guideOffset = Math.max(paddingLeft - 12, 10);

  return (
    <div className="relative">
      {showBefore && (
        <div
          className="mb-1 h-px rounded-full bg-[var(--accent-border)]"
          style={{ marginLeft: `${paddingLeft + indicatorOffset}px` }}
        />
      )}

      {depth > 0 ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1 top-1 w-px bg-[var(--border-main)]"
          style={{ left: `${guideOffset}px` }}
        />
      ) : null}

      <div
        role="button"
        tabIndex={0}
        className={[
          'group my-0.5 flex cursor-pointer select-none items-center rounded-[0.8rem] px-2.5 py-1.5 text-[14px] transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.985]',
          isActive ? activeClassName : inactiveClassName,
          baseClassName,
        ].join(' ')}
        style={{ paddingLeft: `${paddingLeft}px` }}
        title={title}
        aria-label={title}
        aria-keyshortcuts={onReorderByKeyboard ? 'Alt+ArrowUp Alt+ArrowDown' : undefined}
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown') && onReorderByKeyboard) {
            event.preventDefault();
            onReorderByKeyboard(event.key === 'ArrowUp' ? -1 : 1);
            return;
          }
          if (item.type !== 'book' && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            onClick();
          }
        }}
        onDoubleClick={onDoubleClick}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragLeave={onDragLeave}
        onDragEnd={onDragEnd}
        onTouchStart={onTouchStart}
      >
        {hasChildren ? (
          <button
            type="button"
            className="mr-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-main)]"
            onClick={(event) => onToggle?.(event)}
            aria-label={`${title} ${isExpanded ? '접기' : '펼치기'}`}
            aria-expanded={isExpanded}
          >
            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        ) : (
          <span className="mr-1.5 inline-block w-7 shrink-0" />
        )}

        {children}
      </div>

      {showAfter && (
        <div
          className="mt-1 h-px rounded-full bg-[var(--accent-border)]"
          style={{ marginLeft: `${paddingLeft + indicatorOffset}px` }}
        />
      )}
    </div>
  );
};
