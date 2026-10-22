import { useEffect, useRef } from 'react';

const modalStack: symbol[] = [];
const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

type ModalFocusOptions = {
  initialFocus?: () => HTMLElement | null;
  returnFocusFallback?: () => HTMLElement | null;
  keyboardPhase?: 'capture' | 'bubble';
  focusTiming?: 'microtask' | 'frame';
};

export const useModalFocus = <T extends HTMLElement>(
  isOpen: boolean,
  onEscape: () => void,
  options: ModalFocusOptions = {}
) => {
  const containerRef = useRef<T>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const tokenRef = useRef(Symbol('modal'));
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const keyboardPhase = options.keyboardPhase ?? 'capture';
  const focusTiming = options.focusTiming ?? 'microtask';

  if (isOpen && !wasOpenRef.current && typeof document !== 'undefined') {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }
  wasOpenRef.current = isOpen;

  useEffect(() => {
    if (!isOpen) return;
    const token = tokenRef.current;
    modalStack.push(token);

    let active = true;
    const focusInitialControl = () => {
      const container = containerRef.current;
      if (!active || !container || container.contains(document.activeElement)) return;
      const first =
        optionsRef.current.initialFocus?.() ?? container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (first ?? container).focus();
    };
    const frame = focusTiming === 'frame' ? window.requestAnimationFrame(focusInitialControl) : null;
    if (frame === null) queueMicrotask(focusInitialControl);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== token) return;
      if (event.defaultPrevented) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        const closeFormatting =
          containerRef.current?.querySelector<HTMLButtonElement>('[data-text-format-close]');
        if (closeFormatting) {
          closeFormatting.click();
          return;
        }
        onEscapeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusableCandidates: HTMLElement[] = (
        containerRef.current
          ? Array.from(containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
          : []
      ) as HTMLElement[];
      const focusable = focusableCandidates.filter((element) => {
        const style = window.getComputedStyle(element);
        return (
          element.tabIndex >= 0 &&
          element.getAttribute('aria-hidden') !== 'true' &&
          style.display !== 'none' &&
          style.visibility !== 'hidden'
        );
      });
      if (focusable.length === 0) {
        event.preventDefault();
        containerRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!focusable.includes(document.activeElement as HTMLElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const capture = keyboardPhase === 'capture';
    window.addEventListener('keydown', handleKeyDown, capture);
    return () => {
      active = false;
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', handleKeyDown, capture);
      const index = modalStack.lastIndexOf(token);
      if (index >= 0) modalStack.splice(index, 1);
      const returnTarget = returnFocusRef.current;
      queueMicrotask(() => {
        if (returnTarget?.isConnected && returnTarget !== document.body) {
          returnTarget.focus();
          if (document.activeElement === returnTarget) return;
        }
        optionsRef.current.returnFocusFallback?.()?.focus();
      });
    };
  }, [focusTiming, isOpen, keyboardPhase]);

  return containerRef;
};
