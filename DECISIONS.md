# Rozhodnutia

Malé rozhodnutia, ktoré GAME_SPEC.md nechala otvorené (§11.7). Väčšie zmeny idú vždy cez schválenie.

## F0 Základ (2026-10-25)

### Schválené spolu s plánom F0

- **Vetva `main`** obsahuje špecifikáciu a CLAUDE.md. Každá fáza prichádza ako pull request.
- **`?debug` v adrese** zapne debug nástroje aj v produkčnom builde.
- **Náhľad na claude.ai** po každej fáze, aby sa hra dala skúsiť bez inštalácie.

### Projekt a nástroje

- **Projekt je v koreni repa.** Repo `motherload` zodpovedá priečinku `hlbina/` zo §9. Balík sa volá `hlbina`, názov Motherload sa v hre nepoužíva (§11).
- **TypeScript 6.0, nie 7.** typescript-eslint 8 podporuje najviac TypeScript 6.0. Na 7 prejdeme, keď pribudne podpora.
- **Node 22.13 alebo novší** kvôli Vitest 5 a ESLint 10. `.nvmrc` odporúča 24 LTS.
- **TypeScript prísnejší ako `strict`:** navyše `noUncheckedIndexedAccess` (čítanie z poľa môže vrátiť `undefined`, čo chráni vyhľadávanie v dátových tabuľkách), nepoužité premenné a parametre sú chyba, plus `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch` a `verbatimModuleSyntax`.
- **ESLint stráži architektúru.** `core/`, `data/`, `world/`, `sim/`, `story/` a `save/` nesmú importovať `three` (§9.2). V týchto priečinkoch a v testoch je zakázaný `Math.random` (§9.4). Súbor nad 300 riadkov neprejde (§11.5). `story/` patrí k logike, lebo finále s útekom a stúpajúcou lávou je simulácia.
- **Prettier je pripnutý na presnú verziu**, aby sa formátovanie nemenilo s novou inštaláciou. GAME_SPEC.md nikdy neformátuje.
- **Vite `base: './'`:** relatívne cesty, takže build beží na itch.io, v Tauri aj ako náhľad.
- **Varovanie o veľkosti chunku až od 1 MB.** Samotný three.js má ~520 kB. Skutočný rozpočet je 2 MB gzip (§9). Po F0 má hra 134 kB gzip a debug chunk 9 kB.
- **Testy sú v `tests/`** (§9) a bežia v Node, lebo simulácia DOM nepotrebuje.

### Engine

- **Súradnice:** 1 blok = 1 jednotka sveta. Stĺpec c → x = c, riadok r → y = −r, hracia rovina je z = 0, kamera je na strane +z. Hĺbka v metroch = riadok × 4.
- **Herná slučka:** simulácia beží na 60 Hz. Naraz sa dobieha najviac 100 ms. Dlhšie medzery (prepnutý tab, breakpoint) sa zahodia, aby svet neposkočil. Render interpoluje medzi predchádzajúcim a aktuálnym stavom, počas pauzy kreslí presný stav.
- **Dáta a ladenie sú oddelené.** `src/data/` drží nemenné východiskové hodnoty (`Readonly`). Moduly si z nich robia živé kópie a debug panel mení kópie, nie dáta.
- **Event bus doručuje snímke odberateľov:** kto sa prihlási počas `emit`, dostane až ďalšiu udalosť.
- **Pixel ratio najviac 2** (`RENDER.maxPixelRatio`): Retina je ostrá a 3× displeje nestoja výkon navyše.
- **Kamera:** vzdialenosť 22 blokov, na výšku obrazu je vidieť približne 16 blokov. Je to štartovacia hodnota, doladí sa v F1.

### Debug nástroje

- **Vlastný FPS meter namiesto stats.js:** žiadna nová závislosť a ukazuje aj CPU čas a draw calls z rozpočtu.
- **Kláves vľavo od 1** reaguje na kódy `Backquote` aj `IntlBackslash`. Na Macu s ISO klávesnicou, teda aj slovenskou, ho prehliadače hlásia rôzne.
- **Testovacia scéna je dočasná.** `sim/demoSpin.ts` a `render/demoCube.ts` v F1 nahradí modul.
