# ADR 0015: Auth0-Identität und persistierte Aktionsrechte

Status: R1-03 implementiert; Portal, übrige Zugriffsoperationen und Remote-MCP folgen getrennt.

## Entscheidung

Auth0 bleibt der Tokenanbieter. Die bisherigen bindings ordnen geprüfte Subjects/Clients/Organisationen lokalen Akteuren zu und begrenzen Token-Scopes. Sie sind kein hinreichender Rechtenachweis mehr. Der Live-Server prüft anschließend für jede geschützte Aktion den gespeicherten Akteur, Organisation, Mitgliedschaft beziehungsweise Agentenfreigabe und die für diese Operation erforderlichen Scopes.

Neue Zod-Verträge erzeugen agency_memberships und agent_grants durch die Vorwärtsmigration 0005_authorization.sql. Keine Mitgliedschaft oder Freigabe wird automatisch angelegt. Kundenverbindungen können lediglich eigene Grants lesen; verwaltende Rechte liegen im getrennten NOLOGIN-Gründerkanal. Zusammengesetzte Fremdschlüssel erhalten die Kundentrennung. SQL-Constraints einschließlich begrenzter Scope-Arrays werden aus Zod abgeleitet; unbekannte Schemaformen brechen die Generierung ab. Frühere Migrationen bleiben unverändert.

## Aktive Operationen

| Operation | Verbindliche Rechte |
|---|---|
| createCustomer, POST /customers | Mensch: aktive Gründer-Mitgliedschaft für Organisation und internen Auth0-Client. Agent: aktive befristete Agentenberechtigung für agency, passende Identität und customers:write. Token und bindings müssen diesen Scope zusätzlich besitzen. |
| getOrganization, GET /v1/organization | Mensch: aktive normale Kundenmitgliedschaft. Agent: passender aktiver Grant für customer. Zusätzlich organizations:read im Token und der Zuordnung. Nur die eigene Organisationsprojektion. |

Die Ansicht wird durch die Operation bestimmt, nicht durch Header, Query oder Körper des Aufrufers. Eine Gründer-Mitgliedschaft ersetzt keine Kundenmitgliedschaft. Das Eigenkundenkennzeichen gewährt keine Rolle. Gründerrechte sind außerdem an den internen Auth0-Client gebunden; beim späteren Portalclient entsteht keine automatische Übernahme dieser Rechte.

Agentenberechtigungen binden Art (M2M/OAuth), agentId, Subject, Client, Auth0-Organisation, lokale Organisation, Ansicht, Scopes und Ablaufzeit. Pausierte Agenten und widerrufene, fehlende oder abgelaufene Grants werden abgewiesen. suspended/archived sperren beide Operationen; prospect/customer erlauben Aktionen innerhalb der tatsächlich vergebenen Rechte. Kosten-, Budget- oder Veröffentlichungsfreigaben entstehen hier nicht.

Der aktive Vertragskatalog enthält die beiden bisherigen Operationen und getOrganization. OpenAPI und Tooldefinitionen werden daraus erzeugt. Alle übrigen R1-Verträge bleiben Spezifikation ohne aktive Route. Die Tooldefinition ist kein Nachweis eines bereits laufenden MCP-Servers.

## Transaktion, Widerruf und Audit

Rechteprüfung und Geschäftsaktion verwenden dieselbe eingeschränkte Datenbanktransaktion. Auch ein Idempotenz-Replay braucht eine neue Rechteprüfung. Ein organisationsgebundener transaktionaler Advisory-Lock serialisiert die kurze API-Aktion mit Rechteänderungen. Trigger an Organisationen, Mitgliedschaften, Grants, Benutzern und Agenten verwenden dieselbe Sperre; bei Zuordnungsänderungen werden alte und neue Organisation in fester Reihenfolge gesperrt.

Eine bereits autorisierte kurze Aktion darf zuerst abschließen; nach dem Commit des Widerrufs scheitern Folgeaktionen. Dies beendet noch keine extern laufenden Agentenprozesse oder Temporal-Aufträge. Lang laufende externe Aktionen benötigen später erneute Prüfungen an ihren Wirkungspunkten. Sperrfehler/Datenbankausfall führen zu geschlossenen Fehlern, nicht zu einer Umgehung. Die organisationsweite Serialisierung ist für den ersten Agenturbetrieb bewusst einfach; spätere Lasttests können eine feinere Sperrstrategie rechtfertigen.

Erlaubte und verweigerte zugeordnete Requests erhalten Audit mit Organisation, lokalem beziehungsweise beanspruchtem Akteur, Aktionsart, Ansicht, Request-ID, Ausgang und begrenztem Grund. Fehlgeschlagene Geschäftsaktionen werden nach ihrem Rollback separat protokolliert. Tokens, Subjects, externe Fehlermeldungen und Kundeninhalte werden nicht hineinkopiert. Eine nicht existierende Organisation kann kein FK-gebundenes Audit erhalten; nicht zuordenbare/ungültige Tokens erhalten weiterhin 401/403 ohne erfundene lokale Identität.

revokeAuthorization ist ein ausdrücklich interner Betreiberaufruf im Gründerkanal. Er widerruft eine Kunden-/Gründer-Mitgliedschaft oder einen Agenten-Grant im ausgewählten Mandanten und protokolliert Grund und Ziel atomar. Wiederholungen erhalten das ursprüngliche Widerrufsdatum. Ein unbekanntes/fremdes Ziel wird abgewiesen. Es gibt noch keine öffentliche Grant-Verwaltungsroute; deren Freigabe braucht einen eigenen Scope-/UI-/MCP-Nachweis.

## Betreiberkonfiguration und Grenzen

Nach Migration bleiben alle bisherigen API-Identitäten ohne die neuen gespeicherten Rechte gesperrt. Betreiber müssen Organisationsprofil, Akteur, passende Mitgliedschaft/Grant und Token-Scopes ausdrücklich einrichten. Für Gründer-Mitgliedschaften ist der tatsächliche interne AUTH0_CLIENT_ID nötig; für Agenten gelten genaue Client-/Subject-/Organisationswerte und Ablauf. Kein Default-Grant aus alten bindings, Name oder Eigenkundenkennzeichen.

Der API-Betrieb benötigt keinen Gründer-Datenbankpool; er arbeitet mit beacon_app. Betreiberverwaltung erfolgt separat über den kontrollierten Gründerkanal gemäß ADR 0014. Es werden hier keine Logins, Zugangsdaten oder echten Akteure erzeugt. AUTH0_AUTH_BINDINGS bleibt vorerst die Identitätszuordnung; deren dynamische Verwaltung und öffentliche OAuth-/MCP-Autorisierung gehören zu Folgeaufgaben.

Die aktuelle Betriebsoberfläche enthält noch keine geschützten Kundendaten. Ihr Login-Hinweis ersetzt keine API-Rechteprüfung. Das separate Kundenportal einschließlich eigenem Auth0-Client folgt in R1-04, fachliche Sichtbarkeit/Publikation in R1-05. Dev-Memory ist ausdrücklich nur ein synthetischer Mock und kein Nachweis der Live-Rechte.

Grundlage für Sperren: [PostgreSQL Advisory Locks](https://www.postgresql.org/docs/18/explicit-locking.html#ADVISORY-LOCKS).
