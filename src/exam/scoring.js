// Examiner scoring engine: accumulates penalty points, keeps an ordered event
// log, and fails the exam the moment a critical (100-pt) error fires or the
// running total reaches 100. Pass/fail is decided in finish().

export const FAIL_THRESHOLD = 100;

export class Scoring {
  constructor() { this.reset(); }

  reset() {
    this.total = 0;
    this.log = [];                 // { t, exercise, rule, points }
    this.status = 'running';       // 'running' | 'passed' | 'failed'
    this.failReason = null;
    this.lastViolation = null;
    this._once = new Set();
  }

  get isOver() { return this.status !== 'running'; }

  /** Record a penalty. `points` of 100 is an immediate fail. */
  penalize(exercise, rule, points, t = 0) {
    if (this.isOver) return;
    this.total += points;
    const entry = { t, exercise, rule, points };
    this.log.push(entry);
    this.lastViolation = entry;
    if (points >= FAIL_THRESHOLD || this.total >= FAIL_THRESHOLD) {
      this.status = 'failed';
      this.failReason = rule;
    }
  }

  /** Penalize at most once per unique key (for one-shot rules). */
  penalizeOnce(key, exercise, rule, points, t = 0) {
    if (this._once.has(key)) return;
    this._once.add(key);
    this.penalize(exercise, rule, points, t);
  }

  /** End the exam: passed only if still running and below the threshold. */
  finish() {
    if (this.status === 'running') {
      this.status = this.total < FAIL_THRESHOLD ? 'passed' : 'failed';
      if (this.status === 'failed' && !this.failReason) this.failReason = 'Too many penalty points';
    }
    return this.status;
  }
}
