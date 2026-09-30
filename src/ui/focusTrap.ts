export interface FocusTarget {
  focus(): void;
}

export interface TabFocusEvent {
  key: string;
  shiftKey: boolean;
  preventDefault(): void;
}

export function keepTabFocus(
  event: TabFocusEvent,
  focusables: readonly FocusTarget[],
  activeElement: FocusTarget | null,
): void {
  if (event.key !== 'Tab' || focusables.length === 0) return;

  const first = focusables[0]!;
  const last = focusables[focusables.length - 1]!;
  const activeIndex = activeElement ? focusables.indexOf(activeElement) : -1;
  let next: FocusTarget | undefined;

  if (activeIndex === -1) {
    next = event.shiftKey ? last : first;
  } else if (event.shiftKey && activeIndex === 0) {
    next = last;
  } else if (!event.shiftKey && activeIndex === focusables.length - 1) {
    next = first;
  }

  if (!next) return;
  event.preventDefault();
  next.focus();
}

export function activateOverlayFocus(
  dialog: HTMLElement,
): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    const buttons = Array.from(
      dialog.querySelectorAll<HTMLButtonElement>('button:not([disabled])'),
    );
    keepTabFocus(
      event,
      buttons,
      document.activeElement as HTMLElement | null,
    );
  };

  document.addEventListener('keydown', onKeyDown, true);
  dialog.focus({ preventScroll: true });
  const initialFocusFrame = window.requestAnimationFrame(() => {
    if (
      dialog.isConnected &&
      !dialog.closest('[hidden]') &&
      !dialog.contains(document.activeElement)
    ) {
      dialog.focus({ preventScroll: true });
    }
  });
  return () => {
    window.cancelAnimationFrame(initialFocusFrame);
    document.removeEventListener('keydown', onKeyDown, true);
  };
}
