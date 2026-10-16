import type { ThemeChoice } from './theme-preference';

/**
 * The order of events for a smooth light/dark switch (a "cross-fade"):
 *
 *   1. capture   take a picture of the screen
 *   2. cover     lay that picture over the whole app and wait until it is really on screen
 *   3. switch    flip the theme underneath it, wait until the phone reports the new theme
 *   4. fade      let the picture fade away, which shows the new theme underneath
 *
 * This file only decides WHAT happens WHEN. It knows nothing about React or the phone: everything
 * it needs is handed in as `TransitionEnv`, so the rules can be tested on a computer
 * (src/lib/__tests__/theme-transition.test.ts). src/components/theme-transition.tsx plugs in the
 * real camera, timers and animation.
 *
 * The one rule that matters most: whatever goes wrong, the picture must come off and the theme must
 * still change. Every step below has a timeout that falls back to an instant switch.
 */

/**
 * Master switch. Set to false and the theme changes instantly, exactly as before the fade existed
 * (nothing is captured, nothing is drawn). The first thing to try if the fade misbehaves on a phone.
 */
export const THEME_FADE_ENABLED = true;
/** How long the screen picture may take before we give up and switch instantly. */
export const CAPTURE_TIMEOUT_MS = 1200;
/** How long the picture may take to show up on screen before we give up. */
export const COVER_TIMEOUT_MS = 1000;
/** How long to wait for the phone to report the new theme before carrying on anyway. */
export const SWITCH_TIMEOUT_MS = 800;
/** Frames to wait after the picture is on screen, so it is really drawn before the theme flips. */
export const FRAMES_BEFORE_SWITCH = 2;
/** Frames to wait after the new theme reached React, so the new screen is drawn before the fade. */
export const FRAMES_BEFORE_FADE = 3;
/** Length of the fade. The fade curve is slow at first, which hides small timing errors. */
export const FADE_MS = 320;
/** If the fade never reports back, remove the picture this long after it should have finished. */
export const FADE_GRACE_MS = 600;
/** Last line of defence: no matter what, a transition is over this long after the tap. */
export const HARD_TIMEOUT_MS = 4000;

export type TransitionEnv = {
  /** The theme the app shows right now. */
  current: () => ThemeChoice;
  /** True when the phone asks apps to avoid animations. */
  reduceMotion: () => boolean;
  /** Take a picture of the screen. Resolves with its file address. May reject. */
  capture: () => Promise<string>;
  /** Delete a picture taken by `capture`. */
  release: (uri: string) => void;
  /** Switch the app to this theme and remember the choice. */
  apply: (next: ThemeChoice) => void;
  /** Call `listener` when the phone reports `next` as the theme. Returns a function that stops listening. */
  listenForTheme: (next: ThemeChoice, listener: () => void) => () => void;
  /** Run `fn` after this many screen frames. Returns a function that cancels it. */
  afterFrames: (count: number, fn: () => void) => () => void;
  /** Run `fn` after this many milliseconds. Returns a function that cancels it. */
  after: (ms: number, fn: () => void) => () => void;
  /** Cover the app with this picture, or take the cover off (null). */
  setCover: (uri: string | null) => void;
  /** Start fading the cover out. Call `done` when the fade has finished. */
  startFade: (done: () => void) => void;
};

type Phase = 'idle' | 'capturing' | 'covering' | 'switching' | 'fading';

export class ThemeTransition {
  private readonly env: TransitionEnv;
  private phase: Phase = 'idle';
  /** Changes with every transition, so late callbacks from an earlier one can be ignored. */
  private run = 0;
  private next: ThemeChoice = 'light';
  private applied = false;
  private uri: string | null = null;
  private hardCancel: (() => void) | null = null;
  private phaseCancels: (() => void)[] = [];

  constructor(env: TransitionEnv) {
    this.env = env;
  }

  /** True while a transition is running; further taps are ignored until it ends. */
  get busy(): boolean {
    return this.phase !== 'idle';
  }

  /** Switch to `next`, with the cross-fade when possible and instantly when not. */
  request(next: ThemeChoice): void {
    if (this.phase !== 'idle') return;
    if (!THEME_FADE_ENABLED || this.env.current() === next || this.env.reduceMotion()) {
      this.env.apply(next);
      return;
    }

    const run = ++this.run;
    this.next = next;
    this.applied = false;
    this.uri = null;
    this.hardCancel = this.env.after(HARD_TIMEOUT_MS, () => this.bail(run));
    this.enter('capturing', CAPTURE_TIMEOUT_MS, run);

    let pending: Promise<string>;
    try {
      pending = this.env.capture();
    } catch (error) {
      pending = Promise.reject(error);
    }
    pending.then(
      (uri) => this.onCaptured(run, uri),
      () => this.bail(run),
    );
  }

  /** The cover picture is on screen. Called by the picture itself. */
  coverShown(): void {
    if (this.phase !== 'covering') return;
    const run = this.run;
    this.enter('switching', undefined, run);
    this.phaseCancels.push(this.env.afterFrames(FRAMES_BEFORE_SWITCH, () => this.switchTheme(run)));
  }

  /** The cover picture could not be shown. Called by the picture itself. */
  coverFailed(): void {
    if (this.phase === 'covering') this.bail(this.run);
  }

  /** Stop everything (the screen is going away). Does not change the theme. */
  dispose(): void {
    this.reset(false);
  }

  private onCaptured(run: number, uri: string): void {
    // A picture that arrives after we gave up is just litter.
    if (run !== this.run || this.phase !== 'capturing') {
      this.env.release(uri);
      return;
    }
    this.uri = uri;
    this.enter('covering', COVER_TIMEOUT_MS, run);
    this.env.setCover(uri);
  }

  private switchTheme(run: number): void {
    if (run !== this.run || this.phase !== 'switching') return;

    let fired = false;
    const carryOn = () => {
      if (fired || run !== this.run) return;
      fired = true;
      this.phaseCancels.forEach((cancel) => cancel());
      this.phaseCancels = [];
      this.phaseCancels.push(this.env.afterFrames(FRAMES_BEFORE_FADE, () => this.fade(run)));
    };

    // Listen before switching, so a very quick answer cannot slip past.
    this.phaseCancels.push(this.env.listenForTheme(this.next, carryOn));
    this.phaseCancels.push(this.env.after(SWITCH_TIMEOUT_MS, carryOn));
    try {
      this.env.apply(this.next);
      this.applied = true;
    } catch {
      this.bail(run);
    }
  }

  private fade(run: number): void {
    if (run !== this.run || this.phase !== 'switching') return;
    this.enter('fading', FADE_MS + FADE_GRACE_MS, run);
    try {
      this.env.startFade(() => {
        if (run === this.run && this.phase === 'fading') this.reset(true);
      });
    } catch {
      this.bail(run);
    }
  }

  /** Something went wrong or took too long: make sure the theme changes, then drop the cover. */
  private bail(run: number): void {
    if (run !== this.run || this.phase === 'idle') return;
    this.reset(true);
  }

  private enter(phase: Phase, timeoutMs: number | undefined, run: number): void {
    this.cancelPhaseTimers();
    this.phase = phase;
    if (timeoutMs !== undefined) {
      this.phaseCancels.push(this.env.after(timeoutMs, () => this.bail(run)));
    }
  }

  private cancelPhaseTimers(): void {
    this.phaseCancels.forEach((cancel) => cancel());
    this.phaseCancels = [];
  }

  /** Back to idle. With `finish`, the theme is guaranteed to have been applied. */
  private reset(finish: boolean): void {
    const wasRunning = this.phase !== 'idle';
    const uri = this.uri;
    const next = this.next;
    const applied = this.applied;

    this.run++;
    this.phase = 'idle';
    this.uri = null;
    this.applied = false;
    this.cancelPhaseTimers();
    this.hardCancel?.();
    this.hardCancel = null;

    if (!wasRunning) return;
    if (finish && !applied) {
      try {
        this.env.apply(next);
      } catch (error) {
        console.warn('Could not switch the theme', error);
      }
    }
    this.env.setCover(null);
    if (uri) this.env.release(uri);
  }
}
