# Fluffnest

Уютный 2D кликер-тамагочи: растим малыша-зверушку тапами и заботой, выращенные питомцы живут в домике-приюте.

- Геймдизайн и техника: [docs/SPEC.md](docs/SPEC.md)
- Арт-пайплайн: [docs/ART_PIPELINE.md](docs/ART_PIPELINE.md)
- Инструкции для Claude Code: [CLAUDE.md](CLAUDE.md)

## Запуск
```bash
npm install
npm run dev            # http://localhost:5173  (debug: /?debug)
npm test               # юнит-тесты sim
npm run sim:balance    # модель игрока
npx playwright install chromium && npm run e2e   # смоук + скриншоты в test-results/screens
npm run build
```

Текущий этап: **M0 — Feel prototype**, чеклист в [docs/milestones/M0.md](docs/milestones/M0.md).
