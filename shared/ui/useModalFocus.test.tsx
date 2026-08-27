import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { useModalFocus } from './useModalFocus';

const Modal = ({ onClose }: { onClose: () => void }) => {
  const ref = useModalFocus<HTMLDivElement>(true, onClose);
  return (
    <div ref={ref} role="dialog" aria-modal="true">
      <button type="button" autoFocus>안쪽 버튼</button>
    </div>
  );
};

const Harness = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>열기</button>
      {isOpen ? <Modal onClose={() => setIsOpen(false)} /> : null}
    </>
  );
};

const SavingModal = () => {
  const [isSaving, setIsSaving] = useState(false);
  const ref = useModalFocus<HTMLDivElement>(true, () => undefined);
  return (
    <div ref={ref} role="dialog" aria-modal="true">
      <button type="button" disabled={isSaving} onClick={() => setIsSaving(true)}>저장</button>
      <button type="button" tabIndex={-1} aria-hidden="true">포인터 전용</button>
      <button type="button">취소</button>
    </div>
  );
};

describe('useModalFocus', () => {
  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const trigger = screen.getByRole('button', { name: '열기' });
    await user.click(trigger);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '안쪽 버튼' }));

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('recovers focus when the active control becomes disabled', async () => {
    const user = userEvent.setup();
    render(<SavingModal />);
    const save = screen.getByRole('button', { name: '저장' });

    await waitFor(() => expect(document.activeElement).toBe(save));
    await user.click(save);
    await user.tab();

    expect(document.activeElement).toBe(screen.getByRole('button', { name: '취소' }));
  });
});
