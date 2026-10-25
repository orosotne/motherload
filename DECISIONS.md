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
