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

## Ovládanie

| Klávesy              | Akcia                                     |
| -------------------- | ----------------------------------------- |
| A / D alebo ← / →    | jazda a vŕtanie do strán                  |
| S alebo ↓            | vŕtanie dole                              |
| W, ↑ alebo medzerník | let                                       |
| E                    | vstup do budovy, keď modul stojí pred ňou |
| Esc alebo E          | zatvorí obchod                            |

Nahor ani vo vzduchu sa vŕtať nedá. V obchode vyberáš šípkami alebo WASD a potvrdzuješ Enterom či medzerníkom. Ovládač (gamepad) príde vo fáze F4.

## Ako sa hrá

1. Vŕtaj dole a zbieraj minerály. Náklad, palivo, trup a hĺbku vidíš vľavo hore.
2. Vráť sa na povrch skôr, než minieš palivo. Let nahor míňa najviac.
3. Pred **Mirin Výkup** (červená budova) stlač E a predaj náklad.
4. U **Pipa** (modrá) natankuj, u **Gusa** (zelená) oprav trup.

Keď minieš palivo, dron ťa odtiahne k Pipovi za 15 % hotovosti a polovicu nákladu. Zničený modul stojí 25 % hotovosti a celý náklad. Upgrady zostávajú.

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
