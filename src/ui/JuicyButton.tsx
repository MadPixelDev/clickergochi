import gsap from 'gsap';
import type { ComponentChildren } from 'preact';
import { useRef } from 'preact/hooks';
import type { Juice } from '../content/juice';

interface Props {
  juice: () => Juice;
  onClick: () => void;
  class?: string;
  label: string;
  children: ComponentChildren;
}

/** Кнопка с откликом: нажатие 0.92, отпускание 1.05 → 1 (SPEC §10). */
export function JuicyButton(p: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const down = () => {
    if (ref.current) gsap.to(ref.current, { scale: p.juice().hud.buttonPressScale, duration: 0.08, ease: 'power2.out' });
  };
  const up = () => {
    if (!ref.current) return;
    gsap
      .timeline()
      .to(ref.current, { scale: p.juice().hud.buttonReleaseScale, duration: 0.1, ease: 'power2.out' })
      .to(ref.current, { scale: 1, duration: 0.18, ease: 'back.out(3)' });
  };
  return (
    <button ref={ref} class={p.class} aria-label={p.label} onPointerDown={down} onPointerUp={up} onPointerLeave={up} onClick={p.onClick}>
      {p.children}
    </button>
  );
}
