import { z } from 'zod';

/**
 * Все числа баланса (SPEC §4.4, §9.2). В коде sim магических чисел нет —
 * только ссылки на эту структуру.
 */
export const balanceSchema = z.object({
  sim: z.object({
    /** Fixed-step sim, SPEC §13.3. */
    tickMs: z.number().positive(),
  }),
  tap: z.object({
    baseXp: z.number().positive(),
    baseHearts: z.number().positive(),
    /** moodMult = moodMultBase + moodMultScale × mood² (§4.4). */
    moodMultBase: z.number(),
    moodMultScale: z.number(),
    /** Антиавтокликер: не больше N засчитанных тапов в окне. */
    maxTapsPerWindow: z.number().int().positive(),
    rateWindowMs: z.number().positive(),
    /** Редкий «золотой» тап (§10): шанс и множитель сердечек. */
    rareChance: z.number().min(0).max(1),
    rareHeartsMult: z.number().positive(),
    /** Сердечки за тап: × (1 + heartsPerComboTier × тир комбо), §9.2. */
    heartsPerComboTier: z.number().min(0),
  }),
  combo: z.object({
    /** Тап в этом окне после предыдущего продлевает комбо. */
    windowMs: z.number().positive(),
    /** Пороги тиров: 10 / 30 / 60 / 100. */
    tierThresholds: z.array(z.number().int().positive()),
    /** Множители XP по тирам (индекс 0 = без тира). */
    tierMults: z.array(z.number().positive()),
    /** Без тапов дольше этого комбо сползает на тир вниз. */
    decayAfterMs: z.number().positive(),
  }),
  mood: z.object({
    /** В M0 потребностей нет — настроение фиксировано (крутится в debug). */
    default: z.number().min(0).max(1),
  }),
});

export type Balance = z.infer<typeof balanceSchema>;

export const balance: Balance = balanceSchema.parse({
  sim: { tickMs: 100 },
  tap: {
    baseXp: 1,
    baseHearts: 1,
    moodMultBase: 0.5,
    moodMultScale: 2.5,
    maxTapsPerWindow: 12,
    rateWindowMs: 1000,
    rareChance: 1 / 50,
    rareHeartsMult: 5,
    heartsPerComboTier: 0.1,
  },
  combo: {
    windowMs: 450,
    tierThresholds: [10, 30, 60, 100],
    tierMults: [1, 1.2, 1.4, 1.7, 2.0],
    decayAfterMs: 1500,
  },
  mood: { default: 0.8 },
});
