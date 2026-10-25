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
- **`#debug` funguje rovnako ako `?debug`.** Náhľad na claude.ai do stránky nepustí query string, len kotvu za `#`.
- **Kláves vľavo od 1** reaguje na kódy `Backquote` aj `IntlBackslash`. Na Macu s ISO klávesnicou, teda aj slovenskou, ho prehliadače hlásia rôzne.
- **Testovacia scéna je dočasná.** `sim/demoSpin.ts` a `render/demoCube.ts` v F1 nahradí modul.

## F1 Sivé kocky (2026-10-25)

### Hodnoty, ktoré špecifikácia neurčuje (všetky sa dajú ladiť v debug paneli)

- **Modul:** veľkosť 0,8 × 0,8 bloku, jazda 4,5 bloku/s, zrýchlenie na zemi 30 a brzdenie 40 blokov/s², vo vzduchu zrýchlenie 18 a odpor 4.
- **Motor:** ťah 46 blokov/s² pri plnom výkone (po odčítaní gravitácie 26 nahor). Krivka motora: nábeh 0,25 s, dobeh 0,12 s.
- **Obloha:** modul vyletí najviac 12 riadkov nad povrch. Štartuje v stĺpci 20.
- **Squash & stretch:** pristátie sa stlačí až od rýchlosti 3 bloky/s. Pri štarte letu sa modul natiahne na 1,12 × 0,92 na 100 ms.
- **Trasenie:** v F1 ho spúšťa len pristátie, od 7 blokov/s, najviac trauma 0,55 pri plnej rýchlosti pádu. Šum je zo sínusov, bez novej knižnice.
- **Kamera:** lookahead počíta z reálneho posunu modulu, takže funguje aj pri vŕtaní. Pri páde pozerá 5 blokov nižšie, pri stúpaní 1,5 bloku vyššie. Na okrajoch sveta sa zastaví, za okraj ukáže najviac 1 blok skaly.

### Pravidlá pohybu a vŕtania

- **Bočné vŕtanie začne hneď,** keď modul stojí v susednej bunke a hráč drží smer. Nemusí najprv naraziť, takže vŕtanie v rade nemá prestoj.
- **Začaté vŕtanie sa dokončí** aj po pustení klávesu. Výnimkou bude plynová kapsa v F3 (§5.11).
- **Kĺzanie do bunky je rovnomerné,** preto je vŕtanie v rade plynulé, bez spomalenia na hranici blokov.
- **Ďalší blok začne v tom istom kroku,** v ktorom predošlý zmizol, a prenesie si zvyšok času. Test overuje, že medzi blokmi nie je ani jeden prázdny krok.
- **Poradie smerov:** držaný smer má prednosť pred ťuknutím v buffri, medzi nimi vyhráva neskôr stlačený. Držaný let (hore) vŕtanie blokuje.
- **Výška pádu** sa meria od najvyššieho bodu. Keď hráč motorom spomalí pod 4 bloky/s, meranie začne odznova (protiopatrenie z §7). Samotné poškodenie príde v F2.

### Vzhľad a nástroje

- **Sivé kocky** majú už teraz ±4 % odchýlku odtieňa z §8, aby bola mriežka čitateľná. Nerozbitné bloky sú tmavšie.
- **Za mriežkou je tmavá skalná stena** a skala aj za okrajmi sveta, aby v tuneloch nebolo vidieť oblohu.
- **Čísla blokov sú pevné pre všetky typy zo §4** už od F1, lebo ich budú obsahovať uložené hry.
- **Tabuľky upgradov a pásiem** zo §4 a §6 sú v dátach už teraz. F1 z nich používa vrták a motor T1.
- **`window.hlbina`** sprístupní stav hry v konzole a v automatických testoch, len keď sú zapnuté debug nástroje.
