# HLBINA — master prompt pre 3D ťažobnú hru

Oct 24, 2026 · @Martin

## 0. Ako použiť tento prompt (pre Martina)

Prompt je písaný pre Claude Code CLI a vedie projekt po fázach F0 až F6. Túto sekciu môže Claude Code ignorovať.

1. Exportuj dokument ako Markdown a ulož ho do prázdneho priečinka projektu ako `GAME_SPEC.md`.
2. V priečinku spusti `claude` a ako prvú správu napíš: `Prečítaj GAME_SPEC.md celý. Navrhni plán pre fázu F0 a po mojom schválení ho zrealizuj.`
3. Do `CLAUDE.md` pridaj riadok: `Záväzná špecifikácia hry je GAME_SPEC.md. Pri konflikte má prednosť.` Vráti sa k nej aj v nových sessions.
4. Po každej fáze si hru zahraj v prehliadači, daj spätnú väzbu a až potom pusti ďalšiu fázu.

Všetky čísla v sekciách 4 až 7 sú štartovacie hodnoty na ladenie. Ladíš ich v konfigurácií, nie v kóde.

## 1. Rola, cieľ a vízia

**Tvoja rola:** Si senior game developer a technical game designer. Staviaš hru od nuly v TypeScripte a Three.js. Pracuješ po fázach, každú fázu overíš a odovzdáš hrateľnú.

**Čo staviaš:** HLBINA (pracovný názov) je ťažobná hra typu dig → sell → upgrade. Hráč riadi vŕtací modul, prevŕta sa hlbie do planéty, zbiera minerály, na povrchu ich predáva a vylepšuje stroj. Žánrovo vychádza z klasiky Motherload (2004), ale s vlastným svetom, príbehom a 3D grafikou.

**Cieľ:** Hrateľná a dohrateľná hra na MacBooku (Apple Silicon). Najprv v prehliadači, neskôr ako natívna macOS aplikácia. Dĺžka prechodu 3 až 5 hodín.

**Fantázia hráča:** „Ešte jeden výlet dole.“ Každý zostup je stávka: palivo, náklad a trup proti chamtivosti.

**Štyri piliere (pri každom rozhodnutí sa nimi riaď):**

1. **Každé prevŕtanie je radošť.** Game feel v štýle Nintendo: okamžitá odozva, šťavnaté efekty, odpúšťajúce ovládanie.
2. **Riziko proti odmene.** Hlbšie = cennejšie minerály, ale menej paliva na návrat a viac hazardov.
3. **Hĺbka mení svet.** Každé pásmo má inú farbu, svetlo, zvuk a hazardy. Hráč má cítiť, že objavuje.
4. **Odpúšťa, netrestá.** Žiadny permadeath. Chyba stojí peniaze a čas, nie postup.

## 2. Kľúčové rozhodnutia

Hra je 2.5D: simulácia beží na 2D mriežke, svet sa vykresľuje v plnom 3D. Tieto rozhodnutia sú záväzné, nemeníš ich bez môjho súhlasu.

| Oblasť | Rozhodnutie | Prečo |
| --- | --- | --- |
| Perspektíva | 2.5D: hra prebieha v rovine XY na mriežke blokov, bloky sú 3D objekty so svetlom a tieňmi | Plné 3D kopanie zabije čitateľnosť: hráč nevidí, čo je v zemi, kamera sa zasekáva v tuneloch |
| Kamera | Perspektívna, FOV 40°, náklon 12° zhora, plynulé sledovanie modulu s lookahead | Bloky pôsobia priestorovo, mriežka zostáva čitateľná |
| Engine | Three.js (WebGL2), žiadny herný engine | Plná kontrola, beží v prehliadači |
| Jazyk a build | TypeScript strict, Vite, Vitest | Rýchly dev loop, testovateľná logika |
| Fyzika | Vlastná mriežková, bez physics enginu | Pohyb po mriežke je jednoduchý a deterministický |
| UI | HTML/CSS overlay nad canvasom | Ostrý text, rýchla iterácia obchodov a menu |
| Ukladanie | localStorage s verzovanou schémou | Stačí pre lokálnu hru |
| Platforma | Safari a Chrome na macOS; natívna .app cez Tauri vo fáze F6 | Najprv hrateľnosť, potom balík |
| Ovládanie | Klávesnica + gamepad cez Gamepad API (Joy-Con, Pro Controller, Xbox, PlayStation) | Nintendo hra sa hrá na ovládači |
| Výkon | 60 fps na MacBooku Air M1, najviac 200 draw calls | Plochý základ, nad ktorým sa dá stavať |

Os Z do simulácie nepridávaj. Plné 3D kopanie by bol samostatný projekt.

## 3. Core loop a herné systémy

Jedna slučka trvá 2 až 5 minút a vždy končí rozhodnutím, čo kúpiť.

1. Na povrchu doplň palivo, oprav trup, kúp vybavenie.
2. Zostúp a vŕtaj. Zbieraj minerály, kým máš miesto v náklade a palivo na návrat.
3. Vráť sa na povrch. Let nahor stojí viac paliva ako cesta dole.
4. Predaj náklad na Výkupe, peniaze investuj v Dielni.
5. Lepší stroj ťa dostane hlbšie, k cennejším minerálom a novým hazardom.

### Pohyb a vŕtanie

- Modul jazdí doľava a doprava po pevnom povrchu.
- Vŕtanie: hráč stojí na zemi a drží smer do susedného bloku (dole, doľava, doprava). Nahor sa vŕtať nedá, vo vzduchu tiež nie.
- Počas vŕtania modul plynule kĺže do stredu cieľovej bunky. Po dokončení blok zmizne a modul stojí v nej.
- Let: smer nahor = ťah motora proti gravitácii. Vo vzduchu sa dá pohybovať do strán.
- Gravitácia 20 blokov/s², maximálna rýchlosť pádu 14 blokov/s.
- Čas vŕtania = tvrdosť bloku × koeficient vrtáka (sekcia 6).

### Palivo

- Spotreba: 0,01 l/s v pokoji, 0,04 l/s jazda, 0,08 l/s vŕtanie, 0,12 l/s let. Štartovací tank 12 l.
- Varovanie pri 20 % (zvuk + blikanie HUD) a dôrazné pri 10 %.
- Palivo 0 → modul stojí, prilétne záchranný dron a odtiahne ho na povrch. Poplatok 15 % hotovosti a strata polovice nákladu.

### Náklad

- Každý minerál = 1 jednotka. Pri plnom náklade sa ďalší minerál rozbije bez zisku a HUD ukáže „Náklad plný“.

### Trup (HP)

- Poškodenie spôsobuje pád z výšky nad 3 bloky (4 HP za každý blok navyše), plyn, láva a prehriatie.
- HP 0 → modul zničený, respawn na povrchu. Stratí celý náklad a zaplatí 25 % hotovosti. Upgrady zostávajú.

### Teplo

- Pod 1 100 m teplota stúpa. Ak hĺbka prekročí limit chladenia, plní sa ukazovateľ prehriatia. Pri 100 % trup stráca 2 HP/s.

### Svetlo

- Do 150 m denné svetlo, hlbšie tma. Hráč vidí v dosahu svetlometu (sekcia 6).
- Minerály jemne žiaria, takže na okraji tmy sa dajú tušiť. To je motivácia vylepšovať svetlo.

## 4. Svet: generovanie, bloky, hĺbkové pásma

Svet je mriežka 40 stĺpcov × 500 riadkov, 1 blok = 4 m, celková hĺbka 2 000 m. Generuje sa deterministicky zo seedu, rovnaký seed = rovnaký svet.

### Pravidlá generovania

- Povrch (riadok 0): rovná plocha s budovami v strede (stĺpce 14 až 26), po stranách mierne zvlnený terén.
- Každý blok určí pásmo: základný materiál, šanca na minerál (sekcia 6) a šanca na hazard.
- Jaskyne: 2D simplex noise s prahom podľa pásma, hlbšie viac dutín. Dutiny sú prázdne, hrozí v nich pád.
- Neprerazný Jadrovec tvorí krátke bariéry, nikdy nie celú šírku. Generátor flood-fillom overí, že z povrchu sa dá dostať na dno. Ak nie, bariéru prepíše (anti-softlock).
- Relikvie: 10 kusov na pevných hĺbkach (sekcia 7), stĺpec náhodný zo seedu.
- Chunky 20 × 20 blokov. Po zmene sa prestaví len mesh dotknutého chunku.

### Typy blokov

| Blok | Tvrdosť | Pásmo | Poznámka |
| --- | --- | --- | --- |
| Hlina | 1,0 | 1 |  |
| Íl | 1,4 | 2 |  |
| Skala | 2,0 | 3 |  |
| Čadič | 2,8 | 4 |  |
| Pradávny kameň | 3,5 | 5 |  |
| Jadrovec | neprerazný | 2 až 5 | Ani nálož ho nezničí |
| Plynová kapsa | ako okolie | 2 až 5 | Takmer ako okolitý blok, jemné bublinky v textúre. Pri prevŕtaní exploduje |
| Láva | nevŕtateľná | 4 až 5 | Kontakt = poškodenie |
| Rudný blok | okolie + 0,3 | podľa minerálu | Nesie ID minerálu |
| Relikvia | 1,5 | pevné hĺbky | Jednorazový nález s príbehom |

### Hĺbkové pásma

| # | Pásmo | Hĺbka | Riadky | Paleta | Hazardy | Nálada |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Hrdzavá pôda | 0 až 200 m | 0 až 49 | teplá oranžová, okrová | pád | slnečné, bezpečné |
| 2 | Ílové jaskyne | 200 až 600 m | 50 až 149 | terakota, hnedá | plyn, jaskyne | prvé napätie |
| 3 | Kryštálové hlbiny | 600 až 1 100 m | 150 až 274 | tmavomodrá, tyrkysové kryštály | plyn, tma, veľké jaskyne | úžas |
| 4 | Magmový plášť | 1 100 až 1 700 m | 275 až 424 | čierny čadič, žiarivá láva | láva, teplo, plyn | nebezpečenstvo |
| 5 | Jadro | 1 700 až 2 000 m | 425 až 499 | fialová, zlaté pradávne štruktúry | všetko + finále | tajomstvo |

## 5. Ovládanie a game feel

Game feel je priorita číslo jeden. Hra musí baviť na sivých kockách skôr, než dostane grafiku.

### Mapovanie

| Akcia | Klávesnica | Gamepad (standard mapping) |
| --- | --- | --- |
| Jazda a vŕtanie do strán | A / D, šípky | ľavá páčka, D-pad |
| Vŕtanie dole | S, šípka dole | páčka / D-pad dole |
| Let nahor | W, šípka hore, medzerník | spodné tlačidlo (index 0), páčka hore |
| Výber vybavenia | 1 až 5 | L / R (index 4, 5) |
| Použitie vybavenia | F | ľavé tlačidlo (index 2) |
| Vstup do budovy | E | horné tlačidlo (index 3) |
| Pauza | Esc | Start (index 9) |

### Povinné prvky game feel

Každý prvok má hodnotu v configu a dá sa vypnúť v debug paneli, aby sa dal porovnať rozdiel.

1. **Input buffer 120 ms:** smer stlačený tesne pred dokončením bloku sa vykoná hneď po ňom. Vŕtanie v rade je plynulé, bez záseku.
2. **Pristávací buffer 150 ms:** smer vŕtania stlačený tesne pred dopadom sa vykoná pri dopade.
3. **Squash & stretch:** dopad 0,85 / 1,15 na 120 ms, štart letu krátky stretch.
4. **Život vrtáka:** model sa počas vŕtania chveje, úlomky majú farbu bloku, výška tónu zvuku rastie s tvrdosťou.
5. **Hitstop 60 ms** a záblesk pri minerále s hodnotou od $900 vyššie. Cinknutie stúpa s hodnotou minerálu.
6. **Pop-up text** „+$150“, ktorý odletí k ukazovateľu nákladu v HUD.
7. **Screen shake** cez trauma model: trauma 0 až 1, sila = trauma², úbytok 1,5/s. Dopad, výbuch, zemetrasenie.
8. **Kamera:** plynulé sledovanie (lerp 8/s), lookahead 3 bloky v smere pohybu, pri páde viac dole.
9. **Rumble** cez `vibrationActuator`, kde ho prehliadač podporuje: vŕtanie jemne, výbuch silno.
10. **Motor s krivkou:** ťah zrýchľuje postupne, plameň z trysky škáluje so silou ťahu.
11. **Odpúšťanie:** pád z 3 blokov bez poškodenia. Pri začatom vŕtaní plynovej kapsy zasyčí a ak hráč do 0,3 s pustí smer, vŕtanie sa preruší.
12. **Čitateľnosť:** nebezpečné bloky sa líšia tvarom a animáciou, nie len farbou (prístupnosť pre farbosleposť).

## 6. Ekonomika: minerály, upgrady, obchod

Ekonomika je dátová vrstva, nie vibe coding: všetky hodnoty žijú v `src/data/` a pokrývajú ich testy. Názvy položiek sú v UI po anglicky, slovenský preklad príde cez i18n.

### Minerály

| Minerál | Hodnota | Pásma výskytu | Hustota v hlavnom pásme |
| --- | --- | --- | --- |
| Rustite | $25 | 1 až 2 | 8 % blokov |
| Cobaltine | $60 | 1 až 3 | 5 % |
| Glimmerite | $150 | 2 až 3 | 4 % |
| Aurelite | $400 | 2 až 4 | 3 % |
| Skyquartz | $900 | 3 až 4 | 2,5 % |
| Emberstone | $2 000 | 4 až 5 | 2 % |
| Voidglass | $5 000 | 4 až 5 | 1,2 % |
| Starheart | $12 000 | 5 | 0,8 % |
| Core Pearl | $30 000 | 5, posledných 50 riadkov | 0,3 % |

Mimo hlavného pásma klesá hustota na polovicu. Každý minerál má vlastný tvar kryštálu a farbu, nie len iný odtieň.

### Vylepšenia v Dielni (7 vetiev)

| Vylepšenie | T1 (štart) | T2 | T3 | T4 | T5 | T6 |
| --- | --- | --- | --- | --- | --- | --- |
| Vrták: sekundy na tvrdosť 1 | 0,60 | 0,48 | 0,38 | 0,30 | 0,24 | 0,19 |
| Trup: HP | 30 | 50 | 80 | 120 | 180 | 260 |
| Motor: max. stúpanie (bloky/s) | 3 | 4 | 5,5 | 7 | 9 | 11 |
| Nádrž: litre | 12 | 20 | 32 | 50 | 75 | 110 |
| Chladenie: bezpečná hĺbka (m) | 1 100 | 1 250 | 1 400 | 1 550 | 1 750 | 2 000 |
| Náklad: jednotky | 7 | 14 | 24 | 38 | 56 | 80 |
| Svetlomet: dosah (bloky) | 4 | 6 | 8 | 10 | 13 | 16 |

Ceny tierov sú rovnaké pre všetky vetvy: T2 $500, T3 $1 500, T4 $4 000, T5 $10 000, T6 $25 000. Kupuje sa postupne, tier po tieri. Svetlomet je vlastná inovácia oproti predlohe: v 3D je tma herný prvok.

### Zásobáreň (spotrebné vybavenie, max. 5 slotov)

| Položka | Cena | Efekt |
| --- | --- | --- |
| Palivový článok | $300 | +15 l okamžite |
| Opravná súprava | $500 | +40 HP |
| Trhacia nálož | $900 | Zničí bloky 3 × 3 okolo modulu, minerály v nich prepadnú |
| Mega nálož | $2 500 | To isté v okruhu 5 × 5 |
| Návratový maják | $2 000 | Okamžitý návrat na povrch aj s nákladom |
| Výťahová kotva | $3 000 | Položíš ju v hĺbke. Z povrchu ťa raz odvezie späť k nej. Zabiják grindu |

### Služby na povrchu

- Palivo $2 za liter, oprava $10 za HP, predaj minerálov za 100 % hodnoty.

### Ciele balansu

- Prvý upgrade po 2 až 3 výletoch (do 5 minút).
- Pásmo 2 do 15 minút, pásmo 3 do 45 minút, pásmo 4 do 2 hodín, finále za 3 až 4 hodiny.
- Ak hráč potrebuje viac ako 4 rovnaké výlety na ďalší nákup, je to chyba balansu.
- Napíš headless skript `npm run sim:economy`, ktorý odhadne príjem za výlet pre každé pásmo a tier a vypíše čas do ďalšieho nákupu. Balans ladíš číslami, nie pocitom.

## 7. Hazardy, príbeh a progresia

### Hazardy

| Hazard | Pásmo | Správanie | Protiopatrenie |
| --- | --- | --- | --- |
| Pád | všetky | Nad 3 bloky 4 HP za každý ďalší blok | Pribrzdiť motorom pred dopadom |
| Plynová kapsa | 2 až 5 | Výbuch 3 × 3, 15 HP v pásme 2, každé ďalšie pásmo +5 HP | Syčanie a prerušenie vŕtania (sekcia 5) |
| Láva | 4 až 5 | Statická, nepreteká. Kontakt 10 HP/s | Obísť ju |
| Teplo | 4 až 5 | Prehriatie pod bezpečnou hĺbkou | Vetva Chladenie |
| Tma | 3 až 5 | Vidíš len v dosahu svetlometu | Vetva Svetlomet |
| Zemetrasenie | prvý vstup do pásma 3, 4 a 5 | 2 s trasenie a rádiová správa, bez poškodenia. Otvorí novú jaskyňu ako skratku | Žiadne, je to dramatický moment |

### Svet a postavy (originálne)

Hráč je začínajúci vŕtač, ktorý pricestuje na ospalú hraničnú stanicu Tumbra na rovnomennej planétke. Tón je prívetivý a hravý, nikdy temný.

- **Gus**, starý mechanik v Dielni. Bručí, ale potichu ti fandí.
- **Mira** vedie Výkup a ku každému novému minerálu má komentár.
- **Pip**, malý robot na čerpacej stanici. Hovorí pípnutiami s titulkami.
- **Hlas z hlbín**: rádiové správy bez odosielateľa od pásma 3. Najprv šum, potom úlomky slov.

### Príbehový oblúk

1. Stanica chradne a potrebuje príjmy. Legenda hovorí o Srdci Tumbry v jadre planéty.
2. Relikvie odhaľujú pradávnu civilizáciu, ktorá postavila Srdce, aby planétu udržiavalo teplou.
3. Hlas z hlbín je Srdce. Pohasína.
4. Finále: hráč dorazí do jadra a so 6 a viac relikviami Srdce znovu zapáli. Jadro sa začne rútiť a začne sa útek: 90 sekúnd na návrat, zdola stúpa láva, cesta sa mení. Palivo a trup sa pri štarte úteku doplní na maximum.
5. Koniec: planéta rozkvitne, stanica oslavuje. Všetkých 10 relikvií odomkne epilóg navyše. Potom voľné ťaženie a nová hra s iným seedom.

### Relikvie

- 10 kusov v hĺbkach 120, 340, 520, 760, 980, 1 200, 1 420, 1 600, 1 820 a 1 960 m.
- Každá dá bonus $1 000 × poradie, kartu do Albumu s krátkym textom a komentár Miry.

### Rádiové správy

- Spúšťa ich hĺbkový mílnik, prvý nález minerálu, prvá nehoda a relikvia.
- Okno s portrétom, efekt písacieho stroja, najviac 2 riadky, preskočiteľné. Ovládanie nikdy neblokuje, okrem finále.

## 8. Vizuálny a zvukový štýl

Štýl je hračkárske 3D: zaoblené tvary, sýte farby, toon shading, nič realistické. Inšpiráciou je filozofia Nintendo (čitateľnosť, šťava, šarm), nikdy ich konkrétne postavy či assety.

### Grafika

- **Bloky:** kocky so zrezanými hranami (bevel 0,08) a jemnou variáciou odtieňa ±4 % na blok, aby mriežka nepôsobila sterilne.
- **Materiály:** `MeshToonMaterial` s trojstupňovým gradient mapom. Minerály emissive + bloom len na emissive vrstvu.
- **Obrysy:** inverted-hull outline na module, mineráloch a relikviách, nie na každom bloku (výkon).
- **Svetlo:** na povrchu hemisphere + smerové slnko s tieňmi. V hĺbke ambient klesá takmer na nulu, svetlomet je `SpotLight` na module. Láva žiari: emissive + najviac 8 aktívnych `PointLight` najbližších k hráčovi.
- **Atmosféra:** hĺbková hmla vo farbe pásma, za mriežkou parallax vrstvy jaskynných stien v z-hĺbke. Tak 2.5D pôsobí priestorovo.
- **Modul:** procedurálny low-poly model z primitív (telo, kabína, vrták, tryska, kolieska). Každý tier upgradu viditeľne mení model: väčší vrták, veľká nádrž, silné svetlá.
- **Budovy:** low-poly s výraznými siluetami a svetelnými tábľami.
- **Assety:** všetko najprv procedurálne v kóde, žiadne externé modely. Neskôr možné GLB z Blenderu, licencie vždy do `CREDITS.md`.

### Palety pásiem

| Pásmo | Farby |
| --- | --- |
| 1 Hrdzavá pôda | #E8A15A, #C9733A, #8A4B2A, obloha #8FD3FF |
| 2 Ílové jaskyne | #B5654A, #7A3E2E, #4A2620 |
| 3 Kryštálové hlbiny | #1E2A4A, #2EC4B6, #9BF6FF |
| 4 Magmový plášť | #1A1A1F, #FF6B1A, #FFB347 |
| 5 Jadro | #2B1640, #9D4EDD, #FFD166 |

### UI

- **HUD** vľavo hore, kompaktný: palivo (veľký zaoblený ukazovateľ), HP, náklad x/y, hĺbka v metroch, peniaze, sloty vybavenia. Kritické hodnoty pulzujú.
- **Font:** Fredoka (Google Fonts, licencia OFL), zaoblený a priateľský.
- **Obchody:** veľké karty s porovnaním „teraz → po upgrade“. Plné ovládanie gamepadom (fokus, navigácia D-padom).
- **Animácie UI:** pružinové prechody 150 až 250 ms.

### Zvuk

- WebAudio. Najprv procedurálne SFX vo štýle jsfxr, neskôr vlastné alebo CC0 zvuky.
- Každá akcia má zvuk: vŕtanie (slučka s výškou tónu podľa tvrdosti), dopad, cinknutie minerálu, syčanie plynu, výbuch, varovanie paliva, klik v UI.
- Hudba: ambientná slučka pre každé pásmo s prelínaním pri zmene, na povrchu veselá melódia. Mixer hlasitosti v nastaveniach.

## 9. Technická architektúra

Simulácia a vykresľovanie sú oddelené: logika beží nad dátami mriežky v pevnom kroku, renderer len číta stav.

### Princípy

1. Fixed timestep 60 Hz pre simuláciu, render cez `requestAnimationFrame` s interpoláciou.
2. Simulácia (`world/`, `sim/`) nesmie importovať Three.js. Testuje sa headless vo Vitest.
3. Všetky hodnoty zo sekcií 3 až 7 sú v `src/data/*.ts` ako typované konštanty. Žiadne magické čísla v logike.
4. Seedovaný RNG (napr. mulberry32), v logike žiadne `Math.random`.
5. Event bus pre herné udalosti (`BlockBroken`, `MineralCollected`, `Damage`, `ZoneEntered`…). Renderer, audio a UI na ne reagujú. Efekty nikdy nezasahujú do logiky.
6. Svet je `Uint8Array` s typom bloku + pole s ID minerálu. Chunky 20 × 20, pre každý chunk zlúčená geometria alebo `InstancedMesh` na typ bloku.
7. Vykresľujú sa len chunky v okolí kamery (±2 chunky).
8. Ukladanie: JSON so `schemaVersion`. Svet sa ukladá ako seed + diff zmenených blokov, nie celá mriežka.
9. Debug panel (lil-gui) v dev režime: hodnoty game feel, teleport do hĺbky, peniaze, hranice chunkov, FPS.
10. i18n: všetky texty cez kľúče, jazyky EN a SK.

### Štruktúra projektu

```
hlbina/
  index.html
  src/
    main.ts
    core/     game loop, input (keyboard + gamepad), events, rng
    data/     minerals, blocks, zones, upgrades, items, balance
    world/    grid, generator, pathCheck, chunks
    sim/      pod, drilling, fuel, heat, damage, cargo, economy
    render/   scene, camera, chunkMesher, materials, podModel, lighting, effects/
    ui/       hud, shops/, dialogs, menus, styles.css
    audio/    sfx, music
    story/    radio, relics, finale
    save/     save, migrations
    i18n/     en.json, sk.json
  tests/
  scripts/    simEconomy.ts
  CREDITS.md
```

### Výkonnostný rozpočet

| Metrika | Limit |
| --- | --- |
| FPS na MacBooku Air M1 | stabilných 60 |
| Draw calls | najviac 200 |
| Svetlá s tieňmi | najviac 2 |
| Prestavba jedného chunku | pod 4 ms |
| Veľkosť buildu (gzip, bez hudby) | pod 2 MB |
| Načítanie do hry | pod 3 s |

## 10. Fázy vývoja

Sedem fáz, každá končí hrateľnou verziou. Ďalšiu fázu začínaš až po mojom potvrdení.

| Fáza | Obsah | Hotovo, keď |
| --- | --- | --- |
| F0 Základ | Vite + TS strict + Three.js + Vitest + ESLint/Prettier, git, prázdna scéna, debug panel, FPS meter | `npm run dev` ukáže scénu, `npm run build` a `npm test` prejdú bez chýb |
| F1 Sivé kocky | Mriežka 40 × 100 z jedného materiálu, modul ako kocka, jazda, vŕtanie, gravitácia, let, kamera. Game feel prvky 1, 2, 3, 7, 8, 10 | Vŕtanie v rade bez zásekov, nahor ani vo vzduchu sa vŕtať nedá, 60 fps, testy pohybu a vŕtania prejdú |
| F2 Slučka | Generátor 5 pásiem (zatiaľ len farby), minerály, náklad, palivo, HP, pád, budovy ako zóny, HUD, záchranný dron | Celá slučka dole → predaj → peniaze funguje. Prázdne palivo = odtiahnutie. Anti-softlock test prejde pre 100 seedov |
| F3 Progresia | 7 vetiev upgradov, Zásobáreň, hazardy, relikvie, ukladanie, `sim:economy` | Simulácia spĺňa ciele balansu zo sekcie 6, uložená hra prežije reload, hazardy majú testy |
| F4 Štýl a šťava | Toon shading, obrysy, svetlo a tma, parallax, častice, hitstop, shake, zvuk, gamepad, rumble, vizuálne tiery modulu | Všetkých 12 prvkov game feel je v hre a dá sa vypnúť v debug paneli. Ovládač funguje v Chrome, otestované aj v Safari. 60 fps v pásme 4 |
| F5 Príbeh | Postavy, rádiové správy, Album relikvií, zemetrasenia, finále s útekom, koniec, epilóg, nová hra so seedom | Hra je dohrateľná od začiatku po koniec bez debug nástrojov |
| F6 Vydanie | Hlavné menu, nastavenia (hlasitosť, ovládanie, jazyk), balans po playteste, Tauri build pre macOS, web build pre itch.io | .app sa spustí na macOS, web build beží na itch.io, konzola bez chýb |

## 11. Pravidlá práce a IP hranice

### Ako pracuješ

1. Na začiatku každej fázy napíš krátky plán (súbory, kroky, riziká) a počkaj na schválenie.
2. Commituj po každom funkčnom kroku (conventional commits). Nikdy necommituj rozbitý build.
3. Pred hlásením „hotovo“ spusti `npm run build` a `npm test`. Netvrď, že niečo funguje, kým si to neoveril.
4. Čistá logika (world, sim, economy, save) má unit testy. Vizuál overuješ podľa kritérií fázy.
5. Súbory do 300 riadkov, jedna zodpovednosť na modul. Kód a komentáre po anglicky.
6. Žiadne nové závislosti bez zdôvodnenia. Povolené: three, vite, typescript, vitest, lil-gui, simplex-noise a vo F6 Tauri.
7. Keď je špecifikácia nejasná alebo v konflikte, opýtaj sa. Malé rozhodnutia urob sám a zapíš ich do `DECISIONS.md`.
8. Na konci fázy: čo je hotové, ako to otestovať (konkrétne kroky), známe problémy, návrh ďalšieho kroku.
9. Ak nájdeš lepšie riešenie, než je v špecifikácii, navrhni ho. Bez súhlasu ho nezavádzaj.

### IP hranice (záväzné)

Hra preberá žáner (dig, sell, upgrade), nie konkrétne dielo.

| Smeš | Nesmeš |
| --- | --- |
| Slučku ťaženie → predaj → upgrade, palivo, náklad, hĺbkové pásma | Názov Motherload, štúdio XGen, Mars ako prostredie |
| Bežné kategórie upgradov (vrták, trup, motor, nádrž, chladenie, náklad) | Názvy minerálov a predmetov z predlohy (Ironium, Bronzium, Goldium, Einsteinium, Amazonite a pod.) |
| Vlastný príbeh, postavy a svet Tumbra | Príbeh, zvrat a postavy predlohy (napr. Mr. Natas) |
| Filozofiu Nintendo game feel | Akékoľvek postavy, zvuky, hudbu, logá či assety Nintenda |
| CC0 assety s licenciou v `CREDITS.md` | Sprity, zvuky, hudbu či rozloženie UI skopírované z predlohy |
