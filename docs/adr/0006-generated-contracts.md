# ADR 0006: OpenAPI und Tools aus gemeinsamen Zod-Verträgen

Status: technische Umsetzung P1-2. REST-Ausführung, Authentifizierung und MCP-Transport bleiben P1-3 bis P1-5.

Die Operationsliste in `packages/schemas/src/contracts.ts` verbindet Zod-Ein-/Ausgaben mit Route, Methode, Operation-ID, Tool-Name, Erfolgscode und benötigten Scopes. Die Generatoren verwenden die native JSON-Schema-Konvertierung von Zod 4.6.5. OpenAPI 3.1.1 und Tool-Schemas verwenden JSON Schema 2020-12. Doppelte IDs, Tool-Namen und Routen sowie nicht darstellbare Typen werden abgewiesen; sie werden nicht zu beliebigen JSON-Werten erweitert. Interne Speicherannotationen verlassen das Schema-Paket nicht. Komponenteninterne Referenzen werden für OpenAPI auf den Dokumentwurzelpfad umgelegt.

P1-1 speichert Zeitstempel als Date. Eine aus denselben Feldern abgeleitete Wire-Variante verwendet validierte ISO-Zeitstempel. Die Date-Verträge und die bestehende SQL-Migration bleiben unverändert. `serializeEntity` validiert zunächst den Datenbankdatensatz und danach seine JSON-Darstellung. Weitere nicht unterstützte Datentypen oder Date-Verfeinerungen benötigen einen ausdrücklichen Wire-Vertrag. JSON Schema beschreibt Struktur und Grenzen; Normalisierung wie das Trimmen eines Namens erfolgt weiterhin durch den Zod-Parser.

Die Beispielverträge umfassen `get_health` und `create_customer`. Kundenanlage übernimmt ausschließlich den Namen vom Aufrufer; ID, Mandant und Zeitstempel setzt später der Dienst. Die Scope-Bezeichnung `customers:write` ist Vertragsmetadatum, keine erteilte Berechtigung und kein Authentifizierungsnachweis. Der Freigabe- oder Zahlungsworkflow wird dadurch nicht aktiviert.

Versionierte JSON-Artefakte liegen in `packages/schemas/generated`. `pnpm --filter @beacon/schemas generate` erzeugt sie mit dem vorhandenen gepinnten Projektformatter. Der Schema-Build kontrolliert die Artefakte bytegenau; veraltete Artefakte blockieren CI. Fachliche TypeScript-Typen entstehen mit z.input/z.output aus den Zod-Verträgen, ohne eine zweite Typdefinition.

Abnahme: Ein Test erweitert einen einzigen Kundenvertrag und weist die Änderung am Eingabetyp, Ausgabetyp, OpenAPI-Dokument und Tool-Schema nach. Scalar validiert OpenAPI einschließlich Referenzen; Ajv prüft die JSON-Schemas sämtlicher Entitäten und Tools. Alle Validatoren laufen lokal ohne Anbieterzugang.

Offen bleiben Auth-/Scope-Durchsetzung (P1-4), Idempotenz und HTTP-Fehlerverhalten (P1-3), MCP-Transport (P1-5) und eine spätere öffentliche Versionierungs-/Deprecation-Strategie. Diese Entscheidung bestimmt deren gemeinsame Vertragsquelle, keine Produktionsfreigabe.

Referenzen: [Zod JSON Schema](https://zod.dev/json-schema), [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html), [MCP Tools](https://modelcontextprotocol.io/specification/2025-06-18/server/tools).
