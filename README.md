# HLBINA

2.5D ťažobná hra typu dig → sell → upgrade v TypeScripte a Three.js. Záväzná špecifikácia je v [GAME_SPEC.md](GAME_SPEC.md).

Hra je hotová vo verzii 1.0.0: hrá sa v prehliadači a ako natívna aplikácia pre macOS a je pripravená na itch.io (pozri [Vydanie](#vydanie)). Podľa playtestu trvá prechod asi 3 až 4 hodiny.

## Spustenie na Macu

Potrebuješ Node.js 22.13 alebo novší, odporúčaný je 24 LTS. Over to cez `node -v`. Ak Node nemáš, stiahni LTS z [nodejs.org](https://nodejs.org) alebo použi `nvm install` (číta `.nvmrc`).

```sh
git clone https://github.com/orosotne/motherload.git
cd motherload
npm install
npm run dev
```

Potom otvor http://localhost:5173 v Chrome alebo Safari.

## Hlavné menu a nastavenia

- **Pokračovať** vráti uloženú hru a ukáže jej hĺbku, peniaze a relikvie. Bez uloženej hry je tu **Hrať**.
- **Nová hra:** náhodný svet, alebo svet z vlastného seedu. Seed je číslo alebo hocijaké slovo a ten istý seed dá vždy ten istý svet. Rozohranú hru nová hra zmaže, preto ju treba potvrdiť druhým stlačením.
- **Nastavenia:** hlasitosť (celková, hudba, efekty), jazyk (slovenčina, angličtina), ovládanie, vibrácie ovládača a trasenie obrazovky. Hodnotu meníš šípkami doľava a doprava. Nastavenia sa ukladajú zvlášť a nová hra ich nezmaže.
- **Autori** a verzia hry.

Esc v hre otvorí pauzu: pokračovať, Album relikvií, nastavenia a hlavné menu. Hra sa pred odchodom do menu uloží.

## Ovládanie

| Klávesy              | Akcia                                     |
| -------------------- | ----------------------------------------- |
| A / D alebo ← / →    | jazda a vŕtanie do strán                  |
| S alebo ↓            | vŕtanie dole                              |
| W, ↑ alebo medzerník | let                                       |
| E                    | vstup do budovy, keď modul stojí pred ňou |
| Esc alebo E          | zatvorí obchod                            |
| 1 až 5               | výber slotu vybavenia                     |
| F                    | použije vybavenie z vybraného slotu       |
| Enter                | dopíše a potom zavrie správu z rádia      |
| Esc                  | pauza                                     |

Nahor ani vo vzduchu sa vŕtať nedá. V obchode vyberáš šípkami alebo WASD a potvrdzuješ Enterom či medzerníkom.

Klávesy A, D, W, S, F, E a Enter si zmeníš v **Nastavenia → Ovládanie**: vyber akciu a stlač nový kláves. Šípky, medzerník, Esc, Num Enter a 1 až 5 fungujú vždy, takže sa z hry nikdy nezamkneš.

### Ovládač

Funguje každý ovládač so štandardným mapovaním (Joy-Con, Pro Controller, Xbox, PlayStation). Pripoj ho a stlač ľubovoľné tlačidlo.

| Ovládač                 | Akcia                          |
| ----------------------- | ------------------------------ |
| ľavá páčka alebo D-pad  | jazda, vŕtanie do strán a dole |
| spodné tlačidlo (A / ×) | let                            |
| ľavé tlačidlo (X / □)   | použiť vybavenie               |
| horné tlačidlo (Y / △)  | vstup do budovy                |
| pravé tlačidlo (B / ○)  | preskočí správu z rádia        |
| L / R                   | výber slotu                    |
| Start                   | pauza                          |

V obchodoch a v pauze sa pohybuješ D-padom, spodným tlačidlom potvrdzuješ a pravým (B / ○) zatváraš. Kde to prehliadač podporuje, ovládač pri vŕtaní a výbuchoch vibruje.

## Ako sa hrá

1. Vŕtaj dole a zbieraj minerály. Náklad, palivo, trup a hĺbku vidíš vľavo hore.
2. Vráť sa na povrch skôr, než minieš palivo. Let nahor míňa najviac.
3. Pred **Mirin Výkup** (červená budova) stlač E a predaj náklad.
4. U **Pipa** (modrá) natankuj, u **Gusa** (zelená) oprav trup.

Keď minieš palivo, dron ťa odtiahne k Pipovi za 15 % hotovosti a polovicu nákladu. Zničený modul stojí 25 % hotovosti a celý náklad. Upgrady zostávajú.

### Dielňa, Zásobáreň a hazardy

- **Gusova Dielňa** (zelená): sedem vetiev upgradov, každá karta ukazuje „teraz → po upgrade“ a cenu.
- **Zásobáreň** (fialová): palivový článok, opravná súprava, nálože, návratový maják a výťahová kotva do piatich slotov. Článok a súprava sa v núdzi použijú samy.
- **Plynová kapsa** vyzerá skoro ako okolitá hornina, len s bublinkami. Keď pri vŕtaní zasyčí, pusti smer do 0,3 s a vŕtanie sa zastaví.
- **Láva** v Magmovom plášti a Jadre berie 10 HP za sekundu. Modul v nej pomaly klesá, vyleť von.
- **Teplo:** pod bezpečnou hĺbkou chladenia sa plní ukazovateľ prehriatia, pri 100 % trup stráca 2 HP za sekundu.
- **Relikvie** sú v pevných hĺbkach a každá prinesie bonus.

### Príbeh

- **Rádio** vľavo dole: Gus, Mira, Pip a od pásma 3 aj tajomný Hlas z hlbín. Ozvú sa pri hĺbkových mílnikoch, prvom náleze minerálu, prvej nehode a relikviách. Hra pritom nestojí.
- **Album relikvií** je v pauze a u Miry. Každá relikvia má kartu a Mira k nej má čo povedať.
- **Zemetrasenie** pri prvom vstupe do pásma 3, 4 a 5 neublíži, ale otvorí pod tebou novú jaskyňu.
- **Srdce Tumbry** čaká na dne sveta (okolo 1 990 m). So 6 relikviami ho pri ňom zapáliš klávesom E. Potom máš 90 sekúnd na útek hore pred stúpajúcou lávou. Ak to nestihneš, skúsiš znova s väčšou rezervou, alebo sa dáš odtiahnuť na stanicu a vrátiš sa s lepším strojom.
- **Koniec:** planéta rozkvitne a stanica oslavuje. Všetkých 10 relikvií odomkne epilóg. Potom môžeš ťažiť ďalej, alebo začať novú hru v novom svete.

Hra sa ukladá sama: každých 10 sekúnd, po odchode z obchodu a pri zatvorení stránky. Útek z jadra sa neukladá. Po načítaní hra pokračuje presne tam, kde prestala.

## Príkazy

| Príkaz                | Čo robí                                                  |
| --------------------- | -------------------------------------------------------- |
| `npm run dev`         | dev server s debug nástrojmi                             |
| `npm run build`       | typecheck a produkčný build do `dist/`                   |
| `npm run preview`     | spustí produkčný build na http://localhost:4173          |
| `npm test`            | testy (Vitest)                                           |
| `npm run lint`        | ESLint                                                   |
| `npm run format`      | naformátuje kód (Prettier)                               |
| `npm run check`       | typecheck, lint, formát a testy naraz                    |
| `npm run sim:economy` | odhad príjmu za výlet a začiatok hry voči cieľom balansu |
| `npm run playtest`    | bot odohrá 6 celých hier a porovná ich s cieľmi balansu  |
| `npm run pack:web`    | zip pre itch.io do `release/`                            |
| `npm run app:dev`     | hra v natívnom okne s dev serverom                       |
| `npm run app:build`   | natívna aplikácia (`.app` a `.dmg` na Macu)              |

## Vydanie

### Web na itch.io

1. `npm run pack:web` postaví hru a zbalí ju do `release/hlbina-<verzia>-web.zip`. Skontroluje, že build používa len relatívne cesty a zmestí sa do 2 MB.
2. Na itch.io vytvor nový projekt, v **Kind of project** vyber **HTML** a nahraj zip.
3. Pri súbore zaškrtni **This file will be played in the browser**.
4. V **Embed options** nastav veľkosť 1280 × 720 a zapni **Fullscreen button**.

### Aplikácia pre macOS

Natívna aplikácia je [Tauri](https://tauri.app) okno s tou istou hrou (`src-tauri/`).

**Bez inštalácie čohokoľvek:** na GitHube otvor **Actions → macOS app → Run workflow**. Po dobehnutí je v artefaktoch behu `HLBINA-macos` s `.dmg`. Rovnako sa postaví pri každom tagu `v*`.

**Na vlastnom Macu:** potrebuješ Xcode Command Line Tools (`xcode-select --install`) a Rust z [rustup.rs](https://rustup.rs).

```sh
npm install
npm run app:build
```

Výsledok je v `src-tauri/target/release/bundle/`: `macos/HLBINA.app` a `dmg/HLBINA_<verzia>_aarch64.dmg`. Pre Apple Silicon aj Intel naraz pridaj `rustup target add x86_64-apple-darwin` a spusti `npm run app:build -- --target universal-apple-darwin`.

**Prvé spustenie:** aplikácia nie je podpísaná certifikátom Apple Developer, preto ju macOS najprv zablokuje. Otvor **Systémové nastavenia → Súkromie a bezpečnosť**, nájdi hlášku o aplikácii HLBINA a povoľ ju tlačidlom **Open Anyway** (v slovenčine „Napriek tomu otvoriť“). Stačí raz.

Aplikácia má vlastné uložené hry, oddelené od prehliadača.

### Playtest

`npm run playtest` pustí bota, ktorý hrá skutočnú simuláciu ako hráč: vŕta, predáva, kupuje, zbiera relikvie, zapáli Srdce a uteká. Vypíše pre každý svet časy prvého upgradu, pásiem a finále a nakoniec ciele balansu (§6). Hráč je podľa odhadu dvakrát pomalší než bot. `npm run playtest -- 2 4` odohrá 2 svety s limitom 4 hodiny.

## Debug nástroje

V dev režime sú zapnuté vždy. V produkčnom builde ich zapneš pridaním `?debug` alebo `#debug` do adresy, napríklad http://localhost:4173/?debug.

- **FPS meter** vľavo dole: fps, čas snímky, CPU čas a draw calls (rozpočet je 200).
- **Panel** vpravo hore: pauza a krokovanie simulácie, spomalenie, interpolácia, kamera, peniaze, všetky upgrady, teleport do hĺbky, hranice chunkov a nová hra (zmaže uloženú).
- **Game feel:** všetkých 12 prvkov zo špecifikácie (§5) má vlastný vypínač a hodnoty, aby sa dal porovnať rozdiel.
- **Story:** všetkých 10 relikvií a teleport k Srdcu, na rýchle vyskúšanie finále.
- **Kláves vľavo od 1** všetko skryje alebo znova zobrazí.

## Štruktúra

Priečinky zodpovedajú GAME_SPEC.md §9. Logika (`core/`, `data/`, `world/`, `sim/`, `story/`, `save/`) nesmie importovať Three.js ani používať `Math.random`. Stráži to ESLint. Skripty (ekonomika, playtest, zip pre itch.io) sú v `scripts/`, natívna aplikácia v `src-tauri/`.

Rozhodnutia, ktoré špecifikácia nechala otvorené, sú v [DECISIONS.md](DECISIONS.md). Licencie sú v [CREDITS.md](CREDITS.md).
