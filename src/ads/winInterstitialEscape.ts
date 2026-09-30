export function bindWinInterstitialEscapeDismiss(
  reason: string,
  dismissButton: HTMLButtonElement,
): () => void {
  if (reason !== 'win') return () => {};

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    dismissButton.click();
  };

  document.addEventListener('keydown', onKeyDown);
  return () => document.removeEventListener('keydown', onKeyDown);
}
