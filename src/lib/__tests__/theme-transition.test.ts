import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CAPTURE_TIMEOUT_MS,
  COVER_TIMEOUT_MS,
  FADE_GRACE_MS,
  FADE_MS,
  FRAMES_BEFORE_FADE,
  FRAMES_BEFORE_SWITCH,
  HARD_TIMEOUT_MS,
  SWITCH_TIMEOUT_MS,
  ThemeTransition,
  type TransitionEnv,
} from '../theme-transition';

type Choice = 'light' | 'dark';

/** A pretend phone: a clock and a frame counter that the test moves by hand, plus a log of what happened. */
function makeWorld(options: { reduceMotion?: boolean; startTheme?: Choice } = {}) {
  let now = 0;
  let nextId = 1;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const frameWaiters = new Map<number, { left: number; fn: () => void }>();
  const log: string[] = [];
  let theme: Choice = options.startTheme ?? 'light';
  let reduceMotion = options.reduceMotion ?? false;
  let themeListener: (() => void) | null = null;
  let fadeDone: (() => void) | null = null;
  let captureResolve: ((uri: string) => void) | null = null;
  let captureReject: ((error: Error) => void) | null = null;
  let applyShouldThrow = false;
  let cover: string | null = null;

  const env: TransitionEnv = {
    current: () => theme,
    reduceMotion: () => reduceMotion,
    capture: () =>
      new Promise<string>((resolve, reject) => {
        log.push('capture');
        captureResolve = resolve;
        captureReject = reject;
      }),
    release: (uri) => log.push(`release ${uri}`),
    apply: (next) => {
      log.push(`apply ${next}`);
      if (applyShouldThrow) throw new Error('boom');
      theme = next;
    },
    listenForTheme: (next, listener) => {
      log.push(`listen ${next}`);
      themeListener = listener;
      return () => {
        if (themeListener === listener) themeListener = null;
      };
    },
    afterFrames: (count, fn) => {
      const id = nextId++;
      frameWaiters.set(id, { left: count, fn });
      return () => frameWaiters.delete(id);
    },
    after: (ms, fn) => {
      const id = nextId++;
      timers.set(id, { at: now + ms, fn });
      return () => timers.delete(id);
    },
    setCover: (uri) => {
      cover = uri;
      log.push(uri ? `cover ${uri}` : 'uncover');
    },
    startFade: (done) => {
      log.push('fade');
      fadeDone = done;
    },
  };

  const api = {
    env,
    log,
    get cover() {
      return cover;
    },
    get theme() {
      return theme;
    },
    setReduceMotion: (value: boolean) => {
      reduceMotion = value;
    },
    makeApplyThrow: (value: boolean) => {
      applyShouldThrow = value;
    },
    resolveCapture: async (uri: string) => {
      captureResolve?.(uri);
      await Promise.resolve();
      await Promise.resolve();
    },
    rejectCapture: async () => {
      captureReject?.(new Error('no camera'));
      await Promise.resolve();
      await Promise.resolve();
    },
    /** Move the clock forward, running any timer that falls due on the way. */
    advance: (ms: number) => {
      const end = now + ms;
      for (;;) {
        const due = [...timers.entries()]
          .filter(([, t]) => t.at <= end)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        now = Math.max(now, due[1].at);
        due[1].fn();
      }
      now = end;
    },
    /** Show one screen frame. */
    frame: () => {
      for (const [id, waiter] of [...frameWaiters.entries()]) {
        waiter.left -= 1;
        if (waiter.left <= 0) {
          frameWaiters.delete(id);
          waiter.fn();
        }
      }
    },
    frames: (count: number) => {
      for (let i = 0; i < count; i++) api.frame();
    },
    emitTheme: () => themeListener?.(),
    finishFade: () => fadeDone?.(),
    pendingTimers: () => timers.size,
  };
  return api;
}

const newWorld = makeWorld;

describe('instant switches', () => {
  it('switches at once when the phone asks for less motion', () => {
    const w = newWorld({ reduceMotion: true });
    const t = new ThemeTransition(w.env);
    t.request('dark');
    assert.deepEqual(w.log, ['apply dark']);
    assert.equal(t.busy, false);
  });

  it('just applies when the theme is already the one asked for', () => {
    const w = newWorld({ startTheme: 'dark' });
    const t = new ThemeTransition(w.env);
    t.request('dark');
    assert.deepEqual(w.log, ['apply dark']);
  });

  it('switches at once when the screen picture cannot be taken', async () => {
    const w = newWorld();
    const t = new ThemeTransition(w.env);
    t.request('dark');
    await w.rejectCapture();
    assert.deepEqual(w.log, ['capture', 'apply dark', 'uncover']);
    assert.equal(t.busy, false);
    assert.equal(w.pendingTimers(), 0);
  });

  it('switches at once when taking the picture throws straight away', () => {
    const w = newWorld();
    const env: TransitionEnv = {
      ...w.env,
      capture: () => {
        throw new Error('module missing');
      },
    };
    const t = new ThemeTransition(env);
    t.request('dark');
    return Promise.resolve().then(() => {
      assert.deepEqual(w.log, ['apply dark', 'uncover']);
      assert.equal(t.busy, false);
    });
  });
});

describe('the cross-fade', () => {
  it('runs capture, cover, switch, fade in that order', async () => {
    const w = newWorld();
    const t = new ThemeTransition(w.env);

    t.request('dark');
    assert.equal(t.busy, true);
    assert.deepEqual(w.log, ['capture']);

    await w.resolveCapture('file:///shot.jpg');
    assert.deepEqual(w.log, ['capture', 'cover file:///shot.jpg']);

    // The theme must NOT change before the picture is on screen and a couple of frames have passed.
    w.frames(FRAMES_BEFORE_SWITCH + 5);
    assert.equal(w.theme, 'light');

    t.coverShown();
    w.frames(FRAMES_BEFORE_SWITCH - 1);
    assert.equal(w.theme, 'light');
    w.frame();
    assert.equal(w.theme, 'dark');
    assert.deepEqual(w.log.slice(-2), ['listen dark', 'apply dark']);

    // The fade waits for the phone to report the new theme plus a few frames.
    w.frames(10);
    assert.equal(w.log.includes('fade'), false);
    w.emitTheme();
    w.frames(FRAMES_BEFORE_FADE - 1);
    assert.equal(w.log.includes('fade'), false);
    w.frame();
    assert.equal(w.log.at(-1), 'fade');

    w.finishFade();
    assert.deepEqual(w.log.slice(-2), ['uncover', 'release file:///shot.jpg']);
    assert.equal(w.cover, null);
    assert.equal(t.busy, false);
    assert.equal(w.pendingTimers(), 0);
  });

  it('fades anyway if the phone never reports the new theme', async () => {
    const w = newWorld();
    const t = new ThemeTransition(w.env);
    t.request('dark');
    await w.resolveCapture('file:///shot.jpg');
    t.coverShown();
    w.frames(FRAMES_BEFORE_SWITCH);

    w.advance(SWITCH_TIMEOUT_MS - 1);
    w.frames(10);
    assert.equal(w.log.includes('fade'), false);

    w.advance(1);
    w.frames(FRAMES_BEFORE_FADE);
    assert.equal(w.log.at(-1), 'fade');
  });

  it('removes the cover even if the fade never reports back', async () => {
    const w = newWorld();
    const t = new ThemeTransition(w.env);
    t.request('dark');
    await w.resolveCapture('file:///shot.jpg');
    t.coverShown();
    w.frames(FRAMES_BEFORE_SWITCH);
    w.emitTheme();
    w.frames(FRAMES_BEFORE_FADE);
    assert.equal(w.log.at(-1), 'fade');

    w.advance(FADE_MS + FADE_GRACE_MS);
    assert.deepEqual(w.log.slice(-2), ['uncover', 'release file:///shot.jpg']);
    assert.equal(w.theme, 'dark');
    assert.equal(t.busy, false);
  });

  it('ignores taps while a transition is running, then works again afterwards', async () => {
    const w = newWorld();
    const t = new ThemeTransition(w.env);
    t.request('dark');
    t.request('light');
    t.request('dark');
    assert.deepEqual(w.log, ['capture']);

    await w.resolveCapture('file:///a.jpg');
    t.coverShown();
    w.frames(FRAMES_BEFORE_SWITCH);
    w.emitTheme();
    w.frames(FRAMES_BEFORE_FADE);
    w.finishFade();
    assert.equal(w.theme, 'dark');

    t.request('light');
    assert.equal(w.log.filter((line) => line === 'capture').length, 2);
  });

  it('listens for the theme it asked for', async () => {
    const w = newWorld();
    const t = new ThemeTransition(w.env);
    t.request('dark');
    await w.resolveCapture('file:///shot.jpg');
    t.coverShown();
    w.frames(FRAMES_BEFORE_SWITCH);
    assert.ok(w.log.includes('listen dark'));
  });
});

describe('when things go wrong', () => {
  it('gives up and switches instantly if the picture takes too long, and cleans up a late one', async () => {
    const w = newWorld();
    const t = new ThemeTransition(w.env);
    t.request('dark');
    w.advance(CAPTURE_TIMEOUT_MS);
    assert.deepEqual(w.log, ['capture', 'apply dark', 'uncover']);
    assert.equal(t.busy, false);

    await w.resolveCapture('file:///late.jpg');
    assert.equal(w.cover, null);
    assert.equal(w.log.at(-1), 'release file:///late.jpg');
    assert.equal(w.log.filter((line) => line.startsWith('cover')).length, 0);
  });

  it('gives up if the cover never shows, and removes it', async () => {
    const w = newWorld();
    const t = new ThemeTransition(w.env);
    t.request('dark');
    await w.resolveCapture('file:///shot.jpg');
    w.advance(COVER_TIMEOUT_MS);
    assert.deepEqual(w.log.slice(-3), ['apply dark', 'uncover', 'release file:///shot.jpg']);
    assert.equal(t.busy, false);
  });

  it('gives up if the cover picture fails to load', async () => {
    const w = newWorld();
    const t = new ThemeTransition(w.env);
    t.request('dark');
    await w.resolveCapture('file:///shot.jpg');
    t.coverFailed();
    assert.deepEqual(w.log.slice(-3), ['apply dark', 'uncover', 'release file:///shot.jpg']);
    assert.equal(w.theme, 'dark');
  });

  it('still changes the theme and drops the cover if frames stop arriving', async () => {
    const w = newWorld();
    const t = new ThemeTransition(w.env);
    t.request('dark');
    await w.resolveCapture('file:///shot.jpg');
    t.coverShown(); // ...and then no frame ever arrives (app in the background, say)
    w.advance(HARD_TIMEOUT_MS);
    assert.equal(w.theme, 'dark');
    assert.equal(w.cover, null);
    assert.equal(t.busy, false);
    assert.equal(w.pendingTimers(), 0);
  });

  it('does not apply the theme twice when it gives up after switching', async () => {
    const w = newWorld();
    const t = new ThemeTransition(w.env);
    t.request('dark');
    await w.resolveCapture('file:///shot.jpg');
    t.coverShown();
    w.frames(FRAMES_BEFORE_SWITCH);
    w.advance(HARD_TIMEOUT_MS);
    assert.equal(w.log.filter((line) => line === 'apply dark').length, 1);
    assert.equal(w.cover, null);
  });

  it('removes the cover if applying the theme throws', async () => {
    const w = newWorld();
    const t = new ThemeTransition(w.env);
    t.request('dark');
    await w.resolveCapture('file:///shot.jpg');
    t.coverShown();
    w.makeApplyThrow(true);
    const warn = console.warn;
    console.warn = () => {};
    try {
      w.frames(FRAMES_BEFORE_SWITCH);
    } finally {
      console.warn = warn;
    }
    assert.equal(w.cover, null);
    assert.equal(t.busy, false);
  });

  it('stops quietly when disposed in the middle, without changing the theme', async () => {
    const w = newWorld();
    const t = new ThemeTransition(w.env);
    t.request('dark');
    await w.resolveCapture('file:///shot.jpg');
    t.coverShown();
    t.dispose();
    assert.equal(w.theme, 'light');
    assert.equal(w.cover, null);
    assert.equal(w.pendingTimers(), 0);
    w.frames(10);
    w.advance(HARD_TIMEOUT_MS * 2);
    assert.equal(w.log.includes('apply dark'), false);
    assert.equal(w.log.at(-1), 'release file:///shot.jpg');
  });

  it('dispose with nothing running does nothing', () => {
    const w = newWorld();
    const t = new ThemeTransition(w.env);
    t.dispose();
    assert.deepEqual(w.log, []);
  });
});
