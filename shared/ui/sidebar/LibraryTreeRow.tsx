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
  children,
}) => {
  const paddingLeft = getLibraryTreePaddingLeft(depth);
  const hasChildren = Boolean(item.children?.length);
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
        className={[
          'group my-0.5 flex cursor-pointer select-none items-center rounded-[0.8rem] px-2.5 py-1.5 text-[14px] transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.985]',
          isActive ? activeClassName : inactiveClassName,
          baseClassName,
        ].join(' ')}
        style={{ paddingLeft: `${paddingLeft}px` }}
        title={title}
        aria-label={title}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragLeave={onDragLeave}
        onDragEnd={onDragEnd}
      >
        <span
          className="mr-1.5 flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:text-[var(--text-main)]"
          onClick={(event) => {
            if (hasChildren && onToggle) {
              onToggle(event);
            }
          }}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />
          ) : (
            <span className="inline-block w-[13px]" />
          )}
        </span>

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
