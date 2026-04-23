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

  return (
    <div>
      {showBefore && (
        <div
          className="h-[2px] mb-0.5 rounded-full bg-[var(--accent)]"
          style={{ marginLeft: `${paddingLeft + indicatorOffset}px` }}
        />
      )}

      <div
        className={[
          'type-label-bounded flex items-center py-1.5 px-2 cursor-pointer select-none rounded-md my-0.5 transition-colors duration-150 group',
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
          className="mr-1 text-[var(--text-muted)] hover:text-[var(--text-main)] p-0.5 rounded cursor-pointer"
          onClick={(event) => {
            if (hasChildren && onToggle) {
              onToggle(event);
            }
          }}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <span className="w-[14px] inline-block" />
          )}
        </span>

        {children}
      </div>

      {showAfter && (
        <div
          className="h-[2px] mt-0.5 rounded-full bg-[var(--accent)]"
          style={{ marginLeft: `${paddingLeft + indicatorOffset}px` }}
        />
      )}
    </div>
  );
};
