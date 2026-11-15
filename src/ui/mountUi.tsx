import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { Settings } from '../app/settings';
import type { Store } from '../app/store';
import type { Juice } from '../content/juice';
import { DebugPanel, type DebugHooks } from '../debug/DebugPanel';
import type { Sim } from '../sim/sim';
import { Hud } from './Hud';
import { SettingsSheet } from './SettingsSheet';

interface UiDeps {
  sim: Sim;
  settings: Store<Settings>;
  juiceStore: Store<Juice>;
  juice: () => Juice;
  debug: DebugHooks | null;
}

function App({ sim, settings, juiceStore, juice, debug }: UiDeps) {
  const [s, setS] = useState(settings.get());
  const [showSettings, setShowSettings] = useState(false);
  useEffect(() => settings.subscribe(setS), [settings]);

  return (
    <>
      <Hud sim={sim} juice={juice} reducedMotion={s.reducedMotion} onSettings={() => setShowSettings(true)} />
      {showSettings && <SettingsSheet settings={settings} value={s} juice={juice} onClose={() => setShowSettings(false)} />}
      {debug && <DebugPanel sim={sim} juiceStore={juiceStore} hooks={debug} />}
    </>
  );
}

export function mountUi(el: HTMLElement, deps: UiDeps): void {
  render(<App {...deps} />, el);
}
