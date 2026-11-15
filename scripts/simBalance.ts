/**
 * npm run sim:balance — модель игрока поверх настоящего Sim (SPEC §13.8).
 * M0: только тап-ядро — что даёт 30-секундная сессия при разном темпе тапов.
 * Рост по стадиям и экономика добавятся в M1–M2.
 */
import { balance } from '../src/content/balance';
import { Rng } from '../src/sim/rng';
import { Sim } from '../src/sim/sim';
import { ManualClock } from '../src/sim/time';

interface Profile {
  name: string;
  /** Средний интервал между тапами, мс. */
  intervalMs: number;
  /** Разброс интервала ±, мс. */
  jitterMs: number;
  /** Шанс паузы 1–2.5 с (отвлёкся). */
  pauseChance: number;
}

const PROFILES: Profile[] = [
  { name: 'спокойный (3 тап/с)', intervalMs: 330, jitterMs: 120, pauseChance: 0.03 },
  { name: 'увлечённый (6 тап/с)', intervalMs: 165, jitterMs: 60, pauseChance: 0.01 },
  { name: 'барабанщик (10 тап/с)', intervalMs: 100, jitterMs: 30, pauseChance: 0.005 },
  { name: 'автокликер (30 тап/с)', intervalMs: 33, jitterMs: 0, pauseChance: 0 },
];

const SESSION_MS = 30_000;

function run(p: Profile, seed: number) {
  const clock = new ManualClock(0);
  const rng = new Rng(seed);
  const sim = new Sim(balance, clock, rng);
  const player = new Rng(seed + 1);
  let taps = 0;
  let accepted = 0;
  let rares = 0;
  let maxCombo = 0;
  const tierAt: (number | null)[] = balance.combo.tierThresholds.map(() => null);
  sim.events.on('tap', (e) => {
    taps++;
    if (e.accepted) accepted++;
    if (e.rare) rares++;
    maxCombo = Math.max(maxCombo, e.comboCount);
    if (e.comboTier > 0 && tierAt[e.comboTier - 1] === null) tierAt[e.comboTier - 1] = clock.now();
  });

  let nextTick = balance.sim.tickMs;
  while (clock.now() < SESSION_MS) {
    let wait = p.intervalMs + player.range(-p.jitterMs, p.jitterMs);
    if (player.chance(p.pauseChance)) wait += player.range(1000, 2500);
    const target = clock.now() + Math.max(1, wait);
    while (nextTick <= target) {
      clock.advance(nextTick - clock.now());
      sim.tick();
      nextTick += balance.sim.tickMs;
    }
    clock.advance(target - clock.now());
    sim.dispatch({ type: 'tap', zone: 'head', point: { x: 0, y: 0 } });
  }
  return { taps, accepted, rares, maxCombo, tierAt, hearts: sim.state.hearts, xp: sim.state.xp };
}

console.log(`Сессия ${SESSION_MS / 1000} с, mood = ${balance.mood.default}\n`);
for (const p of PROFILES) {
  const r = run(p, 42);
  const tiers = r.tierAt.map((t, i) => `T${i + 1}:${t === null ? '—' : `${(t / 1000).toFixed(1)}с`}`).join(' ');
  console.log(
    `${p.name.padEnd(24)} тапов ${String(r.taps).padStart(4)} (засчитано ${String(r.accepted).padStart(4)})  ` +
      `♥ ${r.hearts.toFixed(0).padStart(4)}  XP ${r.xp.toFixed(0).padStart(5)}  макс.комбо ${String(r.maxCombo).padStart(3)}  золотых ${r.rares}  ${tiers}`,
  );
}
