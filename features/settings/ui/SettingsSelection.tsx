import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

type SelectionOption<Value extends string> = { id: Value; label: string };
type SelectionGroup<Value extends string> = {
  label: string;
  options: readonly SelectionOption<Value>[];
};

type SettingsSelectionProps<Value extends string> = {
  label: string;
  value: Value;
  groups: readonly SelectionGroup<Value>[];
  onChange: (value: Value) => void;
  renderOption: (option: SelectionOption<Value>) => React.ReactNode;
};

export function SettingsSelection<Value extends string>({
  label, value, groups, onChange, renderOption,
}: SettingsSelectionProps<Value>) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedValue, setFocusedValue] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef(new Map<Value, HTMLButtonElement>());
  const listId = useId();
  const options = useMemo(() => groups.flatMap(group => group.options), [groups]);
  const selectedOption = options.find(option => option.id === value) ?? options[0];

  useLayoutEffect(() => {
    if (isOpen) {
      listRef.current?.scrollIntoView?.({ block: 'nearest' });
      const option = optionRefs.current.get(focusedValue);
      option?.focus({ preventScroll: true });
      option?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [focusedValue, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        window.requestAnimationFrame(() => {
          if (document.activeElement === document.body) triggerRef.current?.focus();
        });
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  const open = () => {
    setFocusedValue(selectedOption.id);
    setIsOpen(true);
  };
  const close = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div
      ref={wrapperRef}
      className="min-w-0"
      onBlur={event => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
      }}
      onKeyDown={event => {
        if (event.key === 'Escape' && isOpen) {
          event.preventDefault();
          event.stopPropagation();
          close();
          return;
        }
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        if (event.target === triggerRef.current) {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            open();
          }
          return;
        }
        if (!isOpen) return;
        event.preventDefault();
        const index = options.findIndex(option => optionRefs.current.get(option.id) === event.target);
        const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
          : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
        setFocusedValue(options[nextIndex].id);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={`현재 ${label}: ${selectedOption.label}`}
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        className="settings-selection-trigger settings-value-row ui-btn ui-btn-row ui-btn--ghost min-h-14 gap-3 rounded-lg px-3 py-3 text-left"
        onClick={() => isOpen ? close() : open()}
      >
        <span className="ui-label shrink-0">{label}</span>
        <span className="flex min-w-0 flex-1 items-center justify-end gap-2 text-[var(--text-secondary)]">
          {renderOption(selectedOption)}
        </span>
        <ChevronDown size={16} aria-hidden="true" className={`shrink-0 text-[var(--text-muted)] transition-transform motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen ? (
        <div
          ref={listRef}
          id={listId}
          role="group"
          aria-label={`${label} 선택`}
          aria-describedby={`${listId}-help`}
          className="mx-1 mb-2 max-h-[min(16rem,calc(100dvh-10rem))] overflow-y-auto overscroll-contain rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-1"
        >
          <p id={`${listId}-help`} className="sr-only">위아래 방향키로 이동하고 Enter로 선택하세요. Escape로 목록을 닫습니다.</p>
          {groups.map(group => (
            <div key={group.label} className="py-1 first:pt-0 last:pb-0">
              <p className="px-3 pb-1 pt-2 text-xs font-semibold text-[var(--text-muted)]">{group.label}</p>
              {group.options.map(option => (
                <button
                  key={option.id}
                  ref={element => {
                    if (element) optionRefs.current.set(option.id, element);
                    else optionRefs.current.delete(option.id);
                  }}
                  type="button"
                  aria-label={option.label}
                  aria-pressed={option.id === value}
                  tabIndex={option.id === focusedValue ? 0 : -1}
                  className="settings-selection-option ui-btn ui-choice min-h-11 gap-3 rounded-lg px-3 py-2 text-left"
                  onFocus={() => setFocusedValue(option.id)}
                  onClick={() => { onChange(option.id); close(); }}
                >
                  <span className="flex min-w-0 items-center gap-2">{renderOption(option)}</span>
                  <Check size={16} aria-hidden="true" className={`shrink-0 ${option.id === value ? 'text-[var(--text-main)]' : 'invisible'}`} />
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
