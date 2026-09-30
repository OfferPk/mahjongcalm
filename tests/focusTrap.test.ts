import { describe, expect, it, vi } from 'vitest';
import { keepTabFocus, type FocusTarget, type TabFocusEvent } from '../src/ui/focusTrap';

function target() {
  return { focus: vi.fn() } satisfies FocusTarget;
}

function tabEvent(shiftKey = false) {
  return {
    key: 'Tab',
    shiftKey,
    preventDefault: vi.fn(),
  } satisfies TabFocusEvent;
}

describe('modal keyboard focus', () => {
  it('wraps Tab from the last control to the first', () => {
    const first = target();
    const last = target();
    const event = tabEvent();

    keepTabFocus(event, [first, last], last);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(first.focus).toHaveBeenCalledOnce();
    expect(last.focus).not.toHaveBeenCalled();
  });

  it('wraps Shift+Tab from the first control to the last', () => {
    const first = target();
    const last = target();
    const event = tabEvent(true);

    keepTabFocus(event, [first, last], first);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(last.focus).toHaveBeenCalledOnce();
    expect(first.focus).not.toHaveBeenCalled();
  });

  it('returns focus to the overlay when the active control is outside it', () => {
    const first = target();
    const last = target();
    const background = target();
    const event = tabEvent();

    keepTabFocus(event, [first, last], background);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(first.focus).toHaveBeenCalledOnce();
    expect(background.focus).not.toHaveBeenCalled();
  });

  it('moves forward and backward from the focused dialog panel into its controls', () => {
    const dialog = target();
    const first = target();
    const last = target();
    const forward = tabEvent();
    const backward = tabEvent(true);

    keepTabFocus(forward, [first, last], dialog);
    expect(forward.preventDefault).toHaveBeenCalledOnce();
    expect(first.focus).toHaveBeenCalledOnce();

    keepTabFocus(backward, [first, last], dialog);
    expect(backward.preventDefault).toHaveBeenCalledOnce();
    expect(last.focus).toHaveBeenCalledOnce();
  });

  it('does not intercept ordinary Tab movement or an empty overlay', () => {
    const first = target();
    const middle = target();
    const last = target();
    const event = tabEvent();

    keepTabFocus(event, [first, middle, last], middle);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(first.focus).not.toHaveBeenCalled();
    expect(last.focus).not.toHaveBeenCalled();

    keepTabFocus(event, [], null);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
