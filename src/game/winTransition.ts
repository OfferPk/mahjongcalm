export async function showWinAfterInterstitial(
  showInterstitial: () => Promise<unknown>,
  revealWin: () => void,
): Promise<void> {
  try {
    await showInterstitial();
  } catch {
    // The player must still be able to continue if an interstitial fails.
  }
  revealWin();
}
