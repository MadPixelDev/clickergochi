import { z } from 'zod';

/**
 * Все параметры отклика (SPEC §8.2, §10). Описаны дескрипторами с диапазонами,
 * чтобы debug-панель строила слайдеры автоматически, а zod валидировал
 * сохранённые переопределения.
 *
 * Время — в мс, если имя заканчивается на Ms, иначе в секундах.
 * Расстояния — в логических юнитах сцены (ширина колонки 1000; на телефоне ~0.375 px/юнит).
 */

export type NumParam = { kind: 'num'; def: number; min: number; max: number; step: number };
export type ColorParam = { kind: 'color'; def: string };
export type BoolParam = { kind: 'bool'; def: boolean };
export type Param = NumParam | ColorParam | BoolParam;
export type ParamGroup = { [key: string]: Param };
export type JuiceSpec = { [group: string]: ParamGroup };

const n = (def: number, min: number, max: number, step = (max - min) / 100): NumParam => ({ kind: 'num', def, min, max, step });
const c = (def: string): ColorParam => ({ kind: 'color', def });
const b = (def: boolean): BoolParam => ({ kind: 'bool', def });

export const juiceSpec = {
  squash: {
    /** Мгновенный scale (1 + a, 1 − a) от точки тапа, §8.2. */
    amount: n(0.12, 0, 0.4),
    stiffness: n(300, 50, 900, 5),
    damping: n(12, 1, 60, 0.5),
    /** Насколько ось сжатия следует за точкой тапа (0 — всегда вертикально). */
    directional: n(0.6, 0, 1),
    headLagStiffness: n(140, 20, 600, 5),
    headLagDamping: n(9, 1, 40, 0.5),
    headLagPx: n(16, 0, 60, 1),
    /** «Желе»: частые тапы не суммируют амплитуду, а снижают частоту пружины. */
    jellyPerTap: n(0.12, 0, 0.5),
    jellyDecayPerSec: n(1.2, 0.1, 5),
    jellyMaxStiffnessDrop: n(0.55, 0, 0.9),
  },
  breathing: {
    period: n(3.2, 1, 8, 0.1),
    scaleY: n(0.02, 0, 0.08, 0.001),
    scaleX: n(0.01, 0, 0.05, 0.001),
  },
  blink: {
    minInterval: n(2, 0.5, 10, 0.1),
    maxInterval: n(6, 1, 15, 0.1),
    closeMs: n(70, 20, 300, 5),
    openMs: n(90, 20, 300, 5),
    doubleChance: n(0.15, 0, 1),
  },
  gaze: {
    /** Смещение глаз, доля диаметра глаза (SPEC: ≤ 6%). */
    maxOffset: n(0.06, 0, 0.3, 0.005),
    stiffness: n(110, 10, 400, 5),
    damping: n(14, 1, 40, 0.5),
    /** Лёгкий поворот головы к пальцу, рад. */
    headTurn: n(0.05, 0, 0.3, 0.005),
    /** Сдвиг всего лица к пальцу (иллюзия поворота головы), юниты кадра рига. */
    faceShift: n(10, 0, 40, 0.5),
    pointerHoldMs: n(1800, 200, 6000, 100),
    /** Дистанция (юниты кадра), на которой взгляд отклоняется полностью. */
    reachPx: n(300, 50, 1000, 10),
    /** Вертикальная доля сдвига лица относительно горизонтальной. */
    faceShiftY: n(0.5, 0, 1),
    wanderMin: n(1.2, 0.2, 6, 0.1),
    wanderMax: n(3.5, 0.5, 10, 0.1),
  },
  ears: {
    stiffness: n(170, 20, 600, 5),
    damping: n(7, 0.5, 40, 0.5),
    /** Импульсы — угловая скорость, рад/с. */
    tapKick: n(3.5, 0, 15, 0.1),
    twitchMin: n(8, 1, 30, 0.5),
    twitchMax: n(15, 2, 40, 0.5),
    twitchKick: n(5, 0, 20, 0.1),
  },
  tail: {
    stiffness: n(80, 10, 400, 5),
    damping: n(4.5, 0.5, 30, 0.5),
    tapKick: n(4.5, 0, 20, 0.1),
    /** Тап прямо по хвосту: множитель tapKick. */
    zoneTapMult: n(2.5, 1, 6, 0.1),
    swayAmp: n(0.09, 0, 0.5, 0.005),
    swayPeriod: n(2.7, 0.5, 8, 0.1),
    twitchMin: n(8, 1, 30, 0.5),
    twitchMax: n(15, 2, 40, 0.5),
    twitchKick: n(7, 0, 20, 0.1),
  },
  expression: {
    happyEyesMs: n(380, 50, 1500, 10),
    mouthOpenMs: n(240, 50, 1000, 10),
    blushPerTap: n(0.18, 0, 1),
    blushDecayPerSec: n(0.5, 0.05, 3),
    blushBase: n(0.35, 0, 1),
  },
  reactions: {
    /** Наклон головы при тапе по голове, рад. */
    headTilt: n(0.14, 0, 0.6, 0.005),
    /** Подпрыгивание при тапе по животу. */
    bellyHopPx: n(14, 0, 60, 1),
    /** Взмах лапкой, рад. */
    pawWave: n(0.7, 0, 2),
    /** Надувание щёк. */
    cheekPuff: n(0.25, 0, 1),
    /** Расширение глаз при тапе по хвосту. */
    surprisedScale: n(0.18, 0, 0.6),
    /** Пружины реакций (наклон, лапка, щёки, глаза). */
    springStiffness: n(200, 20, 800, 5),
    springDamping: n(10, 1, 40, 0.5),
    hopStiffness: n(220, 20, 800, 5),
    hopDamping: n(14, 1, 40, 0.5),
    /** Подпрыгивание радости на новом тире комбо и редком тапе. */
    celebrateHopPx: n(26, 0, 80, 1),
  },
  particles: {
    minCount: n(2, 0, 10, 1),
    maxCount: n(4, 0, 16, 1),
    speedMin: n(520, 0, 2400, 10),
    speedMax: n(860, 0, 2400, 10),
    spreadDeg: n(70, 0, 180, 1),
    gravity: n(1400, 0, 4000, 10),
    drag: n(1.6, 0, 6, 0.1),
    lifeMs: n(800, 100, 3000, 20),
    sizeMin: n(22, 4, 100, 1),
    sizeMax: n(36, 4, 120, 1),
    spin: n(2.5, 0, 12, 0.1),
    maxActive: n(150, 10, 300, 1),
    reducedMotionMult: n(0.4, 0, 1),
  },
  popup: {
    risePx: n(100, 0, 400, 1),
    overshoot: n(1.2, 1, 2, 0.01),
    popMs: n(150, 30, 600, 10),
    lifeMs: n(600, 150, 2000, 10),
    fontSize: n(64, 16, 160, 1),
    jitterPx: n(40, 0, 200, 1),
  },
  comboRing: {
    durationMs: n(480, 100, 1500, 10),
    startRadius: n(240, 20, 800, 5),
    endRadius: n(560, 50, 1200, 5),
      },
  rare: {
    starSize: n(130, 20, 400, 1),
    lifeMs: n(1100, 200, 3000, 20),
    extraParticles: n(10, 0, 40, 1),
  },
  hud: {
    counterRollMs: n(400, 100, 1200, 10),
    counterBounce: n(1.25, 1, 2, 0.01),
    buttonPressScale: n(0.92, 0.7, 1, 0.01),
    buttonReleaseScale: n(1.05, 1, 1.3, 0.01),
  },
  audio: {
    master: n(0.7, 0, 1),
    bopGain: n(0.55, 0, 1),
    /** Нижняя нота пентатоники, Гц (C5). */
    baseFreq: n(523.25, 130, 1100, 0.25),
    octaves: n(2, 1, 3, 1),
    detunePct: n(0.03, 0, 0.15, 0.005),
    /** true — мелодия ходит вверх-вниз, false — по кругу снизу. */
    pingPong: b(true),
    bopDecayMs: n(140, 30, 600, 5),
    bopPitchDrop: n(0.35, 0, 1),
    arpStepMs: n(55, 10, 200, 1),
    bellGain: n(0.45, 0, 1),
    rejectedTapGain: n(0.18, 0, 1),
  },
  haptics: {
    /** Быстрее этого (тап/с) хаптика срабатывает на каждый 2-й тап. */
    fastTapRate: n(8, 1, 20, 1),
    lightMs: n(8, 1, 50, 1),
    mediumMs: n(16, 1, 80, 1),
    heavyMs: n(32, 1, 150, 1),
  },
  colors: {
    tier0: c('#F9C5D1'),
    tier1: c('#FBE7A1'),
    tier2: c('#BFE8D6'),
    tier3: c('#BFDDF5'),
    tier4: c('#D9CCF2'),
    rare: c('#FFD45C'),
    popupText: c('#E2738F'),
    outline: c('#6B4A3A'),
  },
} satisfies JuiceSpec;

type ValueOf<P> = P extends NumParam ? number : P extends ColorParam ? string : P extends BoolParam ? boolean : never;
export type Juice = { [G in keyof typeof juiceSpec]: { [K in keyof (typeof juiceSpec)[G]]: ValueOf<(typeof juiceSpec)[G][K]> } };

function paramSchema(p: Param): z.ZodType {
  switch (p.kind) {
    case 'num':
      return z.number().min(p.min).max(p.max).catch(p.def);
    case 'color':
      return z.string().regex(/^#[0-9a-fA-F]{6}$/).catch(p.def);
    case 'bool':
      return z.boolean().catch(p.def);
  }
}

function buildSchema(spec: JuiceSpec): z.ZodType<Juice> {
  const groups: Record<string, z.ZodType> = {};
  for (const [g, params] of Object.entries(spec)) {
    const shape: Record<string, z.ZodType> = {};
    for (const [k, p] of Object.entries(params)) shape[k] = paramSchema(p);
    groups[g] = z.object(shape).prefault({});
  }
  return z.object(groups) as unknown as z.ZodType<Juice>;
}

/** Схема: невалидные/недостающие значения заменяются дефолтами. */
export const juiceSchema = buildSchema(juiceSpec);

export const defaultJuice: Juice = juiceSchema.parse({});

export function tierColor(j: Juice, tier: number): string {
  const key = `tier${Math.max(0, Math.min(4, tier))}` as 'tier0' | 'tier1' | 'tier2' | 'tier3' | 'tier4';
  return j.colors[key];
}
