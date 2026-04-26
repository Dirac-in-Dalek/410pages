import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FONT_OPTIONS, getFontOption } from '../../../lib/fontRegistry';
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
    <div ref={containerRef} className="relative w-full max-w-[18rem]">
      <button
        type="button"
        aria-label={`현재 서체: ${selectedOption.label}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        className="ui-btn ui-btn-row px-4 py-3 shadow-[var(--shadow-card)]"
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
          role="listbox"
          aria-label="서체 목록"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-20 max-h-64 w-full overflow-y-auto rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-1 shadow-[var(--shadow-panel)]"
        >
          {FONT_OPTIONS.map((option) => {
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
                }}
              >
                <span className="block w-full truncate" style={{ fontFamily: option.fontFamily }}>
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

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
    <section className="mb-8">
      <h3 className="ui-label mb-3 font-semibold text-[var(--text-muted)]">텍스트</h3>

      <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-sidebar)] p-4 shadow-[var(--shadow-card)]">
        <div className="mb-5 flex items-center justify-between gap-4">
          <p className="ui-label shrink-0 whitespace-nowrap">서체</p>
          <FontSelectionList selectedFontFamily={fontFamily} onFontFamilyChange={onFontFamilyChange} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="ui-label shrink-0 whitespace-nowrap">글자 크기</span>
            <div className="flex items-center gap-2">
              <span
                role="status"
                aria-label="현재 글자 크기"
                aria-live="polite"
                className="ui-label tabular-nums text-[var(--text-main)]"
              >
                {baseFontPt}pt
              </span>
              <button
                type="button"
                aria-label="글자 크기 늘리기"
                className="ui-btn ui-btn-icon"
                disabled={baseFontPt >= MAX_FONT_PT}
                onClick={() => updateFontSize(FONT_PT_STEP)}
              >
                <span aria-hidden="true">+</span>
              </button>
              <button
                type="button"
                aria-label="글자 크기 줄이기"
                className="ui-btn ui-btn-icon"
                disabled={baseFontPt <= MIN_FONT_PT}
                onClick={() => updateFontSize(-FONT_PT_STEP)}
              >
                <span aria-hidden="true">−</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="ui-label shrink-0 whitespace-nowrap">인용구 너비</span>
            <div className="flex items-center gap-2">
              <span
                role="status"
                aria-label="현재 인용구 너비"
                aria-live="polite"
                className="ui-label tabular-nums text-[var(--text-main)]"
              >
                {citationWidthRem}rem
              </span>
              <button
                type="button"
                aria-label="인용구 너비 늘리기"
                className="ui-btn ui-btn-icon"
                disabled={citationWidthRem >= MAX_CITATION_WIDTH_REM}
                onClick={() => updateCitationWidth(CITATION_WIDTH_STEP_REM)}
              >
                <span aria-hidden="true">+</span>
              </button>
              <button
                type="button"
                aria-label="인용구 너비 줄이기"
                className="ui-btn ui-btn-icon"
                disabled={citationWidthRem <= MIN_CITATION_WIDTH_REM}
                onClick={() => updateCitationWidth(-CITATION_WIDTH_STEP_REM)}
              >
                <span aria-hidden="true">−</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
