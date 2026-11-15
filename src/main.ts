import { Application } from 'pixi.js';
import { createJuiceStore } from './app/juiceStore';
import { createSettingsStore } from './app/settings';
import { balance } from './content/balance';
import { detectLocale, setLocale } from './content/i18n';
import { calicoS3Placeholder } from './content/pets/calicoS3Placeholder';
import { nurseryLayout } from './content/scene';
import { SynthAudio } from './platform/audio';
import { WebHaptics } from './platform/haptics';
import { webStorage } from './platform/storage';
import { Rng } from './sim/rng';
import { Sim } from './sim/sim';
import { ScaledClock } from './sim/time';
import { mountUi } from './ui/mountUi';
import { Particles } from './view/fx/Particles';
import { Popups } from './view/fx/Popups';
import { createFxTextures } from './view/fx/textures';
import { JuiceDirector } from './view/juice/JuiceDirector';
import { NurseryScene } from './view/NurseryScene';
import { PetView } from './view/pet/PetView';
import './ui/global.css';

async function boot(): Promise<void> {
  const debug = new URLSearchParams(location.search).has('debug');
  setLocale(detectLocale(navigator.languages));

  const settings = createSettingsStore(webStorage, matchMedia('(prefers-reduced-motion: reduce)').matches);
  const juiceStore = createJuiceStore(webStorage, debug);
  const juice = () => juiceStore.get();

  // Sim: детерминированный, время только через TimeService.
  const clock = new ScaledClock(() => performance.now());
  const seed = (Date.now() ^ 0x9e3779b9) >>> 0;
  const sim = new Sim(balance, clock, new Rng(seed));
  // У view своя ветка RNG, чтобы визуальный шум не влиял на sim.
  const viewRng = new Rng(seed ^ 0x5bd1e995);

  const stage = document.getElementById('stage');
  if (!stage) throw new Error('#stage not found');
  const app = new Application();
  await app.init({
    resizeTo: window,
    background: nurseryLayout.room.wall,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, nurseryLayout.maxDpr),
  });
  stage.appendChild(app.canvas);

  const pet = new PetView(calicoS3Placeholder, juice, viewRng);
  const scene = new NurseryScene(pet);
  const particles = new Particles(juice, viewRng);
  const popups = new Popups(juice, viewRng);
  scene.fxLayer.addChild(particles.root, popups.root);
  app.stage.addChild(scene.root);

  const textures = createFxTextures(app.renderer);
  const audio = new SynthAudio(juice);
  const haptics = new WebHaptics(juice);
  const applySettings = () => {
    audio.setEnabled(settings.get().sound);
    haptics.setEnabled(settings.get().haptics);
  };
  applySettings();
  settings.subscribe(applySettings);

  new JuiceDirector({ events: sim.events, pet, scene, particles, popups, textures, audio, haptics, rng: viewRng, juice, settings: () => settings.get() });

  // Ввод → Command. View сам состояние sim не меняет.
  scene.enableInput(
    (e) => {
      audio.unlock();
      pet.lookAt(e.global);
      const zone = pet.hitTest(e.global);
      if (zone) sim.dispatch({ type: 'tap', zone, point: { x: e.global.x, y: e.global.y } });
    },
    (e) => pet.lookAt(e.global),
  );

  const layout = () => {
    scene.layout(app.screen.width, app.screen.height);
    scene.root.hitArea = app.screen;
  };
  layout();
  app.renderer.on('resize', layout);

  // Fixed-step sim 10 Гц, рендер — каждый кадр.
  let acc = 0;
  app.ticker.add((ticker) => {
    const dt = Math.min(ticker.deltaMS, 100) / 1000;
    acc += ticker.deltaMS;
    while (acc >= balance.sim.tickMs) {
      sim.tick();
      acc -= balance.sim.tickMs;
    }
    pet.update(dt);
    particles.update(dt);
    scene.update(pet.squashAmount, juice().squash.amount);
  });

  const ui = document.getElementById('ui');
  if (!ui) throw new Error('#ui not found');
  mountUi(ui, {
    sim,
    settings,
    juiceStore,
    juice,
    debug: debug
      ? {
          clock,
          setHitboxes: (v: boolean) => pet.setDebug(v),
          particleCount: () => particles.activeCount,
          fps: () => app.ticker.FPS,
        }
      : null,
  });

  // Хук для e2e: доступ к состоянию только на чтение.
  (window as unknown as { __fluffnest?: unknown }).__fluffnest = {
    state: () => sim.state,
    petCenter: () => pet.anchorGlobal('neck'),
    headPoint: () => pet.anchorGlobal('head_top'),
    fps: () => app.ticker.FPS,
  };
}

void boot();
