export type Tone = 'info' | 'good' | 'warn' | 'bad';

const MAX_VISIBLE = 4;

/** Short messages at the top centre that leave on their own. */
export class Toasts {
  private readonly root = document.createElement('div');

  constructor(parent: HTMLElement) {
    this.root.className = 'toasts';
    this.root.setAttribute('role', 'status');
    this.root.setAttribute('aria-live', 'polite');
    parent.append(this.root);
  }

  show(text: string, tone: Tone = 'info', ms = 2400): void {
    const toast = document.createElement('div');
    toast.className = `toast is-${tone}`;
    toast.textContent = text;
    this.root.prepend(toast);
    while (this.root.children.length > MAX_VISIBLE) this.root.lastElementChild?.remove();
    window.setTimeout(() => {
      toast.classList.add('is-leaving');
      window.setTimeout(() => toast.remove(), 200);
    }, ms);
  }
}
