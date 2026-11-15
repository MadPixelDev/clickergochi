/** Единственный источник времени (SPEC §13.4). Время в миллисекундах. */
export interface TimeService {
  now(): number;
}

/**
 * Игровые часы поверх реального источника с debug-множителем.
 * При смене множителя время не прыгает: накопленное сохраняется.
 */
export class ScaledClock implements TimeService {
  private baseReal: number;
  private baseGame: number;
  private mult = 1;

  constructor(private readonly realNow: () => number) {
    this.baseReal = realNow();
    this.baseGame = this.baseReal;
  }

  now(): number {
    return this.baseGame + (this.realNow() - this.baseReal) * this.mult;
  }

  get multiplier(): number {
    return this.mult;
  }

  setMultiplier(mult: number): void {
    const current = this.now();
    this.baseReal = this.realNow();
    this.baseGame = current;
    this.mult = mult;
  }
}

/** Ручные часы для тестов и симуляций баланса. */
export class ManualClock implements TimeService {
  constructor(private t = 0) {}

  now(): number {
    return this.t;
  }

  advance(ms: number): void {
    this.t += ms;
  }
}
