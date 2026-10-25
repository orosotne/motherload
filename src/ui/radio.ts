import { RADIO, type RadioMessage, type Speaker } from '../data/story';
import { t, type TextKey } from '../i18n';
import { PORTRAITS } from './portraits';

interface Playing {
  message: RadioMessage;
  text: string;
  /** Characters typed so far. */
  typed: number;
  /** Seconds the finished text still stays. */
  hold: number;
}

/** Seconds the window takes to slide away before the next message. */
const LEAVE_SECONDS = 0.22;

function element(tag: string, className: string, parent?: HTMLElement): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  parent?.append(node);
  return node;
}

/** Text of a radio message in the current language. */
export function radioText(message: RadioMessage): string {
  return t(`radio.${message.id}` as TextKey);
}

/** Pip's beeps for a message: a few syllables picked from its id, so they stay the same. */
export function beeps(id: string): string {
  const syllables = t('radio.beeps').split(' ');
  let hash = 7;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const count = 2 + (hash % 3);
  const picked: string[] = [];
  for (let i = 0; i < count; i++) {
    picked.push(syllables[(hash >>> (i * 3)) % syllables.length] ?? 'bip');
  }
  return `${picked.join('-')}!`;
}

/**
 * The radio (GAME_SPEC §7): a window with a portrait, the text typed out like on a typewriter,
 * at most two lines. It never stops the game; Enter, B or a click shows the whole text, and a
 * second press closes it. Messages wait in a queue, and drop out of it once stale; a blocking
 * one, only in the finale, goes first and sits in the middle of the screen.
 */
export class Radio {
  private readonly root: HTMLElement;
  private readonly portrait: HTMLElement;
  private readonly name: HTMLElement;
  private readonly beeps: HTMLElement;
  private readonly typed: HTMLElement;
  private readonly rest: HTMLElement;
  private readonly queue: { message: RadioMessage; waited: number }[] = [];
  private playing: Playing | null = null;
  private leaving = 0;

  constructor(
    parent: HTMLElement,
    /** Plays the speaker's radio sound when a message starts. */
    private readonly onStart: (speaker: Speaker) => void = () => undefined,
  ) {
    this.root = element('div', 'radio', parent);
    this.root.setAttribute('role', 'status');
    this.root.setAttribute('aria-live', 'polite');
    this.root.hidden = true;
    this.portrait = element('div', 'radio-portrait', this.root);
    const body = element('div', 'radio-body', this.root);
    const head = element('div', 'radio-head', body);
    this.name = element('b', 'radio-name', head);
    this.beeps = element('span', 'radio-beeps', head);
    const text = element('p', 'radio-text', body);
    this.typed = element('span', '', text);
    // The untyped rest keeps its place, so the window does not grow while typing.
    this.rest = element('span', 'radio-rest', text);
    element('kbd', 'radio-skip', this.root).textContent = '⏎';
    this.root.addEventListener('pointerdown', () => this.skip());
  }

  /** True while a message shows or waits. */
  get busy(): boolean {
    return this.playing !== null || this.queue.length > 0;
  }

  say(message: RadioMessage): void {
    if (message.blocking) {
      this.queue.unshift({ message, waited: 0 });
      if (this.playing) this.close();
    } else {
      this.queue.push({ message, waited: 0 });
    }
  }

  /** The first press shows the whole text, the second one closes the window. */
  skip(): void {
    const playing = this.playing;
    if (!playing || this.leaving > 0) return;
    if (playing.typed < playing.text.length) playing.typed = playing.text.length;
    else this.close();
    this.draw();
  }

  /** `paused`: a menu is open; the radio waits with the game. */
  update(dt: number, paused: boolean): void {
    if (paused) return;
    // A tip about something long past would only confuse.
    for (const queued of this.queue) queued.waited += dt;
    while (this.queue[0] && this.queue[0].waited > RADIO.staleSeconds) this.queue.shift();
    if (this.leaving > 0) {
      this.leaving -= dt;
      if (this.leaving > 0) return;
      this.root.hidden = true;
      this.root.classList.remove('is-leaving');
    }
    const playing = this.playing;
    if (!playing) {
      const next = this.queue.shift();
      if (next) this.start(next.message);
      return;
    }
    if (playing.typed < playing.text.length) {
      playing.typed = Math.min(playing.text.length, playing.typed + dt * RADIO.charsPerSecond);
      this.draw();
      return;
    }
    playing.hold -= dt;
    if (playing.hold <= 0) this.close();
  }

  private start(message: RadioMessage): void {
    const text = radioText(message);
    this.playing = {
      message,
      text,
      typed: 0,
      hold: RADIO.holdSeconds + RADIO.holdPerChar * text.length,
    };
    const { speaker } = message;
    this.root.className = `radio is-${speaker}${message.blocking ? ' is-blocking' : ''}`;
    // Static SVG from portraits.ts, never text from the game or the player.
    this.portrait.innerHTML = PORTRAITS[speaker];
    this.name.textContent = t(`speaker.${speaker}` as TextKey);
    this.beeps.textContent = speaker === 'pip' ? beeps(message.id) : '';
    this.root.hidden = false;
    this.draw();
    this.onStart(speaker);
  }

  private close(): void {
    this.playing = null;
    this.leaving = LEAVE_SECONDS;
    this.root.classList.add('is-leaving');
  }

  private draw(): void {
    const playing = this.playing;
    if (!playing) return;
    const cut = Math.floor(playing.typed);
    this.typed.textContent = playing.text.slice(0, cut);
    this.rest.textContent = playing.text.slice(cut);
  }
}
