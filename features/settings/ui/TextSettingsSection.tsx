import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FONT_OPTIONS, getFontOption } from '../../../lib/fontRegistry';
import type { FontCategory, FontOption } from '../../../lib/fontRegistry';
import type { FontPreference } from '../contract/userPreferences';

type TextSettingsSectionProps = {
  fontFamily: FontPreference;
  baseFontPt: number;
  citationWidthRem: number;
  onFontFamilyChange: (value: FontPreference) => void;
  onBaseFontPtChange: (value: number) => void;
  onCitationWidthRemChange: (value: number) => void;
};

const MIN_FONT_PT = 10;
const MAX_FONT_PT = 40;
const FONT_PT_STEP = 1;
const MIN_CITATION_WIDTH_REM = 35;
const MAX_CITATION_WIDTH_REM = 50;
const CITATION_WIDTH_STEP_REM = 1;

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

type SettingsStepperProps = {
  label: string;
  value: string;
  decreaseDisabled: boolean;
  increaseDisabled: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
};

const SettingsStepper: React.FC<SettingsStepperProps> = ({
  label,
  value,
  decreaseDisabled,
  increaseDisabled,
  onDecrease,
  onIncrease,
}) => (
  <div role="group" aria-label={`${label} 조절`} className="inline-flex shrink-0 items-center rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)]">
    <button
      type="button"
      aria-label={`${label} 줄이기`}
      className="ui-btn ui-btn--ghost h-11 min-h-11 w-11 rounded-lg border-0 p-0 sm:h-10 sm:min-h-10 sm:w-10"
      disabled={decreaseDisabled}
      onClick={onDecrease}
    >
      <span aria-hidden="true">−</span>
    </button>
    <span
      role="status"
      aria-label={`현재 ${label}`}
      aria-live="polite"
      className="ui-label min-w-[3.75rem] text-center tabular-nums text-[var(--text-main)]"
    >
      {value}
    </span>
    <button
      type="button"
      aria-label={`${label} 늘리기`}
      className="ui-btn ui-btn--ghost h-11 min-h-11 w-11 rounded-lg border-0 p-0 sm:h-10 sm:min-h-10 sm:w-10"
      disabled={increaseDisabled}
      onClick={onIncrease}
    >
      <span aria-hidden="true">+</span>
    </button>
  </div>
);

export const TextSettingsSection: React.FC<TextSettingsSectionProps> = ({
  fontFamily,
  baseFontPt,
  citationWidthRem,
  onFontFamilyChange,
  onBaseFontPtChange,
  onCitationWidthRemChange,
}) => {
  const updateFontSize = (delta: number) => {
    const nextValue = Math.min(MAX_FONT_PT, Math.max(MIN_FONT_PT, baseFontPt + delta));
    if (nextValue !== baseFontPt) {
      onBaseFontPtChange(nextValue);
    }
  };

  const updateCitationWidth = (delta: number) => {
    const nextValue = Math.min(
      MAX_CITATION_WIDTH_REM,
      Math.max(MIN_CITATION_WIDTH_REM, citationWidthRem + delta)
    );
    if (nextValue !== citationWidthRem) {
      onCitationWidthRemChange(nextValue);
    }
  };

  return (
    <section>
      <h3 className="ui-label mb-2 px-1 font-semibold text-[var(--text-muted)]">읽기</h3>

      <div className="divide-y divide-[var(--border-main)] rounded-xl bg-[var(--bg-sidebar)] px-1">
        <div className="flex min-h-14 items-center justify-between gap-4 px-3">
          <p className="ui-label shrink-0 whitespace-nowrap">서체</p>
          <FontSelectionList selectedFontFamily={fontFamily} onFontFamilyChange={onFontFamilyChange} />
        </div>

        <div className="flex min-h-14 items-center justify-between gap-3 px-3">
          <span className="ui-label shrink-0 whitespace-nowrap">글자 크기</span>
          <SettingsStepper
            label="글자 크기"
            value={`${baseFontPt}pt`}
            decreaseDisabled={baseFontPt <= MIN_FONT_PT}
            increaseDisabled={baseFontPt >= MAX_FONT_PT}
            onDecrease={() => updateFontSize(-FONT_PT_STEP)}
            onIncrease={() => updateFontSize(FONT_PT_STEP)}
          />
        </div>

        <div className="flex min-h-14 items-center justify-between gap-3 px-3">
          <span className="ui-label shrink-0 whitespace-nowrap">인용구 너비</span>
          <SettingsStepper
            label="인용구 너비"
            value={`${citationWidthRem}rem`}
            decreaseDisabled={citationWidthRem <= MIN_CITATION_WIDTH_REM}
            increaseDisabled={citationWidthRem >= MAX_CITATION_WIDTH_REM}
            onDecrease={() => updateCitationWidth(-CITATION_WIDTH_STEP_REM)}
            onIncrease={() => updateCitationWidth(CITATION_WIDTH_STEP_REM)}
          />
        </div>
      </div>
    </section>
  );
};
