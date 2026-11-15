/** Раскладка детской для M0 (до полноценной комнаты M3). Логические юниты, SPEC §7.2. */
export const nurseryLayout = {
  /** Логическая ширина колонки контента. */
  worldWidth: 1000,
  /** Минимальная логическая высота, под которую подбирается масштаб на широких экранах. */
  minWorldHeight: 1500,
  /** Задняя линия пола — доля высоты экрана. */
  floorBackRatio: 0.66,
  /** Линия земли малыша ниже задней линии пола. */
  petGroundOffset: 70,
  /** Масштаб кадра рига (512) в мире. */
  petScale: 1.6,
  /** Ограничение devicePixelRatio, SPEC §13.7. */
  maxDpr: 2,
  /** Контур в кадре рига. */
  outlineWidth: 5,
  shadow: { rx: 150, ry: 26, alpha: 0.16, rings: 4 },
  room: {
    wall: '#FFF1E2',
    wallStripe: '#FCE6D3',
    stripeWidth: 46,
    trim: '#F2CDB4',
    trimHeight: 22,
    floor: '#EBC9A5',
    floorLine: '#DDB48D',
    plankHeight: 46,
  },
  palette: {
    eye: '#3B2A26',
    eyeHighlight: '#FFFFFF',
    mouth: '#6B4A3A',
    mouthInside: '#E98A9E',
    nose: '#F29BB0',
    blush: '#F7A8BB',
    outline: '#6B4A3A',
    debugHitbox: '#FF4D7A',
    debugAnchor: '#2E86DE',
  },
} as const;
