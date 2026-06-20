// Keyboard input: tracks held keys (for continuous driving) and exposes a
// small "just pressed" queue for one-shot actions (camera switch, lights, ...).

export class Keyboard {
  constructor() {
    this.held = new Set();
    this._justPressed = new Set();
    this.onTap = new Map(); // code -> callback, fired once per keydown

    window.addEventListener('keydown', (e) => {
      // Don't hijack browser shortcuts (Ctrl/Cmd/Alt combos).
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (!this.held.has(e.code)) {
        this._justPressed.add(e.code);
        const cb = this.onTap.get(e.code);
        if (cb) cb();
      }
      this.held.add(e.code);
      // Stop arrows/space from scrolling the page.
      if (DRIVING_KEYS.has(e.code)) e.preventDefault();
    });

    window.addEventListener('keyup', (e) => this.held.delete(e.code));
    window.addEventListener('blur', () => this.held.clear());
  }

  /** True while the key is down. Accepts several codes (OR). */
  down(...codes) {
    return codes.some((c) => this.held.has(c));
  }

  /** Register a one-shot handler for a key (fires on each fresh press). */
  tap(code, callback) {
    this.onTap.set(code, callback);
  }
}

const DRIVING_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
]);
