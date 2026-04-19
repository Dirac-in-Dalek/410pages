import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FONT_OPTIONS, getFontOption, type FontPreference } from '../../lib/fontRegistry';

type TextSettingsSectionProps = {
  fontFamily: FontPreference;
  baseFontPt: number;
  onFontFamilyChange: (value: FontPreference) => void;
  onBaseFontPtChange: (value: number) => void;
};

const optionButtonClass = (isActive: boolean) =>
  `type-label-bounded rounded-lg border px-3 py-1.5 transition-colors ${
    isActive
      ? 'border-transparent bg-[var(--accent-active)] text-[var(--accent-active-text)]'
      : 'border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-main)]'
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
        className="type-label-bounded flex w-full items-center justify-between rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] px-4 py-3 text-left text-[var(--text-main)] shadow-[var(--shadow-card)] transition-colors hover:bg-[var(--sidebar-hover)]"
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
                <span className="type-label-bounded block w-full truncate" style={{ fontFamily: option.fontFamily }}>
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
  onFontFamilyChange,
  onBaseFontPtChange,
}) => (
  <section className="mb-8">
    <h3 className="type-section mb-3 font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
      텍스트
    </h3>

    <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-sidebar)] p-4 shadow-[var(--shadow-card)]">
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="type-label min-w-0 font-medium text-[var(--text-main)]">서체</p>
        <FontSelectionList selectedFontFamily={fontFamily} onFontFamilyChange={onFontFamilyChange} />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label htmlFor="base-font-pt" className="type-label-bounded font-medium text-[var(--text-main)]">
            글자 크기
          </label>
          <span aria-live="polite" className="type-label-bounded font-medium text-[var(--text-secondary)]">
            {baseFontPt}pt
          </span>
        </div>
        <input
          id="base-font-pt"
          type="range"
          min={10}
          max={40}
          step={1}
          value={baseFontPt}
          aria-valuetext={`${baseFontPt}pt`}
          className="w-full accent-[var(--accent)]"
          onChange={(event) => onBaseFontPtChange(Number(event.currentTarget.value))}
        />
        <div className="type-body-muted mt-2 flex justify-between text-[var(--text-secondary)]">
          <span>10pt</span>
          <span>40pt</span>
        </div>
      </div>
    </div>
  </section>
);
