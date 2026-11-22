import { afterNextRender, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';

/**
 * Shrinks the font size of the host element until its text no longer overflows its box
 * (width, and height for line-clamped text). The CSS font size is the maximum.
 * The host must have a constrained size and `overflow: hidden` for overflow to be measurable.
 */
@Directive({
  selector: '[appFitText]'
})
export class FitTextDirective {

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** smallest font size in px the text may shrink to */
  public readonly minFontSize = input(10);

  private readonly destroyRef = inject(DestroyRef);
  private frame = 0;

  public constructor() {
    afterNextRender(() => {
      const resize = new ResizeObserver(() => this.schedule());
      resize.observe(this.el);

      const mutation = new MutationObserver(() => this.schedule());
      mutation.observe(this.el, { childList: true, characterData: true, subtree: true });

      document.fonts?.ready.then(() => this.schedule());
      this.fit();

      this.destroyRef.onDestroy(() => {
        resize.disconnect();
        mutation.disconnect();
        cancelAnimationFrame(this.frame);
      });
    });
  }

  private schedule(): void {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.fit());
  }

  private overflows(): boolean {
    return this.el.scrollWidth > this.el.clientWidth + 1 || this.el.scrollHeight > this.el.clientHeight + 1;
  }

  private fit(): void {
    const el = this.el;
    el.style.fontSize = '';
    el.style.overflowWrap = '';
    if (!el.isConnected || el.clientWidth === 0 || !this.overflows()) return;

    const max = parseFloat(getComputedStyle(el).fontSize);
    const min = Math.min(this.minFontSize(), max);
    let size = max;

    while (size > min && this.overflows()) {
      size = Math.max(min, size - 1);
      el.style.fontSize = `${ size }px`;
    }

    // still too long at the minimum size: allow breaking inside words as a last resort
    if (this.overflows()) el.style.overflowWrap = 'anywhere';
  }
}
