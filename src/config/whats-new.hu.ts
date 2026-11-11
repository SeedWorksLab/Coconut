import type { WhatsNewEntry } from './whats-new';

export const whatsNewHu: WhatsNewEntry[] = [
  {
    version: '1.2.0',
    releasedAt: '2026-10-29T00:00:00.000Z',
    intro:
      'A Coconutnak most már asztali otthona is van. Ugyanaz a privát, offline-first ' +
      'költségvetés fut Linux asztali alkalmazásként, és a hónap lezárása végre helyet ad ' +
      'annak, hogy elmondd, hogyan is sikerült. Néhány apró javítás közben rendben tartja ' +
      'az indítást és a hónap végi jelentést.',
    features: [
      'A Coconut mostantól Linux AppImage-ként elérhető asztali gépekre is, ugyanazzal a ' +
        'local-first felállással és ugyanazzal a fiók nélküli, hálózat nélküli alapértelmezéssel, mint az Android-alkalmazás',
      'A hónap lezárása mostantól értékelést és jegyzetrészt is tartalmaz — írd le, mi ment jól, ' +
        'mi ment rosszul, és miért költött úgy a hónap, ahogy',
      'A havi értékelés a hónappal együtt mentődik, és megjelenik a hónap végi jelentésben, így ' +
        'a számok mögötti történet a számoknál marad',
      'Javítva az asztali alkalmazás indításkor történő lefagyása, amikor az adatbázis- és ' +
        'betűkészlet-eszközök hiányoztak a csomagolt buildből',
      'Javítva egy adatbázis-frissítési hiba, amely frissítés után megakadályozhatta az alkalmazás betöltését',
      'A hónap végi jelentés címkéi és semleges értékei sötét módban is olvashatók maradnak',
    ],
  },
  {
    version: '1.1.1',
    releasedAt: '2026-10-08T00:00:00.000Z',
    intro:
      'Ez a kiadás a nap végén megbízható számokról szól. Az összegek bevitele a hónap ' +
      'tervezésénél már nem botlik meg saját magában, egy költségvetés törlése nem hagyja ' +
      'a költést olyan sarokban, ahol semmi nem jön ki, és az áttekintés végre sötét módban ' +
      'is olvashatóan tartja a várható hónap végi értéket. A statisztikák pedig arra épültek ' +
      'újra, amit valójában tudni akarsz: a ritmusodra, az átlagaidra és arra, mennyire volt ' +
      'hasznos a költésed.',
    features: [
      'Javítva az összegek bevitele a hónap tervezése képernyőn — az alkalmazás már nem ' +
        'ragad rá a félkész számokra gépelés közben, és az összeg tisztán formázódik, amint továbblépsz',
      'Egy költségvetés törlése már nem hagyja a költést a vödrök között — az aktuális hónap ' +
        'tranzakciói a „nincs költségvetés” állapotba kerülnek, így egy lezárt hónap mindig ' +
        'újra kijön. A korábbi hónapok pontosan úgy őrzik rekordjaikat, ahogy voltak',
      'Az áttekintés várható hónap végi értéke ismét olvasható sötét módban',
      'A statisztika oldalt mostantól havi költési diagram támasztja alá, a medián hónappal ' +
        'közvetlenül megjelölve rajta — így egy kivételes hónap nem tud többé a normális hónapodként maszkolni',
      'A költségvetés-kihasználás mostantól átlag: minden lezárt hónap összeveti, mennyit ' +
        'költöttél a tervezetthez képest, és minden költségvetés egyetlen őszinte számként tér vissza',
      'A költésminőség diagram minden lezárt hónapot megbánás, semleges és jó kategóriába árnyal ' +
        '— képet adva arról, mennyire volt hasznos a költésed',
      'A megtakarítási tartaléknak saját előzménye is van: hónapról hónapra diagram arról, ' +
        'mennyit tettél hozzá és mennyit vettél ki belőle',
    ],
  },
  {
    version: '1.1.0',
    releasedAt: '2026-09-30T00:00:00.000Z',
    intro:
      'Minden hónapnak mostantól van eleje és vége, és mindkettő a tiéd. Úgy indítod a hónapot, ' +
      'hogy megtervezed, visszatekintesz rá és megítéled, amit ténylegesen elköltöttél, a lezárás ' +
      'pedig jelentést ad arról, hogyan viszonyult a terv és a valóság. A hónap már nem valami, ' +
      'ami csendben elmúlik — hanem valami, amit megtervezel, átnézel és elszámolsz.',
    features: [
      'A hónap indítása egyetlen, szándékos képernyő: állítsd be a keretet, látod a már lekötött ' +
        'fix költségeket és előfizetéseket, tervezz összeget minden költségvetéshez, és mondd meg, ' +
        'mennyit szándékozol kivenni a megtakarítási tartalékból',
      'A tervet a hónap tényleges lehetőségeihez ellenőrzi, így soha nem tervezhetsz el nem létező ' +
        'pénzt — és a tartalékból való kivétel soha nem lehet több, mint amennyi a tartalékban van',
      'A Coconut soha nem talál ki hónapot: az alkalmazás rád vár, és egy hónap csak azért jön ' +
        'létre, mert te elindítottad',
      'Változtass, ahányszor csak akarsz — a költségvetés vagy a kivétel minden módosítása ' +
        'döntésként rögzítődik, így később pontosan látod, hogyan állt össze a terv',
      'A hónap lezárása rendes áttekintés: fix költségek, előfizetések és minden költségvetés ' +
        'egymás mellett, végül egy megerősítés, amely világosan kimondja, hogy a lezárás végleges és nem vonható vissza',
      '„Mennyire volt hasznos a költésed?” — tekints vissza a hónapra, és jelöld meg minden ' +
        'vásárlást megbánásként, semlegesként vagy jóként. Amit nem jelöltél meg, az semlegesnek ' +
        'számít, így egy hónap mindig lezárható',
      'A lezárás a hónap vége felé nyílik meg, és ha ez az ablak elmúlik, a Coconut elrendezi ' +
        'a hónapot — így egy hónap sem marad nyitva',
      'A hónap végi jelentés teljesebb: minden költségvetés mutatja, mivel indult és mire ' +
        'módosítottad a lezárás előtt, így egy újra tervezett költségvetés végre megmagyarázza magát',
      'A tartalékkivétel is része a jelentésnek — a tervezett és a hónap végén ténylegesen ' +
        'megvalósult kivétel, világosan elkülönítve a hónap végén ténylegesen mozgott pénztől',
    ],
  },
  {
    version: '1.0.3',
    releasedAt: '2026-09-25T00:00:00.000Z',
    intro:
      'Az áttekintés képernyő egyetlen kérdés köré épült újra: hogyan állsz a saját tervedhez ' +
      'képest? A Coconut mostantól nem a keretedhez mér, hanem ahhoz, amit elhatároztál ' +
      'elkölteni — így a számok végre jelentenek valamit. Közben két további javítás tartja ' +
      'őszintén az előzményeidet.',
    features: [
      'Csúszka minden egyes költségvetésen, jelezve, mennyire haladt előre a hónap — így ' +
        'összevetheted, mennyi fogyott a költségvetésből és mennyi telt el a hónapból',
      'A négy fő csempe mostantól Tervezett költés, Elérhető (a kereted plusz egyszeri ' +
        'bevétel), Tényleges költés és Maradék — a maradék a terved mínusz az eddig elköltött ' +
        'összeg, zöld, amíg a terven belül vagy, és piros, ha túllépted',
      'A megtakarítási tartalék csempe mostantól mutatja az induló tartalékot, a tervezett ' +
        'kivételt, az eddigi kivételt — zöld, amíg belül vagy, még ha negatív is, piros, ha ' +
        'túllépted — és a hónap végi várható tartalékot',
      'A „Tervezett vs. Elérhető” csempe megszűnt: a terved és a pénzed összevetését az új ' +
        'csempék jobban végzik',
      'Az előfizetés-terhelések mostantól abba a hónapba fagynak be, amelyikben terhelték őket, ' +
        'így egy előfizetés szerkesztése már nem torzítja a korábbi statisztikáidat',
      'Egy fix költség törlése már nem törli a múltbeli adatait, így az előzményeid és átlagaid ' +
        'helyesek maradnak',
    ],
  },
  {
    version: '1.0.2',
    releasedAt: '2026-09-23T00:00:00.000Z',
    intro:
      'Ez a frissítés arról szól, hogy pontosabban illeszd az életed a tervbe. A költségvetések ' +
      'könnyebben olvashatók és rendezhetők, a közös kiadások végre bekerülnek a saját ' +
      'költségvetésedbe, az éves kiadások pedig a saját naptárad ritmusára járnak. Bőven van ' +
      'fényezés is — egy felosztássegítő, amely kiszámol helyetted, egy billentyűzet, amely ' +
      'nem takarja el a mezőket, és költségvetések, amelyekbe egy koppintással beléphetsz.',
    features: [
      'Az áttekintés „Elérhető” összege már nem csordul ki a buborékjából — szépen illeszkedik ' +
        'és olvasható marad',
      'Friss költségvetés-színek, amelyeket sokkal könnyebb első pillantásra megkülönböztetni',
      'A költségvetések mostantól átrendezhetők, és az új sorrend mindenhol tükröződik — ' +
        'áttekintés, tervezés és tranzakciók',
      'A közös kiadások mostantól támogatják a jegyzeteket és mellékleteket, csakúgy, mint a ' +
        'személyes tranzakcióid',
      'Egy közös kiadás hozzárendelhető az egyik személyes költségvetésedhez, így automatikusan ' +
        'megjelenik a saját tervezésedben',
      'A közös kiadások a csoport időszakán belül maradnak — már nem adhatsz hozzá azon kívülre ' +
        'datált bejegyzéseket',
      'Az éves kiadások rugalmas időkeretet követnek, így te döntöd el, mikor kezdődik és ér ' +
        'véget az év',
      'Az előfizetéseket végig újrateszteltük, és a felszínre került durva élek javítva',
      '„Maradék hozzáadása” pontos és százalékos részesedésekhez — egy koppintás automatikusan ' +
        'kitölti az utolsó részesedést',
      'A billentyűzet már nem takarja el a gépelt mezőket — a képernyő felgördül, hogy mindig ' +
        'lásd, mit írsz be',
      'Koppints egy költségvetésre az áttekintésen, hogy lásd az összes hozzá rendelt tranzakciót',
      'Egy költségvetés tervezésekor mostantól látod, mennyi marad a keretedből a várható fix ' +
        'költségek és a többi költségvetésed után, az alapértelmezett és az aktuális hónapban is',
    ],
  },
  {
    version: '1.0.1',
    releasedAt: '2026-09-20T00:00:00.000Z',
    intro:
      'Az 1.0 utáni első frissítés arról szól, hogy a közös terek jól érezzék magukat. A közös ' +
      'adatok mostantól a háttérben is naprakészek, és frissülnek, amint kéred, egy csoportból ' +
      'pedig végre könnyű kilépni, ha már nem vagy tagja. Közben tisztáztunk néhány zavaró ' +
      'elnevezést, és kijavítottunk egy csomó bosszúságot a közös csoportokban.',
    features: [
      'Kézi frissítés a közös terekhez — húzd le a közös képernyőt, és a Coconut eléri a ' +
        'csoportot, és behozza a legfrissebb kiadásokat',
      'A közös terek mostantól automatikusan szinkronizálnak, amikor megnyitod az alkalmazást, ' +
        'így mindenki legfrissebb változásai már ott vannak, mielőtt elkezded',
      'A „Kategória” mostantól egyszerűen „költségvetés” a tranzakciók képernyőn, ahogy ezek ' +
        'a dolgok valójában vannak',
      'A bevétel mostantól „egyszeri bevétel” — olyan név, amely pontosan megmondja, mi: ' +
        'egyszeri hozzáadás az e havi elérhető összeghez',
      'Bármikor kiléphetsz egy közös térből, egy koppintással a csoportmenüben — a csoport ' +
        'átkerül a maradó tagokhoz',
      'A közös kiadások közvetlenül a szerkesztő képernyőjükről törölhetők',
      'A közös képernyő mostantól csak azokat a csoportokat listázza, amelyeknek tényleg tagja ' +
        'vagy — nincs több kísértete azoknak a tereknek, amelyekből eltávolítottak',
      'A közös kiadás „ki fizetett” választója mostantól megbízhatóan kiemeli a kiválasztott személyt',
      'Egy közös csoportban mostantól minden tag kiadásai megjelennek, nem csak a sajátjaid',
      'A személyes tranzakciók mostantól helyesen tükrözik a közös kiadásokat — amikor egy ' +
        'közös összeg változik, a saját költségvetésed mindig lépést tart',
    ],
  },
  {
    version: '1.0.0',
    releasedAt: '2026-09-20T00:00:00.000Z',
    intro:
      'A Coconut eléri az 1.0-t az indulás óta a legnagyobb változással: opcionális, ' +
      'családméretű költségvetésekkel. Szinkronizáld az adataidat a saját Supabase-projektedbe, ' +
      'hogy megmaradjanak az eszközök között — vagy fogj össze másokkal egy közös térben, hogy ' +
      'együtt kövessétek a közös kiadásokat. Minden alapértelmezés szerint helyi és privát ' +
      'marad; a saját backend mindig opt-in.',
    features: [
      'Opcionális Supabase-szinkron — irányítsd a Coconutot a saját Supabase-projektedre, hogy ' +
        'biztonsági mentést készítsen az adataidról, és szinkronban tartsa azokat Android és az ' +
        'asztali web build között. Dobozból kifelé nincs hálózat: kikapcsolva teljesen offline.',
      'Egy szinkronmotor, amely összehangolja bármely eszközön tett változásokat: szerkesztések, ' +
        'új sorok és törlések automatikusan mindkét irányban áramlanak, amint online vagy.',
      'Közös terek — két vagy több fiókkal rendelkező ember együtt követheti a közös kiadásokat, ' +
        'tagszerepekkel, e-mailes meghívókkal és időszaklezárással',
      'Kapcsolt személyes tranzakciók — a közös kiadásból rád eső rész automatikusan megjelenik ' +
        'a saját költségvetésedben, és szinkronban marad, amikor a közös összeg változik',
      'Egy közös időszak lezárása jelentést készít az egyenlegekről és az elszámolt összegekről ' +
        'az egész csoport számára',
      'Különféle hibajavítások és stabilitási javítások minden területen',
    ],
  },
  {
    version: '0.4.0',
    releasedAt: '2026-09-17T00:00:00.000Z',
    intro:
      'A 0.3-as sorozat utolsó frissítése. A Coconut mostantól hónap végi összefoglaló ' +
      'jelentést ír minden lezárt hónaphoz, gyors bemutatót tart az új felhasználóknak, és ' +
      'értesít, amikor új verzió érhető el. Közben a költségvetések színkódolhatók, a ' +
      'tranzakciók napok szerint csoportosulnak, és visszaböngészhetsz a korábbi hónapokban.',
    features: [
      'Hónap végi összefoglaló jelentés — egy hónap lezárása részletes bontást ment a fix ' +
        'költségekről, előfizetésekről, költségvetésekről és arról, hogyan változott a tartalék',
      'Lehetőség a korábbi hónapok megtekintésére a tranzakciók képernyőn',
      'Alkalmazáson belüli bemutató, amely első indításkor végigvezet, és a Beállításokból újranézhető',
      'Automatikus újverzió-értesítések, amikor újabb kiadás érhető el',
      'A tranzakciók dátum szerint csoportosulnak, így könnyen látod, mit költöttél egy adott napon',
      'Javítva a kezdeti tartalék beállítása, hogy tényleg frissítse a hónap kezdő egyenlegét',
      'Szín rendelése minden rugalmas költségvetéshez — az ezzel megjelölt tranzakciók egyező ikont kapnak',
    ],
  },
  {
    version: '0.3.0',
    releasedAt: '2026-09-17T00:00:00.000Z',
    intro:
      'Kiegészítések minden területen: éves előfizetések és egyszeri bevétel a valósághűbb ' +
      'tervezéshez, egy végre intuitív tartalékszám, euró alapértelmezett valutaként, ' +
      'fotómellékletek a tranzakciókon és letisztultabb kezdőképernyő.',
    features: [
      'Éves előfizetések — az évente egyszeri terheléseket lapos havi összegre osztja, opcionális ' +
        'havi levonással és megújítási hónap emlékeztetővel',
      'Egyszeri bevétel — a bónuszok és más kiegészítések beleszámítanak az adott hónapban elérhető összegbe',
      'A tartalékkorrekció mostantól pozitívként jelenik meg, amikor félreteszel (zöld), és ' +
        'negatívként, amikor túlköltekezel (piros)',
      'Az alapértelmezett valuta euróra (€) váltott',
      'Opcionális fotómelléklet minden tranzakcióhoz',
      'Letisztult áttekintés képernyő tisztább szerkezettel',
    ],
  },
  {
    version: '0.2.0',
    releasedAt: '2026-09-16T00:00:00.000Z',
    features: [
      'Javítva a biztonsági mentések visszaállítása — az importálás ismét működik',
      'Felületi javítások és konzisztencia-javítások',
      'Újraformázott Névjegy oldal',
      'Új Újdonságok szakasz',
      'Animációk és átdolgozott sötét téma',
    ],
  },
  {
    version: '0.1.31',
    releasedAt: '2026-09-16T09:31:35.555Z',
    intro:
      'A Coconut első nyilvános buildje, egy privát, offline-first költségvetés-kezelő ' +
      'alkalmazás. Minden hónapban összeveti a keretedet a tervezett fix költségekkel és ' +
      'rugalmas költségvetésekkel, miközben nyilvántart egy megtakarítási tartalékot. Minden ' +
      'kizárólag ezen az eszközön marad — nincs hálózat, nincs fiók, nincs követés.',
    features: [
      'Alapfelállás: havi keret, fix költségek, rugalmas költségvetések és megtakarítási tartalék',
      'Új témamotor',
      'Az utolsó X tranzakció megjelenítése a kezdőképernyőn',
      'Információs szakasz a Beállításokban',
    ],
  },
];
