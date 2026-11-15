import { z } from 'zod';
import { TAP_ZONES } from '../../sim/sim';

/**
 * Подмножество формата rig.json (SPEC §13.6), которого хватает для M0:
 * части с пивотами, якоря, хитбоксы. Пока арта нет, у части есть `placeholder` —
 * описание пастельного эллипса, который рисует view (SPEC §13.11).
 */
const vec2 = z.tuple([z.number(), z.number()]);

export const PART_IDS = ['tail', 'feet', 'body', 'paw_fl', 'paw_fr', 'head', 'ear_l', 'ear_r'] as const;
export type PartId = (typeof PART_IDS)[number];

const placeholderShape = z.object({
  shape: z.enum(['ellipse', 'ear', 'tail']),
  /** Центр фигуры относительно пивота части. */
  offset: vec2,
  rx: z.number().positive(),
  ry: z.number().positive(),
  fill: z.string(),
  /** Пятна окраса (calico) — эллипсы поверх, обрезаются по фигуре. */
  patches: z.array(z.object({ offset: vec2, rx: z.number(), ry: z.number(), fill: z.string() })).default([]),
  inner: z.object({ fill: z.string(), scale: z.number() }).optional(),
});

export const rigSchema = z.object({
  id: z.string(),
  size: vec2,
  groundY: z.number(),
  parts: z.array(
    z.object({
      id: z.enum(PART_IDS),
      parent: z.enum(PART_IDS).nullable(),
      /** Пивот в координатах родителя (для корня — в координатах кадра). */
      pos: vec2,
      z: z.number(),
      placeholder: placeholderShape,
    }),
  ),
  face: z.object({
    part: z.literal('head'),
    eyeOffsetX: z.number(),
    eyeY: z.number(),
    eyeRx: z.number(),
    eyeRy: z.number(),
    mouthY: z.number(),
    blushOffsetX: z.number(),
    blushY: z.number(),
    blushRx: z.number(),
    blushRy: z.number(),
  }),
  anchors: z.record(z.string(), z.object({ part: z.enum(PART_IDS), pos: vec2 })),
  hitboxes: z.array(
    z.object({
      zone: z.enum(TAP_ZONES),
      part: z.enum(PART_IDS),
      center: vec2,
      rx: z.number().positive(),
      ry: z.number().positive(),
      /** Чем выше, тем раньше проверяется (мелкие зоны поверх крупных). */
      priority: z.number(),
    }),
  ),
});

export type Rig = z.infer<typeof rigSchema>;
export type RigPart = Rig['parts'][number];
