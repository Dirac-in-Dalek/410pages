import React from 'react';
import type { FontPreference } from '../../hooks/useUserPreferences';

type TextSettingsSectionProps = {
  fontFamily: FontPreference;
  baseFontPt: number;
  onFontFamilyChange: (value: FontPreference) => void;
  onBaseFontPtChange: (value: number) => void;
};

const optionButtonClass = (isActive: boolean) =>
  `rounded-xl border px-3 py-2 text-sm transition-colors ${
    isActive
      ? 'border-transparent bg-[var(--accent-active)] text-[var(--accent-active-text)]'
      : 'border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-main)]'
  }`;

export const TextSettingsSection: React.FC<TextSettingsSectionProps> = ({
  fontFamily,
  baseFontPt,
  onFontFamilyChange,
  onBaseFontPtChange,
}) => (
  <section className="mb-8">
    <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
      텍스트
    </h3>

    <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-main)] p-4 shadow-sm">
      <div className="mb-5">
        <p className="mb-2 text-sm font-medium text-[var(--text-main)]">서체</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={fontFamily === 'pretendard'}
            className={optionButtonClass(fontFamily === 'pretendard')}
            onClick={() => onFontFamilyChange('pretendard')}
          >
            프리텐다드
          </button>
          <button
            type="button"
            aria-pressed={fontFamily === 'serif'}
            className={optionButtonClass(fontFamily === 'serif')}
            onClick={() => onFontFamilyChange('serif')}
          >
            명조
          </button>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label htmlFor="base-font-pt" className="text-sm font-medium text-[var(--text-main)]">
            글자 크기
          </label>
          <span aria-live="polite" className="text-sm font-medium text-[var(--text-secondary)]">
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
        <div className="mt-2 flex justify-between text-xs text-[var(--text-secondary)]">
          <span>10pt</span>
          <span>40pt</span>
        </div>
      </div>
    </div>
  </section>
);
