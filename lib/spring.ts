/**
 * Semi-implicit Euler spring. Under-damped on purpose: the overshoot + settle
 * is what gives the "Lusion" physical feel (vs. a plain lerp, which never overshoots).
 */
export class Spring {
  x: number;
  v = 0;
  constructor(x = 0, public k = 90, public c = 11) {
    this.x = x;
  }
  step(target: number, dt: number) {
    // sub-step for stability at low frame rates
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const f = (target - this.x) * this.k - this.v * this.c;
      this.v += f * h;
      this.x += this.v * h;
    }
    return this.x;
  }
  impulse(v: number) {
    this.v += v;
  }
}

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** remap v from [a,b] → [0,1], clamped */
export const range = (v: number, a: number, b: number) => clamp((v - a) / (b - a));
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
