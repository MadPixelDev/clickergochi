/** Демпфированная пружина 1D (масса 1): x'' = −k(x − target) − c·x'. */
export class Spring {
  x: number;
  v = 0;
  target: number;

  constructor(initial = 0) {
    this.x = initial;
    this.target = initial;
  }

  /** Полунеявный Эйлер с сабстепами — стабилен при жёстких пружинах и длинных кадрах. */
  step(dt: number, stiffness: number, damping: number): number {
    const sub = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / sub;
    for (let i = 0; i < sub; i++) {
      const a = -stiffness * (this.x - this.target) - damping * this.v;
      this.v += a * h;
      this.x += this.v * h;
    }
    return this.x;
  }

  kick(velocity: number): void {
    this.v += velocity;
  }

  snap(x: number): void {
    this.x = x;
    this.v = 0;
  }
}
