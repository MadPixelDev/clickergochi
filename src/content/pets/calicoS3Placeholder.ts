import { rigSchema, type Rig } from './rigSchema';

/**
 * Процедурный плейсхолдер котёнка calico, стадия 3 «Кроха» (голова : тело ≈ 1.3 : 1,
 * ART_PIPELINE §1). Кадр 512×512, groundY — линия контакта с полом.
 */
const CREAM = '#FFF3E4';
const ORANGE = '#F6C08E';
const BROWN = '#A88270';
const PINK = '#F9C5D1';

export const calicoS3Placeholder: Rig = rigSchema.parse({
  id: 'calico_s3_placeholder',
  size: [512, 512],
  groundY: 470,
  parts: [
    {
      id: 'body', parent: null, pos: [256, 470], z: 0,
      placeholder: {
        shape: 'ellipse', offset: [0, -78], rx: 96, ry: 84, fill: CREAM,
        patches: [{ offset: [-52, -110], rx: 48, ry: 40, fill: ORANGE }, { offset: [62, -54], rx: 34, ry: 30, fill: BROWN }],
      },
    },
    {
      id: 'tail', parent: 'body', pos: [78, -48], z: -1,
      placeholder: { shape: 'tail', offset: [0, 0], rx: 22, ry: 110, fill: ORANGE, patches: [{ offset: [0, -86], rx: 20, ry: 26, fill: BROWN }] },
    },
    {
      id: 'feet', parent: 'body', pos: [0, -14], z: 1,
      placeholder: { shape: 'ellipse', offset: [0, 0], rx: 82, ry: 22, fill: CREAM },
    },
    {
      id: 'paw_fl', parent: 'body', pos: [-38, -60], z: 3,
      placeholder: { shape: 'ellipse', offset: [0, 30], rx: 22, ry: 30, fill: CREAM, inner: { fill: PINK, scale: 0.35 } },
    },
    {
      id: 'paw_fr', parent: 'body', pos: [38, -60], z: 3,
      placeholder: { shape: 'ellipse', offset: [0, 30], rx: 22, ry: 30, fill: CREAM, inner: { fill: PINK, scale: 0.35 } },
    },
    {
      id: 'head', parent: 'body', pos: [0, -150], z: 2,
      placeholder: {
        shape: 'ellipse', offset: [0, -76], rx: 128, ry: 104, fill: CREAM,
        patches: [{ offset: [-78, -140], rx: 70, ry: 58, fill: ORANGE }, { offset: [86, -128], rx: 52, ry: 44, fill: BROWN }],
      },
    },
    {
      id: 'ear_l', parent: 'head', pos: [-74, -156], z: -1,
      placeholder: { shape: 'ear', offset: [0, 0], rx: 42, ry: 64, fill: ORANGE, inner: { fill: PINK, scale: 0.55 } },
    },
    {
      id: 'ear_r', parent: 'head', pos: [74, -156], z: -1,
      placeholder: { shape: 'ear', offset: [0, 0], rx: 42, ry: 64, fill: BROWN, inner: { fill: PINK, scale: 0.55 } },
    },
  ],
  face: {
    part: 'head', eyeOffsetX: 50, eyeY: -76, eyeRx: 24, eyeRy: 30,
    mouthY: -32, blushOffsetX: 82, blushY: -40, blushRx: 22, blushRy: 13,
  },
  anchors: {
    mouth: { part: 'head', pos: [0, -32] },
    head_top: { part: 'head', pos: [0, -180] },
    neck: { part: 'body', pos: [0, -150] },
    paw_l: { part: 'paw_fl', pos: [0, 56] },
    paw_r: { part: 'paw_fr', pos: [0, 56] },
    back: { part: 'body', pos: [-40, -100] },
  },
  hitboxes: [
    { zone: 'cheek', part: 'head', center: [-82, -40], rx: 34, ry: 30, priority: 3 },
    { zone: 'cheek', part: 'head', center: [82, -40], rx: 34, ry: 30, priority: 3 },
    { zone: 'paw', part: 'paw_fl', center: [0, 30], rx: 30, ry: 38, priority: 3 },
    { zone: 'paw', part: 'paw_fr', center: [0, 30], rx: 30, ry: 38, priority: 3 },
    { zone: 'tail', part: 'tail', center: [0, -60], rx: 34, ry: 90, priority: 2 },
    { zone: 'head', part: 'head', center: [0, -86], rx: 150, ry: 126, priority: 1 },
    { zone: 'belly', part: 'body', center: [0, -78], rx: 112, ry: 100, priority: 0 },
  ],
});
