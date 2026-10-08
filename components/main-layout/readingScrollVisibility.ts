const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

export function attachReadingScrollVisibility(element: HTMLElement, hideAfter = 700) {
  let armed = false;
  let timer: number | undefined;
  const hide = () => {
    armed = false;
    element.removeAttribute('data-scrolling');
    timer = undefined;
  };
  const arm = () => {
    armed = true;
    if (timer !== undefined) window.clearTimeout(timer);
    timer = window.setTimeout(hide, hideAfter);
  };
  const armKeyboard = (event: KeyboardEvent) => { if (SCROLL_KEYS.has(event.key)) arm(); };
  const showAfterScroll = () => {
    if (!armed && !element.hasAttribute('data-scrolling')) return;
    element.setAttribute('data-scrolling', 'true');
    if (timer !== undefined) window.clearTimeout(timer);
    timer = window.setTimeout(hide, hideAfter);
  };
  element.addEventListener('wheel', arm, { passive: true });
  element.addEventListener('touchstart', arm, { passive: true });
  element.addEventListener('pointerdown', arm);
  element.addEventListener('keydown', armKeyboard);
  element.addEventListener('scroll', showAfterScroll, { passive: true });
  return () => {
    if (timer !== undefined) window.clearTimeout(timer);
    element.removeEventListener('wheel', arm);
    element.removeEventListener('touchstart', arm);
    element.removeEventListener('pointerdown', arm);
    element.removeEventListener('keydown', armKeyboard);
    element.removeEventListener('scroll', showAfterScroll);
    element.removeAttribute('data-scrolling');
  };
}
