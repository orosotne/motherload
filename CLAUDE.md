# CLAUDE.md

Záväzná špecifikácia hry je GAME_SPEC.md. Pri konflikte má prednosť.

## Príkazy

- `npm run check`: typecheck, lint, formát a testy. Spusti pred každým commitom.
- `npm run build`: typecheck a produkčný build. Musí prejsť pred hlásením „hotovo“ (§11.3).
- `npm run dev`, `npm run preview`: dev server a produkčný build. Debug nástroje v builde zapne `?debug` alebo `#debug`.

## Kde čo je

- Rozhodnutia sú v DECISIONS.md (§11.7), licencie v CREDITS.md.
- Hranice architektúry vynucuje `eslint.config.js`: logika bez `three` a bez `Math.random`.
- Ladiace hodnoty patria do `src/data/`, nie do kódu.
