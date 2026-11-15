import { useEffect, useState } from 'preact/hooks';
import { resetJuice } from '../app/juiceStore';
import type { Store } from '../app/store';
import { t } from '../content/i18n';
import { defaultJuice, juiceSpec, type Juice, type Param } from '../content/juice';
import { webStorage } from '../platform/storage';
import type { Sim } from '../sim/sim';
import type { ScaledClock } from '../sim/time';
import styles from './DebugPanel.module.css';

export interface DebugHooks {
  clock: ScaledClock;
  setHitboxes: (visible: boolean) => void;
  particleCount: () => number;
  fps: () => number;
}

interface Props {
  sim: Sim;
  juiceStore: Store<Juice>;
  hooks: DebugHooks;
}

const SPEEDS = [1, 60, 600] as const;

type JuiceGroup = keyof Juice;
type AnyGroup = Record<string, number | string | boolean>;

function setParam(store: Store<Juice>, group: JuiceGroup, key: string, value: number | string | boolean): void {
  const j = store.get();
  const g: AnyGroup = { ...(j[group] as AnyGroup), [key]: value };
  store.set({ ...j, [group]: g } as Juice);
}

function ParamRow({ group, name, param, value, store }: { group: JuiceGroup; name: string; param: Param; value: number | string | boolean; store: Store<Juice> }) {
  const changed = value !== param.def;
  const label = <span class={changed ? styles.changed : undefined} title={`default: ${String(param.def)}`}>{name}</span>;
  switch (param.kind) {
    case 'num':
      return (
        <div class={styles.param}>
          {label}
          <input type="range" min={param.min} max={param.max} step={param.step} value={Number(value)} onInput={(e) => setParam(store, group, name, Number(e.currentTarget.value))} />
          <span class={styles.value}>{Number(value).toFixed(param.step < 0.01 ? 3 : param.step < 1 ? 2 : 0)}</span>
        </div>
      );
    case 'color':
      return (
        <div class={styles.param}>
          {label}
          <input type="color" value={String(value)} onInput={(e) => setParam(store, group, name, e.currentTarget.value)} />
          <span class={styles.value}>{String(value)}</span>
        </div>
      );
    case 'bool':
      return (
        <div class={styles.param}>
          {label}
          <input type="checkbox" checked={Boolean(value)} onChange={(e) => setParam(store, group, name, e.currentTarget.checked)} />
          <span />
        </div>
      );
  }
}

/** Debug-панель (`?debug`, SPEC §13.9): время, состояние, хитбоксы, live-тюнинг juice. */
export function DebugPanel({ sim, juiceStore, hooks }: Props) {
  // На узком экране панель стартует свёрнутой, чтобы не закрывать малыша.
  const [open, setOpen] = useState(window.innerWidth >= 700);
  const [juice, setJuice] = useState(juiceStore.get());
  const [speed, setSpeed] = useState(hooks.clock.multiplier);
  const [mood, setMood] = useState(sim.state.mood);
  const [hitboxes, setHitboxes] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState('');

  useEffect(() => juiceStore.subscribe(setJuice), [juiceStore]);
  useEffect(() => {
    const id = setInterval(() => {
      const s = sim.state;
      setStats(`fps ${hooks.fps().toFixed(0)} · particles ${hooks.particleCount()} · combo ${s.combo.count} · xp ${s.xp.toFixed(1)}`);
    }, 250);
    return () => clearInterval(id);
  }, [sim, hooks]);

  if (!open) {
    return (
      <button class={`${styles.collapsed} interactive`} onClick={() => setOpen(true)}>
        {t('debug.title')} ▸
      </button>
    );
  }

  const copy = async () => {
    const diff: Record<string, AnyGroup> = {};
    for (const [g, values] of Object.entries(juice) as [JuiceGroup, AnyGroup][]) {
      const defaults = defaultJuice[g] as AnyGroup;
      for (const [k, v] of Object.entries(values)) {
        if (v !== defaults[k]) (diff[g] ??= {})[k] = v;
      }
    }
    await navigator.clipboard.writeText(JSON.stringify(diff, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div class={`${styles.panel} interactive`} onPointerDown={(e) => e.stopPropagation()}>
      <div class={styles.header}>
        <span>{t('debug.title')}</span>
        <button onClick={() => setOpen(false)}>✕</button>
      </div>
      <div class={styles.stats}>{stats}</div>

      <div class={styles.row}>
        {t('debug.timeSpeed')}:
        {SPEEDS.map((s) => (
          <button key={s} class={speed === s ? styles.active : undefined} onClick={() => (hooks.clock.setMultiplier(s), setSpeed(s))}>
            ×{s}
          </button>
        ))}
      </div>
      <div class={styles.param}>
        <span>{t('debug.mood')}</span>
        <input type="range" min={0} max={1} step={0.01} value={mood} onInput={(e) => {
          const v = Number(e.currentTarget.value);
          sim.dispatch({ type: 'debug/setMood', mood: v });
          setMood(v);
        }} />
        <span class={styles.value}>{mood.toFixed(2)}</span>
      </div>
      <div class={styles.row}>
        <button onClick={() => sim.dispatch({ type: 'debug/addHearts', amount: 1000 })}>{t('debug.addHearts')}</button>
        <button onClick={() => sim.dispatch({ type: 'debug/resetCombo' })}>{t('debug.resetCombo')}</button>
        <label>
          <input type="checkbox" checked={hitboxes} onChange={(e) => {
            setHitboxes(e.currentTarget.checked);
            hooks.setHitboxes(e.currentTarget.checked);
          }} />
          {t('debug.hitboxes')}
        </label>
      </div>

      <div class={styles.header} style={{ marginTop: 10 }}>
        <span>{t('debug.juice')}</span>
        <span class={styles.row}>
          <button onClick={() => void copy()}>{copied ? t('debug.copied') : t('debug.copyJuice')}</button>
          <button onClick={() => resetJuice(juiceStore, webStorage)}>{t('debug.resetJuice')}</button>
        </span>
      </div>
      {(Object.keys(juiceSpec) as JuiceGroup[]).map((group) => (
        <details key={group}>
          <summary>{group}</summary>
          {Object.entries(juiceSpec[group] as Record<string, Param>).map(([name, param]) => (
            <ParamRow key={name} group={group} name={name} param={param} value={(juice[group] as AnyGroup)[name] ?? param.def} store={juiceStore} />
          ))}
        </details>
      ))}
    </div>
  );
}
