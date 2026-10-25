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

## F2 Slučka (2026-10-25)

### Postup

- **Celý plán F1 až F6 je schválený** a rozhodnutia sú na mne (zadanie z 2026-10-25: „všetky rozhodnutia sprav za mňa, chcem hotovú hru“). Fázy preto idú za sebou bez čakania na schválenie. Každá končí pull requestom, náhľadom a záznamom tu.

### Svet a generovanie

- **Hlavné pásma minerálov** (§6 ich neurčuje): Rustite 1, Cobaltine 2, Glimmerite 2, Aurelite 3, Skyquartz 3, Emberstone 4, Voidglass 4, Starheart 5, Core Pearl 5. Mimo hlavného pásma platí polovičná hustota (§6).
- **Jaskyne:** dve oktávy simplex noise, natiahnuté do šírky (zvislá frekvencia × 1,6). Prah a mierka podľa pásma sú v `src/data/generation.ts`, pásmo 3 má najväčšie dutiny (§4 „veľké jaskyne“). Prvých 6 riadkov pod povrchom je bez jaskýň, aby mestečko stálo na pevnej zemi.
- **Bariéry Jadrovca:** na 100 riadkov 0, 4, 5, 6 a 6 podľa pásma, dlhé 3 až 12 blokov, 30 % z nich má hrúbku 2 riadky. Ak cesta na dno neexistuje, generátor odstráni bariéru, ktorá ju blokuje, a skúša znova.
- **Anti-softlock overuje pravidlá pohybu,** nie len flood-fill: nahor sa dá len cez prázdne bunky (let), do strany sa vŕta len zo zeme. Test prejde pre 100 seedov.
- **Povrch:** stĺpce 14 až 26 sú rovné, inde terén klesá najviac o 2 riadky.
- **Hĺbka** sa meria na spodku bunky, v ktorej modul je: na povrchu 0 m, riadok 0 má 4 m, posledný riadok 2 000 m.

### Ekonomika a nehody

- **Núdzové palivo:** pilot bez peňazí dostane od Pipa zadarmo doplnenie na 4 l, aby sa výlet dal vždy začať (pilier 4).
- **Dron odtiahne modul k čerpacej stanici,** lebo tam sa dá hneď tankovať. Pri stanici na povrchu dron neletí, stačí natankovať.
- **Polovica nákladu pri odťahu:** jednotky sa zoradia podľa ceny a stratí sa každá druhá. Stratí sa tak približne polovica hodnoty, nie len najlacnejšie alebo najdrahšie kusy.
- **Zničený modul** sa objaví v štartovom stĺpci s plnou nádržou a trupom. Poplatky 15 % a 25 % sa zaokrúhľujú na celé doláre.
- **Pád:** výška sa zaokrúhli na celé bloky, takže pád z 3,4 bloku je zadarmo (pilier 4).
- **Tankovanie a oprava** kúpia toľko, koľko pokryje hotovosť: palivo po desatinách litra, opravu po celých HP.

### Rozhranie

- **Budovy zľava:** Pipova čerpacia stanica (stĺpce 14 až 16), Mirin Výkup (17 až 19), Gusova Dielňa (21 až 23), Zásobáreň (24 až 26). Modul štartuje v stĺpci 20 medzi nimi. Do budovy sa vchádza klávesom E, keď modul stojí pred ňou.
- **Obchod pozastaví hru.** Každý výlet sa má končiť pokojným rozhodnutím (§3).
- **Jazyk** sa zvolí podľa prehliadača (slovenčina aj čeština → SK, inak EN) a voľba sa pamätá. Prepínač príde s nastaveniami v F6.
- **Fredoka je súčasťou hry** (OFL), nie odkaz na Google Fonts: hra beží aj offline, v Tauri a na itch.io.
- **Oznámenie pásma** sa ukáže len pri prvom príchode, nie pri každom prechode hranice.
- **Kritické palivo** bliká len tieňom okolo ukazovateľa, bez zväčšenia. Animovaná zmena veľkosti nútila prehliadač vytvárať novú vrstvu a niektoré kompozitory ju kreslili čiernu.

### Ladenie

- **Odpor vo vzduchu 10 namiesto 4:** pri 4 modul po pustení smeru doletel ešte 2,5 bloku, s 10 zastaví do jedného bloku.

## F3 Progresia (2026-10-25)

### Upgrady a Zásobáreň

- **Nový trup príde opravený a nová nádrž plná.** Kúpa je odmena, nie ďalší účet.
- **Jeden predmet na slot**, najviac päť. F použije vybraný slot. Keď je vybraný slot prázdny, použije sa prvý plný, aby hráč, ktorý nikdy nestlačí 1 až 5, nič nestratil.
- **Palivový článok a opravná súprava sa v núdzi použijú samy:** článok pri prázdnej nádrži (inak by hneď letel dron), súprava pri 0 HP (pilier 4: predmet kúpený na núdzu má v núdzi pomôcť).
- **Nálože modulu neublížia** a pod zemou zničia všetko vŕtateľné okrem relikvií. Jadrovec a láva zostanú (§4). Plynové kapsy v dosahu vyhoria bez reťazovej explózie. Na povrchu nefungujú.
- **Návratový maják** pristane pred Mirin Výkup, aby sa dalo hneď predávať.
- **Výťahová kotva** sa položí použitím pod zemou a zostane v slote. Ďalším použitím pod zemou sa presunie. Z povrchu odvezie modul ku kotve a minie sa.

### Hazardy

- **Plyn:** výbuch 3 × 3 zničí bloky rovnako ako nálož a minerály v ňom prepadnú. Poškodenie je 15 HP v pásme 2 a o 5 HP viac za každé hlbšie pásmo. V prvom pásme plyn nie je. Hustota je 1,2 / 1,5 / 1,8 / 2 % blokov v pásmach 2 až 5.
- **Pustiť smer znamená prerušiť:** vŕtanie plynu, ktoré hráč do 0,3 s nedrží, sa zastaví a modul sa vráti. Ťuknutím sa teda plynom prejsť nedá, treba sa rozhodnúť a podržať. Prerušené stlačenie sa nezopakuje cez input buffer.
- **Prvok 11 (odpúšťanie) sa dá vypnúť** v debug paneli: potom bolí každý blok pádu a plyn sa prerušiť nedá.
- **Láva je tekutá:** modul do nej vojde a klesá v nej najviac 2,5 bloku za sekundu. Láva zastaví meranie pádu, takže po dopade do nej neberie pád. Kým sa jej modul dotýka, stráca 10 HP za sekundu.
- **Kde je láva:** jazierka na dne jaskýň (30 % a 40 % úsekov dna v pásmach 4 a 5) a malé kapsy v skale. Posledné 4 riadky sveta sú bez lávy kvôli finále. Ak láva zatarasí cestu na dno, anti-softlock ju premení na skalu.
- **Teplo:** ukazovateľ sa plní rýchlosťou 8 % za sekundu plus 0,04 % za každý meter pod limitom a chladne 25 % za sekundu. Pri 100 % trup stráca 2 HP za sekundu. Ukazovateľ v HUD sa objaví od pásma 4 a okraje obrazovky pri prehrievaní sčervenajú.
- **Poškodenie lávou a teplom sa ráta v celých HP.** Namiesto „−1 HP“ každú chvíľu sa ukáže jedno varovanie.
- **Tma a zemetrasenia** sú vizuálne a príbehové prvky, prídu v F4 a F5.

### Relikvie

- **Relikvia leží v pevnej, dosiahnuteľnej hornine,** aspoň 2 stĺpce od okraja sveta. Výbuch ju nezničí.
- **Názvy relikvií** sú v hre už teraz (Žeravá minca … Iskra Srdca). Texty do Albumu a komentáre Miry prídu v F5.

### Ukladanie

- **localStorage pod kľúčom `hlbina.save`, `schemaVersion` 1.** Svet je seed a zoznam zmenených buniek, každá ako tri čísla.
- **Ukladá sa každých 10 s hry,** po odchode z obchodu, pri nájdení relikvie a pri skrytí alebo zatvorení stránky. Nikdy počas odťahu alebo respawnu, takže reload nezopakuje ani nepreskočí poplatok.
- **Modul uložený počas vŕtania** sa načíta tam, kde vŕtanie začalo, nikdy napoly v bloku.
- **Poškodený save sa opraví,** nezahodí: zlé hodnoty sa nahradia predvolenými a zlé bunky sa vynechajú. Neznáma verzia formátu začne novú hru.
- **Zmena generátora (`WORLD_VERSION`)** zachová peniaze, upgrady aj relikvie, ale svet sa vygeneruje nanovo a modul začne na povrchu.
- **Debug panel** pridal peniaze, všetky upgrady, teleport do hĺbky a novú hru, ktorá zmaže uloženú (§9.9).

### Ekonomika (`npm run sim:economy`)

- **Model hráča:** výlet do pásma, ťaženie, kým sa nenaplní náklad alebo nepríde rezerva paliva, a návrat. Viditeľnú rudu hráč trafí 2,5-krát častejšie než náhodné vŕtanie. V tme len v dosahu svetlometu, na 10 blokov naplno. Každý výlet ide najviac 20 riadkov hlbšie ako doteraz, lebo hráč objavuje postupne. Ide hlbšie, keď tam zarobí aspoň 60 % najlepšieho výletu. Kupuje to, čo najviac zvýši príjem alebo dosah na dolár. Všetky predpoklady sú v `src/data/balance.ts`.
- **Hodnoty zo špecifikácie ciele nespĺňali.** Model s nimi došiel do finále za 28 minút: príjem hlboko rástol 6- až 8-násobne za pásmo, ceny len 2,5-násobne.
- **Nové hodnoty minerálov:** Rustite $25, Cobaltine $50, Glimmerite $90, Aurelite $200, Skyquartz $350, Emberstone $600, Voidglass $1 200, Starheart $2 500, Core Pearl $5 000. Poradie minerálov zostalo, hlboké sú výrazne lacnejšie.
- **Nové ceny tierov:** T2 $500, T3 $3 000, T4 $20 000, T5 $65 000, T6 $200 000.
- **Výsledok modelu:** prvý upgrade po 2 výletoch (3,8 min), pásmo 2 za 6,5 min, pásmo 3 za 24 min, pásmo 4 za 60 min, finále za 186 min, medzi nákupmi najviac 3 výlety. Test `tests/balance.test.ts` stráži, že ciele platia.
- **Finále v modeli** vyžaduje 6 relikvií, motor T4 (útek 90 s) a ponor ku dnu, pri ktorom teplo a plyn zoberú najviac 60 % trupu.
- **Prah pre hitstop a záblesk (§5.5)** bol $900, teda päť najcennejších minerálov. S novými hodnotami bude v F4 $350, aby sa týkal tých istých piatich.

## F4 Štýl a šťava (2026-10-25)

### Grafika

- **Toon shading:** všetky materiály sú `MeshToonMaterial` so spoločnou trojstupňovou mapou (tieň, polotón, svetlo).
- **Zrezané hrany blokov** sú konvexný obal 24 bodov, 0,08 od každého rohu. Má 68 trojuholníkov s plochými normálami, takže hrana chytí svetlo ako ostrý pás. `RoundedBoxGeometry` mal 108 trojuholníkov a mäkké hrany.
- **Obrysy** sú inverted hull: zadné steny tej istej geometrie posunuté pozdĺž normál vo vertex shaderi. Fungujú aj pre inštancované kryštály, ktoré zdieľajú matice s obrysom. Majú ich modul, minerály a relikvie (§8).
- **Bloom len na žiariacej vrstve:** kryštály, láva, relikvie, plameň, iskry a záblesk sú vo vrstve 1. Tá sa vykreslí zvlášť, bez svetiel a hmly, rozmaže sa a pripočíta k obrazu. Ostatné objekty ju nezakrývajú. V 2,5D sú kryštály vždy na prednej stene, takže to nevadí.
- **Svetlo a tma:** denné svetlo je plné do 22. riadka a pod 150 m (37. riadok) zmizne. Potom zostane slabé ambientné svetlo (0,12), svetlomet a mäkké svetlo okolo modulu.
- **Svetlomet** svieti tam, kam modul vŕta alebo kam je otočený, s dosahom 1,35 × upgrade.
- **Láva:** 8 najbližších lávových buniek dostane bodové svetlo. Počet svetiel sa nikdy nemení, aby sa počas hry neprekladali shadery.
- **Tiene:** vrhá ich len slnko (jedno z dvoch povolených tieňových svetiel) a pod zemou sa vypne.
- **Hmla** má farbu pásma a začína 20 jednotiek od kamery, takže hracia plocha zostane čistá a zadné steny sa stratia v opare.
- **Parallax:** dve vrstvy skál v hĺbke −2,4 a −5,2 a stena v −9. V prvom pásme začínajú skaly a stena hlbšie, aby nevytŕčali nad horizont.
- **Modul** je zložený z primitív: telo, kabína, kolesá, nádrž, bedňa, rebrá, tryska, svetlá a vrták. Tier trupu mení farbu (krémová, tyrkysová, oceľová, slivková, ružová, zlatá). Krémová je prvá preto, lebo oranžový modul sa strácal v oranžovej hline. Tier vrtáka mení dĺžku a farbu vrtáka, nádrž, náklad a motor menia veľkosť dielov, chladenie pridáva rebrá a svetlomet svetlá.
- **Častice:** dve inštancované kocky, úlomky a žiariace iskry. Jeden výbuch tak stojí jeden draw call.

### Game feel (§5)

- **4 život vrtáka:** chvenie 0,035 bloku, 14 úlomkov za sekundu vo farbe bloku (ruda pridá farbu minerálu). Tón vŕtania je 70 Hz + 28 Hz za bod tvrdosti.
- **5 hitstop:** hra stojí 60 ms reálneho času a zmeškaný čas sa nedobieha. Prah je $350, teda päť najcennejších minerálov ako pôvodných $900 (pozri F3).
- **6 pop-up:** „+$350“ letí 650 ms k nákladu v HUD (Web Animations API).
- **9 rumble:** jemné pulzy pri vŕtaní každých 0,18 s, silný otras pri výbuchu, náraz pri tvrdom dopade a poškodení.
- **12 čitateľnosť:**
  - Plyn má bublinky, ktoré pulzujú každá vlastným rytmom.
  - Láva má hladinu nižšie ako blok a pulzujúci žiar.
  - Jadrovec má nity.
  - Po vypnutí sa líšia len farbou: plyn je trochu zelenší a láva je obyčajná oranžová kocka.
- **Všetkých 12 prvkov** má v debug paneli vypínač a hlavné hodnoty.

### Zvuk

- **Efekty sú procedurálne** (oscilátory a filtrovaný šum, štýl jsfxr), nič nahraté. Zvuk má každá akcia: vŕtanie, dopad, cinknutie (stúpa s hodnotou, $25 nízko, $5 000 vysoko), syčanie, výbuch, varovanie paliva, klik v UI, motor, nákup, relikvia, maják a dron.
- **Hudba je generovaná:**
  - Na povrchu veselý durový motív.
  - Pásmo 1 slnečné, 2 dórske a napäté, 3 lýdické a úžasné, 4 frýgické a nebezpečné, 5 mollové s tlkotom srdca.
  - Medzi pásmami sa prelína 2,5 s.
- **Mixer** (hlavná hlasitosť, hudba, efekty) je v pauze a pamätá si nastavenie. Zvuk sa zapne pri prvom stlačení klávesu, lebo prehliadače ho inak nepustia.

### Ovládanie

- **Ovládač** v štandardnom mapovaní (§5) sa číta pri každom kroku simulácie. L a R prepínajú sloty dookola.
- **V obchodoch a v pauze** D-pad presúva fokus, spodné tlačidlo potvrdzuje, pravé a Start zatvárajú.
- **Pauza (Esc, Start)** zastaví hru a ponúkne hlasitosť, jazyk a prehľad ovládania. Plné nastavenia a hlavné menu prídu v F6.

### Výkon

- **Draw calls** sú v hre okolo 100 z rozpočtu 200, 170 až 220 tisíc trojuholníkov. Chunky sa orezávajú podľa svojich hraníc.
- **60 fps na M1** sa v tomto prostredí overiť nedá: prehliadač tu kreslí softvérovo, bez grafickej karty, takže namerané fps o M1 nič nehovoria. Treba to overiť na Macu.

## F5 Príbeh (2026-10-25)

### Rádio a postavy

- **Okno rádia** je vľavo dole: portrét, meno, text sa vypisuje 42 znakov za sekundu a potom chvíľu ostane. Najviac 110 znakov, teda dva riadky; test to stráži pre všetky správy v oboch jazykoch.
- **Preskočenie:** Enter, tlačidlo B alebo klik. Prvé stlačenie dopíše text, druhé okno zavrie. Správy čakajú vo fronte a po 30 s čakania z nej vypadnú, aby rada o prehriatí neprišla až na povrchu.
- **Blokujúca** je len jedna správa, pri zapálení Srdca. Hru vtedy aj tak drží simulácia 3,5 s, takže okno len skočí do stredu.
- **Portréty** sú SVG tváre v štýle hry. Pip hovorí pípnutiami (sú v hlavičke) a text je titulok kurzívou. Hlas z hlbín nemá tvár, len šum a žeravé srdce. Portrét majiteľa je aj v hlavičke jeho obchodu.
- **Čo spúšťa správy:**
  - Začiatok hry: Gus, Mira (legenda o Srdci) a Pip.
  - Hĺbka 100, 400, 900, 1 400 a 1 900 m. Kto preskočí mílnik (napríklad kotvou), počuje len najhlbší.
  - Prvý nález každého z 9 minerálov: komentár Miry.
  - Prvá nehoda každého druhu: pád, plyn, láva, prehriatie, odťahovanie, zničenie, plný náklad, málo paliva. K tomu prvý upgrade.
  - Prvý vstup do pásma, od pásma 3 aj Hlas z hlbín: najprv šum, potom úlomky slov.
  - Každá relikvia: komentár Miry.
- **Režisér** (`src/story/director.ts`) počúva udalosti simulácie a zapisuje iba zoznam odohraných správ. Žiadne pravidlo hry ho nečíta, takže simulácia beží rovnako s ním aj bez neho; test to overuje.

### Album relikvií

- **Album** je v pauze a u Miry vo Výkupe. Nájdená relikvia má kartu s textom a výber karty ukáže komentár Miry. Nenájdená ukazuje len hĺbku.
- **Príbeh relikvií** odhaľuje Staviteľov, ktorí postavili Srdce, aby planéta nevychladla, a nechali ho tomu, kto príde po nich (§7, oblúk 2 a 3).

### Zemetrasenia

- **Prvý vstup do pásma 3, 4 a 5:** 2 s trasenia, prach, rumble a rádio, bez poškodenia.
- **Nová jaskyňa** je puklina široká 2 bloky a dlhá 18 až 28 riadkov. Začína 4 riadky pod modulom, najviac 6 stĺpcov bokom, a končí pred komnatou Srdca. Miesto určuje seed, takže svet praskne vždy rovnako. Rudu, relikvie a nerozbitné bloky necháva tak.

### Finále

- **Komnata Srdca** je v riadkoch 489 až 497 (stĺpce 14 až 25) a Srdce zaberá 2 × 2 bloky na jej dne. Generátor ju vyhĺbi vždy a overí, že sa k nej dá prevŕtať. Preto sa zvýšila verzia generátora na 2 a staré uložené hry stratia vykopané bunky, nie postup.
- **Zapálenie:** stačí stáť pri Srdci so 6 relikviami a stlačiť E (ovládač Y). HUD inak ukáže, koľko relikvií chýba.
- **Útek:**
  - Srdce horí 3,5 s, potom sa modul objaví pri ňom s plnou nádržou a trupom.
  - Láva čaká 5 s a potom stúpa rovnomerne tak, aby bola na povrchu presne vtedy, keď vyprší čas.
  - Každých 6 s sa nad modulom prelomí kus jadra (3 × 3, len obyčajná skala): cesta sa mení, ale nikdy nezavrie.
  - Maják počas úteku nefunguje, inak by útek preskočil.
  - Hore ukazuje odpočet a vzdialenosť lávy.
- **Útek sa neukladá.** Po načítaní je hra pred zapálením Srdca.
- **Keď láva vyhrá** (alebo modul zničí teplo), útek sa začne znova pri Srdci a láva dá o 15 s viac. Panel ponúkne aj bezplatné odtiahnutie na stanicu: Srdce potom zas pohasne a počká. Bez tejto voľby by slabý stroj ostal vo finále navždy (pilier 4).
- **Balans:** motor T4 (7 blokov/s) to stihne na prvý pokus, T3 na druhý. To sedí s modelom ekonomiky, ktorý počíta s T4 pred finále. Testy to overujú na celom svete.

### Koniec

- **Po výlete z jadra** hrajú fanfáry a o 2,5 s sa ukáže záver: planéta rozkvitne, na povrchu vyrastú kvety, nad stanicou svietia lampióny a na oblohe je ohňostroj. Na povrchu hrá nová, slávnostná hudba.
- **Epilóg** je pre všetkých 10 relikvií. Kto ich má menej, dozvie sa, že epilóg čaká. Nájdenie poslednej relikvie po konci ho ukáže dodatočne a Album ho má ako ďalšiu kartu.
- **Potom** sa dá ťažiť ďalej v tom istom svete, alebo začať novú hru s novým seedom (záver a pauza, potvrdzuje sa druhým stlačením).

### Ukladanie

- **Schéma 2** pridáva príbeh: odohrané správy, zemetrasenia a koniec. Hra uložená vo verzii 1 dostane príbeh podľa toho, čo už prežila: úvod, pásma, ktoré dosiahla, a nájdené relikvie sa už neozvú a zemetrasenia sa neopakujú.

## F6 Vydanie (2026-10-25)

### Hlavné menu a nastavenia

- **Titulná obrazovka** leží nad živým svetom: za menu je vidno stanicu a modul, HUD je skrytý. Esc ani B na nej nič nerobia, je to koreň menu.
- **Pokračovať** ukáže hĺbku, peniaze a relikvie uloženej hry. Bez rozohranej hry je tam **Hrať**.
- **Nová hra:** náhodný svet alebo seed. Číslo s najviac 10 číslicami pod 2^32 sa použije priamo, iný text sa zahašuje, takže aj slovo dá vždy ten istý svet. Rozohranú hru zmaže až druhé stlačenie. Nový svet sa spustí znovunačítaním stránky so seedom v `sessionStorage`, aby po starej hre nezostal žiadny stav.
- **Nastavenia:** hlasitosti a jazyk ostali pod svojimi kľúčmi z F4 (`hlbina.audio`, `hlbina.lang`). Klávesy, vibrácie a trasenie pribudli pod `hlbina.prefs`. Všetko je oddelené od uloženej hry, takže nová hra nastavenia nezmaže.
- **Pauza** má namiesto hlasitosti a jazyka tlačidlo Nastavenia, ktoré otvorí to isté ako titulná obrazovka, a pribudlo Hlavné menu. Odchod do menu hru uloží.
- **Vlastné klávesy:**
  - Meniť sa dá 7 akcií: jazda doľava a doprava, let, vŕtanie dole, vybavenie, vstup a preskočenie rádia.
  - Šípky, medzerník, Esc, Num Enter a 1 až 5 platia vždy a obsadiť sa nedajú, takže zlé nastavenie z hry nikdy nezamkne.
  - Tab, Cmd, Caps Lock, F-klávesy a podobné patria systému.
  - Keď má kláves iná akcia, akcie si klávesy vymenia, aby každá mala vlastný.
  - Nápoveda v pauze a výzvy v HUD ukazujú zvolené klávesy.
- **Autori:** námet a zadanie, vznik v kóde s Claude Code, knižnice a písmo s licenciami.

### Balans po playteste (`npm run playtest`)

- **Playtest hrá bot na skutočnej simulácii** cez rovnaké ovládanie ako hráč: lieta, vŕta, predáva, kupuje, zbiera relikvie, zapáli Srdce a uteká. Vidí celú mriežku, inak nie je múdrejší. `npm run playtest` odohrá 6 svetov a porovná ich s cieľmi §6. Test `tests/playtest.test.ts` pri každej kontrole odohrá 3.
- **Hráč je dvakrát pomalší než bot** (`BALANCE.playerSlowdown`). Bot nezablúdi, nezmešká pristátie, nečíta rádio a nič nehľadá. Je to odhad, kým hru nehrajú ľudia. Keď ukážu iný pomer, stačí zmeniť toto číslo a podľa playtestu doladiť ceny.
- **Svet je konečný:** vyťažená ruda nedorastie. Model ekonomiky preto dostal ubúdanie rudy v pásmach. Neskorú hru však nedohrá: ťaží priemery pásiem, a keď ich vyčerpá, nemá kam ísť, zatiaľ čo bot nájde rudu, ktorá ostala. Model teda stráži začiatok hry (prvý upgrade, pásma 2 až 4) a bot finále a rytmus nákupov.
- **Hodnoty zo špecifikácie:** bot došiel do finále za 29 min, hráč by to zvládol asi za hodinu. Svet mal rudu za viac než $1,3 milióna.
- **Hodnoty z F3:** bot došiel do finále za 129 až 182 min (hráč 4,3 až 6 h) a medzi upgradmi bolo až 8 výletov, čo §6 považuje za chybu balansu.
- **Nové hodnoty minerálov:** každý minerál má dvojnásobnú cenu oproti predchádzajúcemu: Rustite $25, Cobaltine $50, Glimmerite $100, Aurelite $200, Skyquartz $400, Emberstone $800, Voidglass $1 600, Starheart $3 200, Core Pearl $6 400.
- **Nové ceny tierov:** T2 $500, T3 $4 000, T4 $20 000, T5 $45 000, T6 $130 000.
- **Výsledok:** bot dohral všetkých 6 svetov za 96 až 137 min, priemerne za 108 min, čo je pre hráča asi 3,6 h. Medzi upgradmi sú najviac 4 výlety. Útek z jadra prehral bot raz za hru. Minul $217 000 a v zemi ostalo $300 000 až $390 000 (svet má $506 000 až $598 000), takže ani menej šikovný hráč neostane bez peňazí na to, čo finále potrebuje.
- **Model:** prvý upgrade po 2 výletoch (3,8 min), pásmo 2 za 6,5 min, pásmo 3 za 23 min, pásmo 4 za 59 min.
- **T6 je pre voľné ťaženie po konci.** Finále žiadny T6 nepotrebuje (bot ide s motorom T4, chladením T5 a trupom T4) a všetky T6 spolu by stáli viac, než svet obsahuje.
- **Láva pri úteku sa rozbieha pomaly** (`FINALE.lavaEase` 1,6): jej podiel cesty je podiel času umocnený na 1,6. Pri rovnomernom stúpaní bot prehrával útek ešte v kľukatej šachte pri komore. Na povrch láva dorazí v rovnaký čas ako predtým.
- **Hitstop a záblesk** sú od $400, teda znova pre päť najcennejších minerálov.

### Vydanie

- **Verzia 1.0.0** je v `package.json`. Odtiaľ ju berie titulná obrazovka aj aplikácia pre macOS (`tauri.conf.json` ukazuje na `package.json`).
- **itch.io:** `npm run pack:web` zbalí `dist/` do `release/hlbina-<verzia>-web.zip` s `index.html` v koreni. Zip píše vlastný malý skript nad zlib z Node, bez novej závislosti, s pevnými časmi súborov, aby ten istý build dal vždy ten istý zip. Odmietne build s absolútnymi cestami (itch.io hru servíruje z podpriečinka) a build nad 2 MB (§10). Dnes má 244 kB.
- **macOS:** natívna aplikácia je Tauri 2 (`src-tauri/`), jediná povolená nová závislosť F6. Je to len okno s web buildom, bez vlastných príkazov a oprávnení:
  - okno 1280 × 800 (najmenej 960 × 600), čierne pozadie, aby pri štarte nebliklo bielou;
  - prísna CSP: hra nepotrebuje nič mimo vlastných súborov;
  - uložené hry sú v local storage web view, oddelene od prehliadača;
  - ad-hoc podpis (`signingIdentity: "-"`), bez ktorého Apple Silicon aplikáciu nespustí. Podpis Apple Developer a notarizácia potrebujú platený účet, preto README opisuje prvé spustenie cez Súkromie a bezpečnosť;
  - najnižší macOS 11: s aktualizovaným Safari má jeho WebKit WebGL 2, ktorý three.js potrebuje.
- **Ikona aplikácie** je nakreslená v `src-tauri/app-icon.svg` (modul vŕta šachtu cez päť pásiem k žiariacemu Srdcu) a `tauri icon` z nej vyrobil ikony pre macOS, Windows a Linux. Ikony pre mobily a Windows Store sú zmazané.
- **Build pre macOS** sa nedá urobiť na Linuxe. Workflow `macOS app` ho postaví na runneri macOS ako univerzálnu aplikáciu (Apple Silicon aj Intel), overí, že sa spustí a beží 20 s, a `.dmg` nechá ako artefakt. Beží ručne, pri tagu `v*` a pri PR, ktorý mení `src-tauri/`. Repozitár je verejný, takže minúty macOS sú zadarmo.
- **Overenie tu:** linuxový build tej istej aplikácie (WebKitGTK) spustí hru v okne a v Chromiu s rovnakou CSP hra beží bez chyby či varovania v konzole.
