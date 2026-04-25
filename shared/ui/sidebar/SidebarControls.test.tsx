import React from 'react';
import { render, screen } from '@testing-library/react';
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
    const confirmButton = screen.getByRole('button', { name: 'Confirm rename' });

    expect(input.parentElement?.className).toContain('flex-col');
    expect(confirmButton.parentElement?.className).toContain('justify-end');
  });
});
