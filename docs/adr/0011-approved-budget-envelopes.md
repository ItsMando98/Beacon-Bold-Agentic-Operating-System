# ADR 0011: Genehmigte Budgetrahmen

Status: Produktentscheidung durch den Gründer am 1. Oktober 2026 freigegeben; technische Durchsetzung folgt vor kostenpflichtigen ROASWELL-Abläufen.

## Entscheidung

requestApproval genehmigt einen Budgetrahmen mit Zweck, Kunde beziehungsweise ROASWELL-Betrieb, erlaubtem Anbieter, Zeitraum, Währung sowie Gesamt- und Aktionslimits. Innerhalb eines gültigen Rahmens dürfen berechtigte interne und externe Agenten selbstständig kostenpflichtige Aktionen ausführen. Ohne Rahmen beträgt das verfügbare Budget null.

Eine neue Verpflichtung, ein neuer Anbieter, ein anderer Zweck, eine Limitüberschreitung oder eine Verlängerung erfordert eine neue Gründerfreigabe. Werbeausgaben, Agenturhonorar und interne Betriebskosten werden getrennt erfasst. Tarifverträge und neue externe Ressourcen werden durch diese Entscheidung nicht bestellt.

Vor Ausführung werden die maximal erwarteten Kosten atomar reserviert. Gleichzeitige Aufträge teilen denselben Budgetzähler. Nach erfolgreicher Ausführung werden tatsächliche Kosten abgeglichen. Bei unbekanntem Ergebnis bleibt die Reservierung bis zur Reconciliation bestehen; ein Timeout gibt kein Budget frei. Wiederholungen verwenden denselben Idempotenzschlüssel und dürfen keine erneute Ausgabe verursachen.

Widerruf und Notbremse verhindern neue Aktionen; bereits ausgelöste externe Verpflichtungen werden abgeglichen. Budgetgenehmigung ersetzt keine Veröffentlichungsfreigabe oder Kundenberechtigung.

## Übergang

Die Entscheidung ersetzt die ursprüngliche Pflicht zur Einzelgenehmigung jeder Geldwirkung, sobald die technische Budgetdurchsetzung abgenommen ist. Bis dahin bleibt jede reale Geldwirkung einzeln über den manuellen Gründerfreigabeweg gesperrt. Auch der kostenlose Einstieg benötigt einen vorab genehmigten ROASWELL-Rahmen für Modellkosten.

## Abnahme

Automatische Tests prüfen parallele Reservierungen, fehlende/abgelaufene/widerrufene Rahmen, Anbieter- und Zweckabweichung, Ausgabenreplay, Grenzbeträge, unklaren Anbieterstatus und Notbremse. Live-Ausgaben sind kein Testersatz; Anbieterabnahmen verwenden Sandbox und synthetische Daten.
