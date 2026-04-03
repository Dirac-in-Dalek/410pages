import React from 'react';
import { FONT_OPTIONS, type FontPreference } from '../../lib/fontRegistry';

type TextSettingsSectionProps = {
  fontFamily: FontPreference;
  baseFontPt: number;
  onFontFamilyChange: (value: FontPreference) => void;
  onBaseFontPtChange: (value: number) => void;
};

const optionButtonClass = (isActive: boolean) =>
  `type-label-bounded rounded-xl border px-3 py-2 transition-colors ${
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
}) => (
  <div className="max-h-64 overflow-y-auto rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-1">
    {FONT_OPTIONS.map((option) => {
      const isActive = option.id === selectedFontFamily;

      return (
        <button
          key={option.id}
          type="button"
          aria-pressed={isActive}
          className={`${optionButtonClass(isActive)} flex w-full items-center justify-start text-left`}
          onClick={() => onFontFamilyChange(option.id)}
        >
          <span className="type-label-bounded block w-full truncate" style={{ fontFamily: option.fontFamily }}>
            {option.label}
          </span>
        </button>
      );
    })}
  </div>
);

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

    <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-main)] p-4 shadow-sm">
      <div className="mb-5">
        <p className="type-label mb-2 font-medium text-[var(--text-main)]">서체</p>
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
