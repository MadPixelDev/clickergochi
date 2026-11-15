const ru = {
  'hud.hearts': 'Сердечки',
  'hud.combo': 'комбо',
  'hud.settings': 'Настройки',
  'settings.title': 'Настройки',
  'settings.sound': 'Звук',
  'settings.haptics': 'Вибрация',
  'settings.reducedMotion': 'Меньше движения',
  'settings.close': 'Готово',
  'hint.tap': 'Потапай малыша',
  'debug.title': 'Debug',
  'debug.timeSpeed': 'Скорость времени',
  'debug.mood': 'Настроение',
  'debug.addHearts': '+1000 ♥',
  'debug.resetCombo': 'Сбросить комбо',
  'debug.hitboxes': 'Хитбоксы и якоря',
  'debug.juice': 'Juice (live)',
  'debug.copyJuice': 'Скопировать JSON',
  'debug.resetJuice': 'Сбросить juice',
  'debug.copied': 'Скопировано',
} as const;

export type I18nKey = keyof typeof ru;

const en: Record<I18nKey, string> = {
  'hud.hearts': 'Hearts',
  'hud.combo': 'combo',
  'hud.settings': 'Settings',
  'settings.title': 'Settings',
  'settings.sound': 'Sound',
  'settings.haptics': 'Haptics',
  'settings.reducedMotion': 'Reduce motion',
  'settings.close': 'Done',
  'hint.tap': 'Tap the baby',
  'debug.title': 'Debug',
  'debug.timeSpeed': 'Time speed',
  'debug.mood': 'Mood',
  'debug.addHearts': '+1000 ♥',
  'debug.resetCombo': 'Reset combo',
  'debug.hitboxes': 'Hitboxes & anchors',
  'debug.juice': 'Juice (live)',
  'debug.copyJuice': 'Copy JSON',
  'debug.resetJuice': 'Reset juice',
  'debug.copied': 'Copied',
};

export const LOCALES = { ru, en } as const;
export type Locale = keyof typeof LOCALES;

let current: Locale = 'ru';

export function setLocale(locale: Locale): void {
  current = locale;
}

export function detectLocale(languages: readonly string[]): Locale {
  for (const lang of languages) {
    const base = lang.slice(0, 2).toLowerCase();
    if (base === 'ru' || base === 'en') return base;
  }
  return 'en';
}

export function t(key: I18nKey): string {
  return LOCALES[current][key];
}
