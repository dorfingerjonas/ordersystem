/**
 * Prevents pinch- and double-tap-zoom (iOS ignores user-scalable=no in Safari,
 * and installed PWAs must feel like a native app).
 * Combined with `touch-action: manipulation` in styles.scss and >=16px inputs
 * (iOS zooms into smaller inputs on focus).
 */
export function installZoomGuard(): void {
  const prevent = (e: Event) => e.preventDefault();

  // iOS Safari gesture events (pinch)
  document.addEventListener('gesturestart', prevent, { passive: false });
  document.addEventListener('gesturechange', prevent, { passive: false });
  document.addEventListener('gestureend', prevent, { passive: false });

  // multi-touch pinch on other browsers
  document.addEventListener('touchmove', (e: TouchEvent) => {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });

  // ctrl + wheel / trackpad pinch on desktop
  document.addEventListener('wheel', (e: WheelEvent) => {
    if (e.ctrlKey) e.preventDefault();
  }, { passive: false });

  // double-tap zoom is disabled via `touch-action: manipulation` (styles.scss);
  // we deliberately do NOT cancel touchend here – waiters tap product tiles quickly
  // several times in a row and every tap must count.
}
