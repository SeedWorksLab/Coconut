import type { WhatsNewEntry } from './whats-new';

export const whatsNewDe: WhatsNewEntry[] = [
  {
    version: '1.2.0',
    releasedAt: '2026-10-29T00:00:00.000Z',
    intro:
      'Coconut hat jetzt ein Zuhause auf dem Desktop. Dasselbe private, offline-first Budget ' +
      'läuft als Linux-Desktop-App, und das Abschließen eines Monats gibt dir endlich einen Ort, ' +
      'um festzuhalten, wie es wirklich gelaufen ist. Ein paar kleine Korrekturen halten ' +
      'unterwegs den Start und den Monatsbericht in Form.',
    features: [
      'Coconut ist jetzt als Linux-AppImage für den Desktop verfügbar, mit demselben local-first ' +
        'Ansatz und demselben konto- und netzwerkfreien Standard wie die Android-App',
      'Das Abschließen eines Monats enthält jetzt ein Urteil und einen Notizbereich — halte fest, ' +
        'was gut lief, was schlecht lief und warum der Monat so ausgegeben wurde',
      'Das Monatsurteil wird mit dem Monat gespeichert und im Monatsbericht angezeigt, sodass die ' +
        'Geschichte hinter den Zahlen bei den Zahlen bleibt',
      'Behoben: Die Desktop-App hing beim Start, wenn Datenbank- und Schrift-Assets im ' +
        'paketierten Build fehlten',
      'Behoben: Ein Datenbank-Updatefehler konnte das Laden der App nach einem Update verhindern',
      'Beschriftungen und neutrale Werte im Monatsbericht bleiben im Dunkelmodus lesbar',
    ],
  },
  {
    version: '1.1.1',
    releasedAt: '2026-10-08T00:00:00.000Z',
    intro:
      'Diese Version dreht sich um Zahlen, denen du am Ende des Tages vertrauen kannst. Die ' +
      'Betragseingabe in der Monatsplanung stolpert nicht mehr über sich selbst, das Löschen ' +
      'einer Kategorie lässt seine Ausgaben nicht mehr in einer Ecke liegen, in der nichts ' +
      'zusammenpasst, und die Übersicht hält ihren prognostizierten Monatsendstand endlich ' +
      'auch im Dunkelmodus lesbar. Und die Statistiken wurden neu um das aufgebaut, was du ' +
      'wirklich wissen willst: deinen Rhythmus, deine Durchschnitte und wie nützlich deine ' +
      'Ausgaben wirklich waren.',
    features: [
      'Die Betragseingabe in der Monatsplanung ist behoben — die App hängt sich nicht mehr an ' +
        'halbfertige Zahlen, während du noch tippst, und der Betrag formatiert sich sauber, ' +
        'sobald du weitermachst',
      'Das Löschen einer Kategorie lässt ihre Ausgaben nicht mehr zwischen den Töpfen stranden — ' +
        'die Transaktionen des aktuellen Monats werden auf „keine Kategorie“ gesetzt, sodass ein ' +
        'abgeschlossener Monat immer wieder aufgeht. Vergangene Monate behalten ihre Aufzeichnungen genau so',
      'Der prognostizierte Monatsendstand in der Übersicht ist im Dunkelmodus wieder lesbar',
      'Ein monatliches Ausgabendiagramm verankert jetzt die Statistikseite, mit dem Medianmonat ' +
        'direkt darauf markiert — so kann sich ein außergewöhnlicher Monat nicht mehr als dein Normal ausgeben',
      'Die Kategorienutzung ist jetzt ein Durchschnitt: Jeder abgeschlossene Monat vergleicht, ' +
        'was du ausgegeben hast, mit dem, was du geplant hast, und jede Kategorie kommt als eine ' +
        'einzige ehrliche Zahl zurück',
      'Ein Diagramm der Ausgabenqualität schattiert jeden abgeschlossenen Monat in Bereut, ' +
        'Neutral und Gut — ein Bild davon, wie nützlich deine Ausgaben wirklich waren',
      'Auch die Ersparnisse bekommen ihren eigenen Verlauf: ein Monat-für-Monat-Diagramm dessen, ' +
        'was du hinzugefügt und was du entnommen hast',
    ],
  },
  {
    version: '1.1.0',
    releasedAt: '2026-09-30T00:00:00.000Z',
    intro:
      'Jeder Monat hat jetzt einen Anfang und ein Ende, und beide gehören dir. Du startest den ' +
      'Monat, indem du ihn planst, blickst darauf zurück und beurteilst, was du tatsächlich ' +
      'ausgegeben hast, und das Abschließen liefert dir einen Bericht darüber, wie Plan und ' +
      'Realität wirklich zusammenpassten. Ein Monat ist nicht länger etwas, das still ' +
      'vorbeizieht — er ist etwas, das du planst, prüfst und abschließt.',
    features: [
      'Einen Monat zu starten ist ein einziger, bewusster Bildschirm: Lege das Budget fest, ' +
        'sieh die bereits gebundenen Fixkosten und Abonnements, plane einen Betrag für jede ' +
        'Kategorie und sage, wie viel du aus deinen Ersparnissen entnehmen willst',
      'Der Plan wird gegen das geprüft, was der Monat tatsächlich verkraften kann, sodass du nie ' +
        'Geld einplanen kannst, das nicht da ist — und eine Entnahme aus den Ersparnissen kann ' +
        'nie größer sein als der Bestand',
      'Coconut erfindet nie einen Monat: Die App wartet auf dich, und ein Monat entsteht nur, ' +
        'weil du ihn gestartet hast',
      'Ändere deine Meinung so oft du willst — jede Anpassung an einer Kategorie oder an der ' +
        'Entnahme wird als Entscheidung erfasst, sodass du später genau siehst, wie der Plan zustande kam',
      'Das Abschließen eines Monats ist eine richtige Rückschau: Fixkosten, Abonnements und jede ' +
        'Kategorie nebeneinander, endend mit einer Bestätigung, die klar sagt, dass das ' +
        'Abschließen endgültig ist und nicht rückgängig gemacht werden kann',
      '„Wie nützlich waren deine Ausgaben?“ — Blicke über den Monat zurück und markiere jeden ' +
        'Einkauf als Bereut, Neutral oder Gut. Was du nie markiert hast, zählt als neutral, ' +
        'sodass ein Monat immer abgeschlossen werden kann',
      'Das Abschließen öffnet gegen Monatsende, und wenn dieses Fenster verstreicht, regelt ' +
        'Coconut den Monat für dich — so bleibt kein Monat offen hängen',
      'Der Monatsbericht ist vollständiger: Jede Kategorie zeigt jetzt, womit sie begonnen hat ' +
        'und worauf du sie vor dem Abschließen angepasst hast, sodass sich eine neu geplante ' +
        'Kategorie endlich erklärt',
      'Auch die Entnahme aus den Ersparnissen ist Teil des Berichts — die geplante und die zum ' +
        'Monatsende tatsächliche Entnahme, klar getrennt vom Geld, das sich am Monatsende wirklich bewegt hat',
    ],
  },
  {
    version: '1.0.3',
    releasedAt: '2026-09-25T00:00:00.000Z',
    intro:
      'Die Übersicht wurde um eine einzige Frage herum neu aufgebaut: Wie stehst du im Vergleich ' +
      'zu deinem eigenen Plan da? Statt dich an deinem Budget zu messen, misst Coconut dich jetzt ' +
      'an dem, was du ausgeben wolltest — so bedeuten die Zahlen endlich etwas für dich. Zwei ' +
      'weitere Korrekturen halten unterwegs deinen Verlauf ehrlich.',
    features: [
      'Ein Schieberegler an jeder einzelnen Kategorie, der zeigt, wie weit der Monat ' +
        'fortgeschritten ist — so kannst du vergleichen, wie viel der Kategorie ausgegeben und ' +
        'wie viel des Monats vergangen ist',
      'Die vier Hauptkacheln heißen jetzt Geplante Ausgaben, Verfügbar (dein Budget plus ' +
        'einmalige Einnahmen), Tatsächlich ausgegeben und Verbleibend — wobei Verbleibend dein ' +
        'Plan minus das bisher Ausgegebene ist, grün solange du im Plan bist und rot, sobald du darüber bist',
      'Die Kachel für die Ersparnisse zeigt jetzt den Startbestand, die geplante Entnahme, die ' +
        'bisherige Entnahme — grün solange du darin bist, auch wenn sie negativ ist, rot sobald ' +
        'du darüber bist — und den prognostizierten Bestand am Monatsende',
      'Die Kachel „Geplant vs. Verfügbar“ ist weg: Deinen Plan mit deinem Geld zu vergleichen, ' +
        'ist genau das, was die neuen Kacheln besser tun',
      'Abonnement-Belastungen werden jetzt in dem Monat eingefroren, in dem sie belastet wurden, ' +
        'sodass die Bearbeitung eines Abonnements deine älteren Statistiken nicht mehr verzerrt',
      'Das Löschen einer Fixkostenposition löscht nicht mehr ihre vergangenen Daten, sodass ' +
        'dein Verlauf und deine Durchschnitte korrekt bleiben',
    ],
  },
  {
    version: '1.0.2',
    releasedAt: '2026-09-23T00:00:00.000Z',
    intro:
      'Dieses Update dreht sich darum, dein Leben genauer in den Plan zu bringen. Kategorien ' +
      'lassen sich leichter lesen und ordnen, geteilte Ausgaben landen endlich in deiner eigenen ' +
      'Kategorie, und jährliche Ausgaben folgen dem Rhythmus deines eigenen Kalenders. Dazu gibt ' +
      'es eine gesunde Portion Feinschliff — einen Aufteilungshilfer, der die Mathematik für dich ' +
      'erledigt, eine Tastatur, die deine Felder nicht mehr verdeckt, und Kategorien, in die du ' +
      'direkt hineintippen kannst.',
    features: [
      'Der Betrag „Verfügbar“ in der Übersicht läuft nicht mehr aus seiner Blase heraus — er ' +
        'passt sauber hinein und bleibt lesbar',
      'Neue Kategoriefarben, die sich auf einen Blick viel leichter unterscheiden lassen',
      'Kategorien lassen sich jetzt neu anordnen, und die neue Reihenfolge spiegelt sich überall ' +
        'wider — Übersicht, Planung und Transaktionen',
      'Geteilte Ausgaben unterstützen jetzt Notizen und Anhänge, genau wie deine persönlichen Transaktionen',
      'Eine geteilte Ausgabe kann einer deiner persönlichen Kategorien zugewiesen werden, sodass ' +
        'sie automatisch in deiner eigenen Planung erscheint',
      'Geteilte Ausgaben bleiben innerhalb des Zeitraums der Gruppe — du kannst keine Einträge ' +
        'mehr außerhalb davon datieren',
      'Jährliche Ausgaben folgen einem flexiblen Zeitrahmen, sodass du entscheidest, wann das Jahr beginnt und endet',
      'Abonnements wurden durchgängig neu getestet, und die aufgetretenen rauen Kanten sind behoben',
      '„Rest hinzufügen“ für exakte und prozentuale Anteile — ein Tipp füllt den letzten Anteil ' +
        'automatisch für dich',
      'Die Tastatur überlagert nicht mehr die Felder, in die du tippst — der Bildschirm scrollt ' +
        'hoch, sodass du immer siehst, was du eingibst',
      'Tippe in der Übersicht auf eine Kategorie, um jede ihr zugewiesene Transaktion zu sehen',
      'Beim Planen einer Kategorie siehst du jetzt, wie viel deines Budgets nach erwarteten ' +
        'Fixkosten und deinen anderen Kategorien übrig bleibt, sowohl im Standard- als auch im aktuellen Monat',
    ],
  },
  {
    version: '1.0.1',
    releasedAt: '2026-09-20T00:00:00.000Z',
    intro:
      'Das erste Update seit 1.0 dreht sich darum, dass sich geteilte Bereiche richtig anfühlen. ' +
      'Geteilte Daten bleiben jetzt im Hintergrund aktuell und aktualisieren sich, sobald du ' +
      'danach fragst, und es ist endlich einfach, eine Gruppe zu verlassen, zu der du nicht mehr ' +
      'gehörst. Unterwegs haben wir ein paar verwirrende Namen geklärt und eine Reihe von ' +
      'Ärgernissen in geteilten Gruppen behoben.',
    features: [
      'Manuelles Aktualisieren für geteilte Bereiche — ziehe den geteilten Bildschirm herunter, ' +
        'und Coconut erreicht die Gruppe und holt die neuesten Ausgaben',
      'Geteilte Bereiche synchronisieren jetzt automatisch beim Öffnen der App, sodass die ' +
        'neuesten Änderungen aller anderen schon da sind, bevor du beginnst',
      '„Kategorie“ heißt auf dem Transaktionsbildschirm jetzt einfach „Kategorie“, passend zu ' +
        'dem, was diese Dinge tatsächlich sind',
      'Einnahmen heißen jetzt „einmalige Einnahmen“ — ein Name, der genau sagt, was es ist: ' +
        'eine einmalige Ergänzung zu dem, was dir diesen Monat zur Verfügung steht',
      'Du kannst einen geteilten Bereich jederzeit verlassen, mit einem Tipp im Gruppenmenü — ' +
        'die Gruppe wird an die verbleibenden Mitglieder übergeben',
      'Geteilte Ausgaben können direkt von ihrem Bearbeitungsbildschirm gelöscht werden',
      'Der geteilte Bildschirm listet jetzt nur Gruppen, in denen du tatsächlich Mitglied bist — ' +
        'keine Geister von Bereichen mehr, aus denen du entfernt wurdest',
      'Die Auswahl „Wer hat bezahlt“ bei einer geteilten Ausgabe hebt jetzt zuverlässig die ' +
        'gewählte Person hervor',
      'Die Ausgaben jedes Mitglieds erscheinen jetzt in einer geteilten Gruppe, nicht nur die, ' +
        'die du selbst hinzugefügt hast',
      'Persönliche Transaktionen spiegeln geteilte Ausgaben jetzt korrekt — wenn sich ein ' +
        'geteilter Betrag ändert, hält dein eigenes Budget immer mit',
    ],
  },
  {
    version: '1.0.0',
    releasedAt: '2026-09-20T00:00:00.000Z',
    intro:
      'Coconut erreicht 1.0 mit der größten Änderung seit dem Start: optionale, familientaugliche ' +
      'Budgets. Synchronisiere deine Daten mit deinem eigenen Supabase-Projekt, damit sie über ' +
      'Geräte hinweg erhalten bleiben — oder schließe dich mit anderen in einem geteilten ' +
      'Bereich zusammen, um gemeinsame Ausgaben zu verfolgen. Alles bleibt standardmäßig lokal ' +
      'und privat; dein eigenes Backend ist immer opt-in.',
    features: [
      'Optionale Supabase-Synchronisierung — richte Coconut auf dein eigenes Supabase-Projekt, ' +
        'um deine Daten zu sichern und sie zwischen Android und dem Desktop-Web-Build ' +
        'synchron zu halten. Von Haus aus gibt es kein Netzwerk: Aus bleibt vollständig offline.',
      'Eine Synchronisierungs-Engine, die auf jedem Gerät vorgenommene Änderungen abgleicht: ' +
        'Bearbeitungen, neue Zeilen und Löschungen fließen automatisch in beide Richtungen, ' +
        'sobald du online bist.',
      'Geteilte Bereiche — zwei oder mehr Personen mit Konten können gemeinsame Ausgaben ' +
        'zusammen verfolgen, mit Mitgliederrollen, E-Mail-Einladungen und Zeitraumabschluss',
      'Verknüpfte persönliche Transaktionen — dein Anteil an einer geteilten Ausgabe erscheint ' +
        'automatisch in deiner eigenen Kategorie und bleibt synchron, wenn sich der geteilte Betrag ändert',
      'Das Abschließen eines geteilten Zeitraums erzeugt einen Bericht über Salden und ' +
        'ausgeglichene Beträge für die ganze Gruppe',
      'Verschiedene Fehlerbehebungen und Stabilitätsverbesserungen in allen Bereichen',
    ],
  },
  {
    version: '0.4.0',
    releasedAt: '2026-09-17T00:00:00.000Z',
    intro:
      'Das letzte Update der 0.3-Reihe. Coconut schreibt jetzt für jeden abgeschlossenen Monat ' +
      'einen Monatsendbericht, führt neue Nutzer durch eine kurze Einführung und meldet, wenn ' +
      'eine neue Version verfügbar ist. Unterwegs lassen sich Kategorien farblich kennzeichnen, ' +
      'Transaktionen werden nach Tagen gruppiert, und du kannst durch frühere Monate blättern.',
    features: [
      'Monatsendbericht — das Abschließen eines Monats speichert eine detaillierte Aufschlüsselung ' +
        'von Fixkosten, Abonnements, Kategorien und der Veränderung der Ersparnisse',
      'Option, frühere Monate auf dem Transaktionsbildschirm anzuzeigen',
      'Eine In-App-Einführung, die dich beim ersten Start durch die App führt und in den ' +
        'Einstellungen erneut abgespielt werden kann',
      'Automatische Benachrichtigungen über neue Versionen, wenn eine neuere Veröffentlichung verfügbar ist',
      'Transaktionen werden nach Datum gruppiert, sodass leicht zu sehen ist, was an einem ' +
        'bestimmten Tag ausgegeben wurde',
      'Behoben: Die Einstellung für die Anfangserparnisse aktualisiert jetzt tatsächlich den ' +
        'Startbestand des Monats',
      'Weise jeder flexiblen Kategorie eine Farbe zu — entsprechend markierte Transaktionen ' +
        'erhalten ein passendes Symbol',
    ],
  },
  {
    version: '0.3.0',
    releasedAt: '2026-09-17T00:00:00.000Z',
    intro:
      'Ergänzungen in allen Bereichen: jährliche Abonnements und einmalige Einnahmen für eine ' +
      'realistischere Planung, eine endlich intuitive Ersparniszahl, Euro als Standardwährung, ' +
      'Fotoanhänge an Transaktionen und ein aufgeräumterer Startbildschirm.',
    features: [
      'Jährliche Abonnements — teile einmal jährlich anfallende Kosten in einen gleichmäßigen ' +
        'Monatsbetrag auf, mit optionalem monatlichem Abzug und Erinnerung im Verlängerungsmonat',
      'Einmalige Einnahmen — Boni und andere Ergänzungen zählen zu dem, was in diesem Monat verfügbar ist',
      'Die Ersparnisanpassung liest sich jetzt positiv, wenn du Geld zurücklegst (grün), und ' +
        'negativ, wenn du zu viel ausgibst (rot)',
      'Standardwährung auf Euro (€) umgestellt',
      'Optionaler Fotoanhang an jeder Transaktion',
      'Ein aufgeräumter Übersichtsbildschirm mit klarerer Struktur',
    ],
  },
  {
    version: '0.2.0',
    releasedAt: '2026-09-16T00:00:00.000Z',
    features: [
      'Behoben: Wiederherstellen von Sicherungen — der Import funktioniert wieder',
      'UI-Korrekturen und Konsistenzverbesserungen',
      'Eine neu formatierte Über-Seite',
      'Ein neuer Bereich „Neuigkeiten“',
      'Animationen und eine überarbeitete dunkle Darstellung',
    ],
  },
  {
    version: '0.1.31',
    releasedAt: '2026-09-16T09:31:35.555Z',
    intro:
      'Der erste öffentliche Build von Coconut, einer privaten, offline-first Budget-App. ' +
      'Jeden Monat vergleicht sie dein Budget mit geplanten Fixkosten und flexiblen Kategorien ' +
      'und führt eine Ersparnis. Alles bleibt nur auf diesem Gerät — kein Netzwerk, kein Konto, ' +
      'kein Tracking.',
    features: [
      'Grundaufbau: monatliches Budget, Fixkosten, flexible Kategorien und eine Ersparnis',
      'Eine neue Theming-Engine',
      'Die letzten X Transaktionen auf dem Startbildschirm anzeigen',
      'Ein Info-Bereich in den Einstellungen',
    ],
  },
];
