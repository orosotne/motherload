# HLBINA

2.5D ťažobná hra typu dig → sell → upgrade v TypeScripte a Three.js. Záväzná špecifikácia je v [GAME_SPEC.md](GAME_SPEC.md).

## Spustenie na Macu

Potrebuješ Node.js 22.13 alebo novší, odporúčaný je 24 LTS. Over to cez `node -v`. Ak Node nemáš, stiahni LTS z [nodejs.org](https://nodejs.org) alebo použi `nvm install` (číta `.nvmrc`).

```sh
git clone https://github.com/orosotne/motherload.git
cd motherload
npm install
npm run dev
```

Potom otvor http://localhost:5173 v Chrome alebo Safari.

## Príkazy

| Príkaz            | Čo robí                                         |
| ----------------- | ----------------------------------------------- |
| `npm run dev`     | dev server s debug nástrojmi                    |
| `npm run build`   | typecheck a produkčný build do `dist/`          |
| `npm run preview` | spustí produkčný build na http://localhost:4173 |
| `npm test`        | testy (Vitest)                                  |
| `npm run lint`    | ESLint                                          |
| `npm run format`  | naformátuje kód (Prettier)                      |
| `npm run check`   | typecheck, lint, formát a testy naraz           |

## Debug nástroje

V dev režime sú zapnuté vždy. V produkčnom builde ich zapneš pridaním `?debug` alebo `#debug` do adresy, napríklad http://localhost:4173/?debug.

- **FPS meter** vľavo dole: fps, čas snímky, CPU čas a draw calls (rozpočet je 200).
- **Panel** vpravo hore: pauza a krokovanie simulácie, spomalenie, interpolácia, kamera.
- **Kláves vľavo od 1** všetko skryje alebo znova zobrazí.

## Štruktúra

Priečinky zodpovedajú GAME_SPEC.md §9. Logika (`core/`, `data/`, `world/`, `sim/`, `story/`, `save/`) nesmie importovať Three.js ani používať `Math.random`. Stráži to ESLint.

Rozhodnutia, ktoré špecifikácia nechala otvorené, sú v [DECISIONS.md](DECISIONS.md). Licencie sú v [CREDITS.md](CREDITS.md).
