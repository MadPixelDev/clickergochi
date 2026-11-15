import { defaultJuice, juiceSchema, type Juice } from '../content/juice';
import { readJson, type KeyValueStorage } from '../platform/storage';
import { Store } from './store';

const KEY = 'fluffnest.debug.juice';

/**
 * Live-тюнинг juice. Переопределения сохраняются только в debug-режиме,
 * в обычной сборке всегда используются значения из content/juice.ts.
 */
export function createJuiceStore(storage: KeyValueStorage, debug: boolean): Store<Juice> {
  const stored = debug ? readJson(storage, KEY) : undefined;
  const store = new Store<Juice>(stored === undefined ? defaultJuice : juiceSchema.parse(stored));
  if (debug) store.subscribe((j) => storage.set(KEY, JSON.stringify(j)));
  return store;
}

export function resetJuice(store: Store<Juice>, storage: KeyValueStorage): void {
  storage.remove(KEY);
  store.set(defaultJuice);
}
