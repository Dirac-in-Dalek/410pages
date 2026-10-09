import React, { useId } from 'react';
import { FONT_OPTIONS, getFontOption } from '../../../lib/fontRegistry';
import type { FontCategory } from '../../../lib/fontRegistry';
import type { FontPreference } from '../contract/userPreferences';
import { MAX_BASE_FONT_PT, MIN_BASE_FONT_PT } from '../policy/userPreferences';
import { SettingsSelection } from './SettingsSelection';

type TextSettingsSectionProps = {
  fontFamily: FontPreference;
  baseFontPt: number;
  onFontFamilyChange: (value: FontPreference) => void;
  onBaseFontPtChange: (value: number) => void;
};

const FONT_GROUPS: Array<{ category: FontCategory; label: string }> = [
  { category: 'sans', label: '산세리프' },
  { category: 'serif', label: '세리프' },
  { category: 'mono', label: '코딩' },
  { category: 'display', label: '디스플레이' },
];
const GROUPED_FONT_OPTIONS = FONT_GROUPS.map(group => ({
  label: group.label,
  options: FONT_OPTIONS.filter(option => option.category === group.category),
}));

export const FontSelectionList: React.FC<{
  selectedFontFamily: FontPreference;
  onFontFamilyChange: (value: FontPreference) => void;
}> = ({ selectedFontFamily, onFontFamilyChange }) => (
  <SettingsSelection
    label="서체"
    value={selectedFontFamily}
    groups={GROUPED_FONT_OPTIONS}
    onChange={onFontFamilyChange}
    renderOption={option => (
      <span className="min-w-0 truncate" style={{ fontFamily: getFontOption(option.id)?.fontFamily }}>{option.label}</span>
    )}
  />
);

export const TextSettingsSection: React.FC<TextSettingsSectionProps> = ({
  fontFamily, baseFontPt, onFontFamilyChange, onBaseFontPtChange,
}) => {
  const titleId = useId();
  const fontSizeId = useId();
  return (
    <section aria-labelledby={titleId}>
      <h3 id={titleId} className="ui-label mb-2 px-1 font-semibold text-[var(--text-muted)]">읽기</h3>
      <div className="divide-y divide-[var(--border-main)] rounded-xl bg-[var(--bg-main)] px-1">
        <FontSelectionList selectedFontFamily={fontFamily} onFontFamilyChange={onFontFamilyChange} />
        <div className="px-3 pb-2 pt-3">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor={fontSizeId} className="ui-label">글자 크기</label>
            <output htmlFor={fontSizeId} aria-live="polite" className="ui-label min-w-12 text-right tabular-nums text-[var(--text-secondary)]">{baseFontPt}pt</output>
          </div>
          <input
            id={fontSizeId}
            type="range"
            min={MIN_BASE_FONT_PT}
            max={MAX_BASE_FONT_PT}
            step={1}
            value={baseFontPt}
            aria-valuetext={`${baseFontPt}포인트`}
            className="mt-1 h-11 w-full cursor-pointer accent-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
            onChange={event => onBaseFontPtChange(Number(event.currentTarget.value))}
          />
          <div aria-hidden="true" className="flex justify-between text-xs tabular-nums text-[var(--text-muted)]"><span>{MIN_BASE_FONT_PT}pt</span><span>{MAX_BASE_FONT_PT}pt</span></div>
        </div>
      </div>
    </section>
  );
};
