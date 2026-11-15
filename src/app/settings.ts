import { z } from 'zod';
import { readJson, type KeyValueStorage } from '../platform/storage';
import { Store } from './store';

export const settingsSchema = z.object({
  version: z.literal(1).catch(1),
  sound: z.boolean().catch(true),
  haptics: z.boolean().catch(true),
  reducedMotion: z.boolean().catch(false),
});

export type Settings = z.infer<typeof settingsSchema>;

const KEY = 'fluffnest.settings';

export function createSettingsStore(storage: KeyValueStorage, prefersReducedMotion: boolean): Store<Settings> {
  const stored = readJson(storage, KEY);
  const initial = settingsSchema.parse(stored ?? { reducedMotion: prefersReducedMotion });
  const store = new Store<Settings>(initial);
  store.subscribe((s) => storage.set(KEY, JSON.stringify(s)));
  return store;
}
