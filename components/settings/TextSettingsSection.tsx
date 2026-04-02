import React from 'react';
import type { FontPreference, TextScalePreference } from '../../hooks/useUserPreferences';

type TextSettingsSectionProps = {
  fontFamily: FontPreference;
  textScale: TextScalePreference;
  onFontFamilyChange: (value: FontPreference) => void;
  onTextScaleChange: (value: TextScalePreference) => void;
};

const optionButtonClass = (isActive: boolean) =>
  `rounded-xl border px-3 py-2 text-sm transition-colors ${
    isActive
      ? 'border-transparent bg-[var(--accent-active)] text-[var(--accent-active-text)]'
      : 'border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-main)]'
  }`;

export const TextSettingsSection: React.FC<TextSettingsSectionProps> = ({
  fontFamily,
  textScale,
  onFontFamilyChange,
  onTextScaleChange,
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
        <p className="mb-2 text-sm font-medium text-[var(--text-main)]">글자 크기</p>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            aria-pressed={textScale === 'sm'}
            className={optionButtonClass(textScale === 'sm')}
            onClick={() => onTextScaleChange('sm')}
          >
            작게
          </button>
          <button
            type="button"
            aria-pressed={textScale === 'md'}
            className={optionButtonClass(textScale === 'md')}
            onClick={() => onTextScaleChange('md')}
          >
            보통
          </button>
          <button
            type="button"
            aria-pressed={textScale === 'lg'}
            className={optionButtonClass(textScale === 'lg')}
            onClick={() => onTextScaleChange('lg')}
          >
            크게
          </button>
        </div>
      </div>
    </div>
  </section>
);
