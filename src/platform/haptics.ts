import type { Juice } from '../content/juice';

export type HapticLevel = 'light' | 'medium' | 'heavy' | 'selection';

export interface Haptics {
  setEnabled(enabled: boolean): void;
  impact(level: HapticLevel): void;
}

/**
 * Web-адаптер: navigator.vibrate (Android Chrome). На iOS Safari вибрации нет —
 * там хаптика появится через Capacitor Haptics (M5).
 */
export class WebHaptics implements Haptics {
  private enabled = true;

  constructor(private readonly juice: () => Juice) {}

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  impact(level: HapticLevel): void {
    if (!this.enabled || typeof navigator.vibrate !== 'function') return;
    const h = this.juice().haptics;
    const ms = level === 'heavy' ? h.heavyMs : level === 'medium' ? h.mediumMs : h.lightMs;
    try {
      navigator.vibrate(ms);
    } catch {
      // vibrate может быть запрещён без жеста пользователя
    }
  }
}
