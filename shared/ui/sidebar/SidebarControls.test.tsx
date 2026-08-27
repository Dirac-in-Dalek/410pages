import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EditorialInlineRenameField } from './SidebarControls';

describe('EditorialInlineRenameField', () => {
  it('can place rename actions below the input', () => {
    render(
      <EditorialInlineRenameField
        value="Morgan Housel"
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        actionsPlacement="below"
      />
    );

    const input = screen.getByDisplayValue('Morgan Housel');
    const confirmButton = screen.getByRole('button', { name: '이름 변경 확인' });

    expect(input.parentElement?.className).toContain('flex-col');
    expect(confirmButton.parentElement?.className).toContain('justify-end');
  });

  it('does not submit a rename while IME composition is active', () => {
    const onSubmit = vi.fn();
    render(
      <EditorialInlineRenameField
        value="한"
        onChange={vi.fn()}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    );

    const input = screen.getByDisplayValue('한');
    const keyDownEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(keyDownEvent, 'isComposing', {
      configurable: true,
      value: true,
    });
    fireEvent(input, keyDownEvent);

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
