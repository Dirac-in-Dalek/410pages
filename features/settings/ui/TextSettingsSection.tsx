import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FONT_OPTIONS, getFontOption } from '../../../lib/fontRegistry';
import type { FontCategory, FontOption } from '../../../lib/fontRegistry';
import type { FontPreference } from '../contract/userPreferences';
import { MAX_BASE_FONT_PT, MIN_BASE_FONT_PT } from '../policy/userPreferences';

type TextSettingsSectionProps = {
  fontFamily: FontPreference;
  baseFontPt: number;
  onFontFamilyChange: (value: FontPreference) => void;
  onBaseFontPtChange: (value: number) => void;
};

const FONT_PT_STEP = 1;

const optionButtonClass = (isActive: boolean) =>
  `ui-btn ui-btn-row ui-choice px-3 py-2 ${
    isActive ? 'text-[var(--text-main)]' : 'text-[var(--text-secondary)]'
  }`;

const FONT_GROUPS: Array<{ category: FontCategory; label: string }> = [
  { category: 'sans', label: '산세리프' },
  { category: 'serif', label: '세리프' },
  { category: 'mono', label: '코딩' },
  { category: 'display', label: '디스플레이' },
];

const GROUPED_FONT_OPTIONS = FONT_GROUPS.map((group) => ({
  ...group,
  options: FONT_OPTIONS.filter((option) => option.category === group.category),
})).filter((group) => group.options.length > 0) as Array<
  { category: FontCategory; label: string; options: readonly FontOption<FontPreference>[] }
>;

type FontSelectionListProps = {
  selectedFontFamily: FontPreference;
  onFontFamilyChange: (value: FontPreference) => void;
};

export const FontSelectionList: React.FC<FontSelectionListProps> = ({
  selectedFontFamily,
  onFontFamilyChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listboxId = useId();
  const selectedOption = useMemo(
    () => getFontOption(selectedFontFamily) ?? FONT_OPTIONS[0],
    [selectedFontFamily]
  );

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        window.requestAnimationFrame(() => triggerRef.current?.focus());
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative min-w-0 w-full max-w-[15rem]">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`현재 서체: ${selectedOption.label}`}
        aria-expanded={isOpen}
        aria-controls={listboxId}
        className="ui-btn ui-btn--ghost ui-btn-row min-h-11 px-2 sm:min-h-10"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="block min-w-0 truncate" style={{ fontFamily: selectedOption.fontFamily }}>
          {selectedOption.label}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen ? (
        <div
          id={listboxId}
          role="group"
          aria-label="서체 선택"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-20 max-h-64 w-[min(18rem,calc(100vw-2.5rem))] overflow-y-auto rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-1 shadow-[var(--shadow-panel)]"
        >
          {GROUPED_FONT_OPTIONS.map((group) => (
            <div key={group.category} role="presentation" className="py-1 first:pt-0 last:pb-0">
              <div className="px-3 py-1 text-[0.72rem] font-semibold text-[var(--text-muted)]">
                {group.label}
              </div>
              {group.options.map((option) => {
                const isActive = option.id === selectedFontFamily;

                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={isActive}
                    className={`${optionButtonClass(isActive)} flex w-full items-center justify-start text-left`}
                    onClick={() => {
                      onFontFamilyChange(option.id);
                      setIsOpen(false);
                      window.requestAnimationFrame(() => triggerRef.current?.focus());
                    }}
                  >
                    <span className="block w-full truncate" style={{ fontFamily: option.fontFamily }}>
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export const TextSettingsSection: React.FC<TextSettingsSectionProps> = ({
  fontFamily,
  baseFontPt,
  onFontFamilyChange,
  onBaseFontPtChange,
}) => {
  const fontSizeId = useId();

  return (
    <section>
      <h3 className="ui-label mb-2 px-1 font-semibold text-[var(--text-muted)]">읽기</h3>

      <div className="divide-y divide-[var(--border-main)] rounded-xl bg-[var(--bg-sidebar)] px-1">
        <div className="flex min-h-14 items-center justify-between gap-4 px-3">
          <p className="ui-label shrink-0 whitespace-nowrap">서체</p>
          <FontSelectionList selectedFontFamily={fontFamily} onFontFamilyChange={onFontFamilyChange} />
        </div>

        <div className="px-3 py-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor={fontSizeId} className="ui-label shrink-0 whitespace-nowrap">
              글자 크기
            </label>
            <output
              htmlFor={fontSizeId}
              aria-live="polite"
              className="ui-label tabular-nums text-[var(--text-muted)]"
            >
              {baseFontPt}pt
            </output>
          </div>

          <input
            id={fontSizeId}
            type="range"
            min={MIN_BASE_FONT_PT}
            max={MAX_BASE_FONT_PT}
            step={FONT_PT_STEP}
            value={baseFontPt}
            aria-valuetext={`${baseFontPt}포인트`}
            className="mt-1 h-11 w-full cursor-pointer accent-[var(--accent)] sm:h-10"
            onChange={(event) => onBaseFontPtChange(Number(event.currentTarget.value))}
          />
        </div>
      </div>
    </section>
  );
};
