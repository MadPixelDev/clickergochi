import type { Settings } from '../app/settings';
import type { Store } from '../app/store';
import { t, type I18nKey } from '../content/i18n';
import type { Juice } from '../content/juice';
import { JuicyButton } from './JuicyButton';
import styles from './SettingsSheet.module.css';

interface Props {
  settings: Store<Settings>;
  value: Settings;
  juice: () => Juice;
  onClose: () => void;
}

const TOGGLES: { key: 'sound' | 'haptics' | 'reducedMotion'; label: I18nKey }[] = [
  { key: 'sound', label: 'settings.sound' },
  { key: 'haptics', label: 'settings.haptics' },
  { key: 'reducedMotion', label: 'settings.reducedMotion' },
];

export function SettingsSheet({ settings, value, juice, onClose }: Props) {
  return (
    <div class={`${styles.backdrop} interactive`} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div class={styles.sheet} role="dialog" aria-label={t('settings.title')}>
        <h2 class={styles.title}>{t('settings.title')}</h2>
        {TOGGLES.map(({ key, label }) => (
          <label key={key} class={styles.row}>
            {t(label)}
            <input type="checkbox" checked={value[key]} onChange={(e) => settings.set({ ...value, [key]: e.currentTarget.checked })} />
          </label>
        ))}
        <JuicyButton juice={juice} class={styles.done} label={t('settings.close')} onClick={onClose}>
          {t('settings.close')}
        </JuicyButton>
      </div>
    </div>
  );
}
