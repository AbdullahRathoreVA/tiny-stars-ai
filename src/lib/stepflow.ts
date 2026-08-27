/**
 * A small, accessible controller for multi-step forms.
 *
 * Shared by Book a Tour, Registration and the Waitlist so all three behave
 * identically: same keyboard handling, same validation timing, same live-region
 * announcements, same recovery from errors.
 *
 * Deliberate choices:
 *  - Validation runs on "Continue", not on every keystroke. Being told you are
 *    wrong while still typing is hostile.
 *  - Errors are announced and focus moves to the first bad field.
 *  - Draft state stays in sessionStorage under an explicit key, so a mis-tap on
 *    Back does not wipe twenty fields — and it never touches localStorage,
 *    because this is family data on a childcare site.
 */

export interface StepFlowOptions {
  root: HTMLElement;
  /** sessionStorage key for draft recovery. Omit to disable drafts entirely. */
  draftKey?: string;
  onStep?: (step: number, total: number) => void;
  onComplete?: (data: Record<string, string>) => void;
}

export class StepFlow {
  private root: HTMLElement;
  private steps: HTMLElement[];
  private nextBtn: HTMLButtonElement;
  private backBtn: HTMLButtonElement;
  private fill: HTMLElement | null;
  private label: HTMLElement | null;
  private announce: HTMLElement | null;
  private draftKey?: string;
  private opts: StepFlowOptions;

  current = 1;

  constructor(opts: StepFlowOptions) {
    this.opts = opts;
    this.root = opts.root;
    this.draftKey = opts.draftKey;
    this.steps = Array.from(this.root.querySelectorAll<HTMLElement>('[data-step]'));
    this.nextBtn = this.root.querySelector<HTMLButtonElement>('[data-next]')!;
    this.backBtn = this.root.querySelector<HTMLButtonElement>('[data-back]')!;
    this.fill = this.root.querySelector('[data-progress]');
    this.label = this.root.querySelector('[data-step-label]');
    this.announce = this.root.querySelector('[data-announce]');

    this.nextBtn.addEventListener('click', () => this.next());
    this.backBtn.addEventListener('click', () => this.back());

    // Enter advances, except inside a textarea where it should insert a newline.
    this.root.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const t = e.target as HTMLElement;
      if (t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON') return;
      e.preventDefault();
      this.next();
    });

    // Clear an error the moment the visitor starts fixing it.
    this.root.addEventListener('input', (e) => {
      const el = e.target as HTMLElement;
      if (el.getAttribute('aria-invalid') === 'true') this.clearError(el as HTMLInputElement);
      this.saveDraft();
    });
    this.root.addEventListener('change', () => this.saveDraft());

    this.restoreDraft();
    this.render();
  }

  private get total(): number {
    return this.steps.length;
  }

  private stepEl(n: number): HTMLElement | undefined {
    return this.steps.find((s) => Number(s.dataset.step) === n);
  }

  /* ------------------------------------------------------------ errors */

  private setError(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, msg: string) {
    field.setAttribute('aria-invalid', 'true');
    const wrap = field.closest('.field');
    const slot = wrap?.querySelector<HTMLElement>('.field__error');
    if (slot) {
      slot.textContent = msg;
      const id = slot.id || `err-${field.name || Math.random().toString(36).slice(2)}`;
      slot.id = id;
      field.setAttribute('aria-describedby', id);
    }
  }

  private clearError(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
    field.removeAttribute('aria-invalid');
    const slot = field.closest('.field')?.querySelector<HTMLElement>('.field__error');
    if (slot) slot.textContent = '';
  }

  /** Returns the first invalid control on the current step, or null. */
  private validate(): HTMLElement | null {
    const step = this.stepEl(this.current);
    if (!step) return null;

    let firstBad: HTMLElement | null = null;

    // Required text-ish fields.
    step
      .querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[data-required]')
      .forEach((field) => {
        this.clearError(field);
        const value = field.value.trim();

        if (!value) {
          this.setError(field, field.dataset.errorEmpty || 'This one is needed to continue.');
          firstBad ??= field;
          return;
        }
        if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
          this.setError(field, 'That email address does not look complete.');
          firstBad ??= field;
          return;
        }
        if (field.type === 'tel' && value.replace(/\D/g, '').length < 10) {
          this.setError(field, 'A 10-digit phone number, please — so the team can reach you.');
          firstBad ??= field;
        }
      });

    // Required radio/checkbox groups, marked on the wrapping .choices element.
    step.querySelectorAll<HTMLElement>('[data-required-group]').forEach((group) => {
      const name = group.dataset.requiredGroup!;
      const checked = group.querySelector(`input[name="${name}"]:checked`);
      const slot = group.parentElement?.querySelector<HTMLElement>('.field__error');
      if (!checked) {
        if (slot) slot.textContent = group.dataset.errorEmpty || 'Please pick one to continue.';
        firstBad ??= group.querySelector<HTMLElement>('input');
      } else if (slot) {
        slot.textContent = '';
      }
    });

    return firstBad;
  }

  /* ------------------------------------------------------------ drafts */

  private saveDraft() {
    if (!this.draftKey) return;
    try {
      const data = this.collect();
      sessionStorage.setItem(this.draftKey, JSON.stringify(data));
    } catch {
      /* private mode, quota — drafts are a convenience, never a requirement */
    }
  }

  private restoreDraft() {
    if (!this.draftKey) return;
    try {
      const raw = sessionStorage.getItem(this.draftKey);
      if (!raw) return;
      const data = JSON.parse(raw) as Record<string, string>;
      Object.entries(data).forEach(([name, value]) => {
        const fields = this.root.querySelectorAll<HTMLInputElement>(`[name="${CSS.escape(name)}"]`);
        fields.forEach((f) => {
          if (f.type === 'radio' || f.type === 'checkbox') {
            if (f.value === value || value.split('|').includes(f.value)) f.checked = true;
          } else {
            f.value = value;
          }
        });
      });
    } catch {
      /* a corrupt draft must never block the form */
    }
  }

  clearDraft() {
    if (!this.draftKey) return;
    try {
      sessionStorage.removeItem(this.draftKey);
    } catch {
      /* ignore */
    }
  }

  /* ------------------------------------------------------------- data */

  collect(): Record<string, string> {
    const out: Record<string, string> = {};
    this.root
      .querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        'input[name], select[name], textarea[name]'
      )
      .forEach((f) => {
        const input = f as HTMLInputElement;
        if (input.type === 'checkbox') {
          if (input.checked) out[f.name] = out[f.name] ? `${out[f.name]}|${input.value}` : input.value;
        } else if (input.type === 'radio') {
          if (input.checked) out[f.name] = input.value;
        } else if (f.value.trim()) {
          out[f.name] = f.value.trim();
        }
      });
    return out;
  }

  /** Human-readable label for a control's current value, for review screens. */
  labelFor(name: string): string {
    const checked = this.root.querySelector<HTMLInputElement>(
      `input[name="${CSS.escape(name)}"]:checked`
    );
    if (checked) return checked.dataset.label ?? checked.value;
    const field = this.root.querySelector<HTMLInputElement>(`[name="${CSS.escape(name)}"]`);
    return field?.value.trim() ?? '';
  }

  /* -------------------------------------------------------- navigation */

  private render() {
    this.steps.forEach((s) => {
      const on = Number(s.dataset.step) === this.current;
      s.hidden = !on;
      s.classList.toggle('is-active', on);
    });

    if (this.fill) this.fill.style.width = `${(this.current / this.total) * 100}%`;
    if (this.label) this.label.textContent = `Step ${this.current} of ${this.total}`;
    this.backBtn.hidden = this.current === 1;
    this.nextBtn.textContent =
      this.current === this.total ? (this.nextBtn.dataset.finalLabel ?? 'Finish') : 'Continue';

    this.opts.onStep?.(this.current, this.total);
  }

  goTo(step: number, focus = true) {
    this.current = Math.min(Math.max(1, step), this.total);
    this.render();
    if (this.announce) this.announce.textContent = `Step ${this.current} of ${this.total}.`;
    if (focus) {
      const target = this.stepEl(this.current)?.querySelector<HTMLElement>(
        'input:not([type="hidden"]), select, textarea, button'
      );
      target?.focus({ preventScroll: true });
    }
    this.root.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  next() {
    const bad = this.validate();
    if (bad) {
      if (this.announce) {
        this.announce.textContent =
          'Some details still need attention. Focus has moved to the first one.';
      }
      bad.focus();
      bad.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    if (this.current < this.total) {
      this.goTo(this.current + 1);
    } else {
      this.opts.onComplete?.(this.collect());
    }
  }

  back() {
    if (this.current > 1) this.goTo(this.current - 1);
  }

  /** Replace the whole flow with a confirmation panel. */
  finish(html: string, announcement: string) {
    const nav = this.root.querySelector<HTMLElement>('[data-nav]');
    this.steps.forEach((s) => {
      s.hidden = true;
      s.classList.remove('is-active');
    });
    if (nav) nav.hidden = true;
    if (this.fill) this.fill.style.width = '100%';
    if (this.label) this.label.textContent = 'Done';

    const out = this.root.querySelector<HTMLElement>('[data-result]');
    if (out) {
      out.innerHTML = html;
      out.hidden = false;
      out.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
    if (this.announce) this.announce.textContent = announcement;
  }
}

/** Escape user-entered text before echoing it into a review screen. */
export function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );
}
