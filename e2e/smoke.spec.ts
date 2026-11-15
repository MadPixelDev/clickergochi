import { expect, test, type Page } from '@playwright/test';

interface Hook {
  state: () => { hearts: number; combo: { count: number } };
  headPoint: () => { x: number; y: number };
  petCenter: () => { x: number; y: number };
  fps: () => number;
}

async function petPoints(page: Page) {
  return page.evaluate(() => {
    const h = (window as unknown as { __fluffnest: Hook }).__fluffnest;
    const head = h.headPoint();
    const neck = h.petCenter();
    return { head: { x: head.x, y: head.y + 60 }, belly: { x: neck.x, y: neck.y + 70 } };
  });
}

test('M0: малыш на экране, тапы дают сердечки и комбо, без ошибок', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto('/');
  await page.waitForFunction(() => 'window' in globalThis && '__fluffnest' in window);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/screens/m0-idle.png' });

  const pts = await petPoints(page);
  for (let i = 0; i < 14; i++) {
    const p = i % 2 === 0 ? pts.head : pts.belly;
    await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(110);
  }
  // Кадр в середине отклика: частицы, «+N», комбо.
  await page.waitForTimeout(40);
  await page.screenshot({ path: 'test-results/screens/m0-combo.png' });

  const state = await page.evaluate(() => (window as unknown as { __fluffnest: Hook }).__fluffnest.state());
  expect(state.hearts).toBeGreaterThan(10);
  expect(state.combo.count).toBeGreaterThanOrEqual(10);
  expect(errors).toEqual([]);
  const fps = await page.evaluate(() => (window as unknown as { __fluffnest: Hook }).__fluffnest.fps());
  test.info().annotations.push({ type: 'fps', description: fps.toFixed(1) });
});

test('debug-панель открывается по ?debug', async ({ page }) => {
  await page.goto('/?debug');
  await page.getByText('Debug ▸').click();
  await expect(page.getByText('Juice (live)')).toBeVisible();
  await page.getByText('squash', { exact: true }).click();
  await page.screenshot({ path: 'test-results/screens/m0-debug.png' });
});
