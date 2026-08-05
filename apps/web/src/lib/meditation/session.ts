/**
 * A real guided meditation: bell, imposed silence, bell.
 *
 * The silence is imposed on the session rather than requested from the model.
 * A model told to "stay quiet for two minutes" will fill the gap — it
 * encourages, it checks in, it narrates the silence away. So the inbound voice
 * is switched off for the interval and switched back on afterwards, whatever
 * happens in between.
 *
 * Mirrors `robot/reachy_mini_mirrorbuddy/meditation.py`: the same practices and
 * the same limits, so a session feels identical on the robot and in the browser.
 */

export const MIN_SILENCE_S = 30;
export const MAX_SILENCE_S = 600;

export interface Plan {
  practice: string;
  opening: string;
  closing: string;
  silenceSeconds: number;
}

interface PracticeText {
  match: RegExp;
  opening: string;
  closing: string;
}

/**
 * Openings never ask for a breath to be held, slowed or deepened: for a child
 * with assisted or effortful breathing that is both useless and unkind. They
 * also never assume a body that sits up, stays still, or closes its eyes.
 */
const PRACTICES: Record<string, PracticeText> = {
  respiro: {
    match: /respir|fiato|breath/i,
    opening:
      'Invita lo studente a lasciare che il respiro vada come vuole, senza cambiarlo, ' +
      'e a sentirlo dove lo sente di piu\u0300. Poi digli che suonera\u0300 una campana, ' +
      'che restera\u0300 in silenzio con lui, e che bastera\u0300 parlare per fermarsi. Poche frasi calme.',
    closing:
      'Riporta lo studente nella stanza con dolcezza e chiedigli come si sente adesso. Una o due frasi.',
  },
  corpo: {
    match: /corpo|body|scan|rilassa/i,
    opening:
      'Guida una breve attenzione al corpo, nella posizione in cui lo studente si trova ' +
      'gia\u0300 \u2014 seduto, sdraiato o in carrozzina va bene uguale. Nomina poche parti del corpo ' +
      'e invita solo ad accorgersi di come stanno, senza doverle muovere. Poi annuncia la campana e il silenzio.',
    closing:
      'Ringrazia lo studente per il tempo che si e\u0300 dato e chiedigli come sta il corpo ora.',
  },
  gentilezza: {
    match: /gentilezz|amore|metta|kindness/i,
    opening:
      'Proponi una breve pratica di gentilezza: augurare qualcosa di buono prima a se stessi, ' +
      'poi a una persona cara. Frasi semplici, ripetute con calma. Poi annuncia la campana e il silenzio.',
    closing: 'Chiudi con calore, chiedendo allo studente chi gli e\u0300 venuto in mente.',
  },
  camminata: {
    match: /cammin|passi|walk/i,
    opening:
      'Proponi di portare l\u2019attenzione al contatto con cio\u0300 che sostiene \u2014 i piedi, la sedia, ' +
      'le ruote, il letto \u2014 come una camminata da fermi. Poi annuncia la campana e il silenzio.',
    closing: 'Chiudi ringraziando e chiedendo che cosa ha notato.',
  },
};

const DEFAULT_PRACTICE = 'respiro';

export function buildPlan(practice: string, minutes: number): Plan {
  const requested = (practice || '').trim();
  const key =
    Object.keys(PRACTICES).find((name) => PRACTICES[name].match.test(requested)) ??
    DEFAULT_PRACTICE;
  const text = PRACTICES[key];
  const requestedSeconds = Number.isFinite(minutes) ? Number(minutes) * 60 : 0;
  return {
    practice: key,
    opening: text.opening,
    closing: text.closing,
    silenceSeconds: Math.min(MAX_SILENCE_S, Math.max(MIN_SILENCE_S, requestedSeconds)),
  };
}

export interface SessionOptions {
  plan: Plan;
  /** Switch the model's voice off — the silence must not depend on its goodwill. */
  silenceVoice: () => void;
  restoreVoice: () => void;
  ringBell: () => void;
  onEnd?: (plan: Plan) => void;
}

/**
 * Runs one session. Everything that can fail is contained: whatever happens,
 * the voice is given back, because a robot or a page left permanently mute is
 * far worse than a meditation that ends early.
 */
export class MeditationSession {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private endsAt = 0;
  private running = false;

  constructor(private readonly options: SessionOptions) {}

  get isRunning(): boolean {
    return this.running;
  }

  /** Whole seconds of silence left, for a countdown the student can see. */
  get secondsLeft(): number {
    if (!this.running) return 0;
    return Math.max(0, Math.ceil((this.endsAt - Date.now()) / 1000));
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.endsAt = Date.now() + this.options.plan.silenceSeconds * 1000;
    this.safely(this.options.silenceVoice);
    this.safely(this.options.ringBell);
    this.timer = setTimeout(() => this.finish(), this.options.plan.silenceSeconds * 1000);
  }

  /** Ends now. Called by the student, by a new session, or when leaving the page. */
  cancel(): void {
    if (!this.running) return;
    this.stopTimer();
    this.running = false;
    this.safely(this.options.restoreVoice);
  }

  private finish(): void {
    if (!this.running) return;
    this.stopTimer();
    this.running = false;
    this.safely(this.options.ringBell);
    this.safely(this.options.restoreVoice);
    if (this.options.onEnd) this.safely(() => this.options.onEnd?.(this.options.plan));
  }

  private stopTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private safely(fn: () => void): void {
    try {
      fn();
    } catch {
      // A failed bell or a closed audio device must never strand the session:
      // the next line of finish()/cancel() is the one that un-mutes the voice.
    }
  }
}
