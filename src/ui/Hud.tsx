import gsap from 'gsap';
import { useEffect, useRef, useState } from 'preact/hooks';
import { t } from '../content/i18n';
import { tierColor, type Juice } from '../content/juice';
import type { Sim } from '../sim/sim';
import { formatNumber } from './format';
import styles from './Hud.module.css';
import { JuicyButton } from './JuicyButton';

interface Props {
  sim: Sim;
  juice: () => Juice;
  reducedMotion: boolean;
  onSettings: () => void;
}

function HeartIcon() {
  return (
    <svg class={styles.heart} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 28C2 19 3 8 9.5 6.5 13 5.7 15 8 16 10c1-2 3-4.3 6.5-3.5C29 8 30 19 16 28z" fill="currentColor" stroke="#6B4A3A" stroke-width="2.5" stroke-linejoin="round" />
    </svg>
  );
}

/** Счётчик, который докручивается твином и подпрыгивает (§10). */
function HeartsCounter({ sim, juice }: { sim: Sim; juice: () => Juice }) {
  const [shown, setShown] = useState(0);
  const pill = useRef<HTMLDivElement>(null);
  const tweenTarget = useRef({ v: 0 });

  useEffect(
    () =>
      sim.events.on('wallet', ({ hearts }) => {
        const h = juice().hud;
        gsap.to(tweenTarget.current, {
          v: hearts,
          duration: h.counterRollMs / 1000,
          ease: 'power2.out',
          overwrite: true,
          onUpdate: () => setShown(tweenTarget.current.v),
        });
        if (pill.current) {
          gsap.fromTo(pill.current, { scale: h.counterBounce }, { scale: 1, duration: 0.3, ease: 'back.out(3)', overwrite: true });
        }
      }),
    [sim, juice],
  );

  return (
    <div ref={pill} class={styles.pill} aria-label={t('hud.hearts')}>
      <HeartIcon />
      {formatNumber(shown)}
    </div>
  );
}

function ComboBadge({ sim, juice, reducedMotion }: { sim: Sim; juice: () => Juice; reducedMotion: boolean }) {
  const [combo, setCombo] = useState({ count: 0, tier: 0 });
  const badge = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const offCombo = sim.events.on('combo', (c) => {
      setCombo(c);
      if (badge.current && c.count > 0 && !reducedMotion) {
        gsap.fromTo(badge.current, { scale: 1.12 }, { scale: 1, duration: 0.2, ease: 'back.out(3)', overwrite: true });
      }
    });
    const offTier = sim.events.on('comboTier', (e) => {
      if (e.reason !== 'up' || !badge.current) return;
      gsap.fromTo(
        badge.current,
        { scale: reducedMotion ? 1.1 : 1.6, rotation: reducedMotion ? 0 : -8 },
        { scale: 1, rotation: 0, duration: 0.45, ease: 'elastic.out(1, 0.45)', overwrite: true },
      );
    });
    return () => {
      offCombo();
      offTier();
    };
  }, [sim, reducedMotion]);

  const visible = combo.count >= 2;
  return (
    <div class={styles.combo} style={{ opacity: visible ? 1 : 0 }}>
      <div ref={badge} class={styles.comboBadge} style={{ background: tierColor(juice(), combo.tier) }}>
        ×{combo.count}
        <small>{t('hud.combo')}</small>
      </div>
    </div>
  );
}

export function Hud({ sim, juice, reducedMotion, onSettings }: Props) {
  const [tapped, setTapped] = useState(false);
  useEffect(() => sim.events.on('tap', () => setTapped(true)), [sim]);

  return (
    <>
      <div class={styles.top}>
        <HeartsCounter sim={sim} juice={juice} />
        <JuicyButton juice={juice} class={styles.iconButton} label={t('hud.settings')} onClick={onSettings}>
          ⚙
        </JuicyButton>
      </div>
      <ComboBadge sim={sim} juice={juice} reducedMotion={reducedMotion} />
      {!tapped && <div class={styles.hint}>👆 {t('hint.tap')}</div>}
    </>
  );
}
