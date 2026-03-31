# Homey MCP Server

Verbind elke AI-agent (Claude, GPT-4, Cursor, Windsurf...) met je Homey via het **Model Context Protocol (MCP)**. Bedien apparaten, beheer flows, zones, logica-variabelen, en nog veel meer — allemaal vanuit een AI-gesprek.

---

## Wat is MCP?

Het **Model Context Protocol** is een open standaard van Anthropic waarmee AI-assistenten tools kunnen aanroepen op externe systemen. Deze Homey-app fungeert als een MCP-server die draait op je Homey Pro. Elke MCP-compatibele AI-client kan er verbinding mee maken.

```
Claude / GPT / Cursor
       ↕ MCP (HTTP)
  Homey Pro (lokaal netwerk)
    └── Homey MCP Server App
          ├── 81 tools beschikbaar
          └── Volledige Homey Web API
```

---

## Vereisten

| Vereiste | Versie |
|----------|--------|
| Homey Pro | 2016 / 2019 / 2023 / 2026 |
| Homey firmware | ≥ 5.0.0 |
| Athom account | my.homey.app |

> **Let op:** Homey Cloud wordt niet ondersteund — de MCP HTTP-server vereist een lokaal netwerk (Homey Pro).

---

## Installatie

### Stap 1 — App installeren

**Via Homey App Store** *(aanbevolen)*
1. Open de Homey app op je telefoon
2. Ga naar **Meer → Apps → App Store**
3. Zoek op **"Homey MCP Server"**
4. Klik op **Installeren**

**Via Homey CLI** *(voor ontwikkelaars)*
```bash
git clone https://github.com/weide43/homey-mcp-server
cd homey-mcp-server
npm install
# Maak een lokale preview stub aan voor de settings pagina:
cp settings/homey.example.js settings/homey.js
homey app run --remote
```

---

### Stap 2 — Personal Access Token aanmaken

Een PAT geeft de app toegang tot alle Homey API's.

1. Ga naar **[my.homey.app/account](https://my.homey.app/account)**
2. Scroll naar **Personal Access Tokens**
3. Klik op **Create new token**
4. Geef het een naam (bijv. `MCP Server`)
5. Selecteer **alle scopes** (of minimaal: devices, zones, flows, logic, insights, notifications, apps, users)
6. Klik op **Create** en **kopieer de token** (je ziet hem maar één keer!)

---

### Stap 3 — App configureren

1. Open de Homey app → **Meer → Apps → Homey MCP Server → Configureren**
2. Vul het **IP-adres** van je Homey in (eenmalig)
3. Plak je **Personal Access Token** (alleen nodig voor flow-schrijfoperaties)
4. Klik op **Token opslaan**, herstart daarna de app voor volledige activatie

De status verandert naar **Actief** en je ziet de MCP URL:
```
http://192.168.x.x:52199/mcp
```

---

### Stap 4 — Verbinden met je AI-agent

#### Claude Desktop

Voeg toe aan `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "homey": {
      "type": "http",
      "url": "http://192.168.x.x:52199/mcp"
    }
  }
}
```

Herstart Claude Desktop. Je ziet nu een 🔧 icoon — dat zijn de Homey tools!

#### Claude Code (terminal)

```bash
claude mcp add homey --transport http "http://192.168.x.x:52199/mcp"
```

#### Cursor / Windsurf

Voeg toe aan MCP settings:
```json
{
  "homey": {
    "url": "http://192.168.x.x:52199/mcp"
  }
}
```

---

## Beschikbare Tools (81)

### 🏠 Zones (5 tools)
| Tool | Omschrijving |
|------|-------------|
| `zones_list` | Alle zones met hiërarchie en apparaatcount |
| `zones_get` | Details van één zone |
| `zones_create` | Nieuwe zone/kamer aanmaken |
| `zones_update` | Zone hernoemen of icoon wijzigen |
| `zones_delete` | Zone verwijderen |

### 📱 Apparaten (10 tools)
| Tool | Omschrijving |
|------|-------------|
| `devices_list` | Alle apparaten (filter op zone, klasse, capability) |
| `devices_get` | Volledige details + alle capability-waarden |
| `devices_get_state` | Huidige staat van één apparaat |
| `devices_get_all_states` | Staat van alle apparaten, gegroepeerd per zone |
| `devices_set_capability` | **Universeel:** stel élke capability in op élk apparaat |
| `devices_get_capability` | Huidige waarde van één capability |
| `devices_rename` | Apparaat hernoemen |
| `devices_move_to_zone` | Apparaat naar andere kamer verplaatsen |
| `devices_zone_set_capability` | Alle apparaten in een zone tegelijk bedienen |
| `devices_delete` | Apparaat verwijderen |

### ⚡ Flows (9 tools)
| Tool | Omschrijving |
|------|-------------|
| `flows_list` | Alle basis-flows (naam, actief, broken) |
| `flows_get` | Flow details: when/and/then kaarten |
| `flows_trigger` | Flow starten op naam of ID |
| `flows_create` | Nieuwe flow aanmaken |
| `flows_update` | Flow aanpassen (naam, kaarten, inschakelen) |
| `flows_enable` | Flow in-/uitschakelen |
| `flows_rename` | Flow hernoemen |
| `flows_delete` | Flow verwijderen |
| `flows_list_tokens` | Alle beschikbare flow tokens/tags |

### 🔀 Advanced Flows (5 tools)
| Tool | Omschrijving |
|------|-------------|
| `advanced_flows_list` | Alle Advanced Flows |
| `advanced_flows_get` | Volledige node-structuur |
| `advanced_flows_trigger` | Advanced Flow starten |
| `advanced_flows_enable` | In-/uitschakelen |
| `advanced_flows_delete` | Verwijderen |

### 🃏 Flow Cards (5 tools)
| Tool | Omschrijving |
|------|-------------|
| `flowcards_list_actions` | Alle beschikbare actie-kaarten van alle apps |
| `flowcards_list_conditions` | Alle beschikbare conditie-kaarten |
| `flowcards_list_triggers` | Alle beschikbare trigger-kaarten |
| `flowcards_run_action` | Actie-kaart direct uitvoeren |
| `flowcards_test_condition` | Conditie-kaart testen (geeft true/false) |

### 📁 Flow Mappen (4 tools)
| Tool | Omschrijving |
|------|-------------|
| `flow_folders_list` | Alle flow-mappen |
| `flow_folders_create` | Nieuwe map aanmaken |
| `flow_folders_rename` | Map hernoemen |
| `flow_folders_delete` | Map verwijderen |

### 🔢 Logica-variabelen (5 tools)
| Tool | Omschrijving |
|------|-------------|
| `logic_list` | Alle variabelen (boolean, number, string) |
| `logic_get` | Waarde van één variabele |
| `logic_set` | Variabele-waarde instellen |
| `logic_create` | Nieuwe variabele aanmaken |
| `logic_delete` | Variabele verwijderen |

### 📊 Insights (2 tools)
| Tool | Omschrijving |
|------|-------------|
| `insights_list` | Alle beschikbare logs van alle apps en apparaten |
| `insights_get_entries` | Historische data opvragen (tijdsbereik of preset) |

### 🔔 Notificaties (3 tools)
| Tool | Omschrijving |
|------|-------------|
| `notifications_send` | Notificatie sturen naar Homey-app |
| `notifications_list` | Recente notificaties ophalen |
| `notifications_delete` | Notificatie verwijderen |

### 📦 Apps (9 tools)
| Tool | Omschrijving |
|------|-------------|
| `apps_list` | Alle geïnstalleerde apps (versie, status) |
| `apps_get` | Details van één app |
| `apps_enable` | App inschakelen |
| `apps_disable` | App uitschakelen |
| `apps_restart` | App herstarten |
| `apps_update` | App updaten naar nieuwste versie |
| `apps_get_settings` | Alle instellingen van een app lezen |
| `apps_set_setting` | Instelling van een app wijzigen |
| `apps_uninstall` | App verwijderen |

### 👥 Gebruikers & Aanwezigheid (6 tools)
| Tool | Omschrijving |
|------|-------------|
| `users_list` | Alle gebruikers |
| `users_get_presence` | Wie is er thuis? |
| `geolocation_get` | Thuislocatie van de Homey |
| `presence_get_all` | Aanwezigheid + slaapstatus van alle gebruikers |
| `presence_set` | Thuis/weg instellen voor een gebruiker |
| `presence_set_asleep` | Slaapstatus instellen |

### ⏰ Wekkers (5 tools)
| Tool | Omschrijving |
|------|-------------|
| `alarms_list` | Alle wekkers |
| `alarms_get` | Details van één wekker |
| `alarms_create` | Nieuwe wekker aanmaken |
| `alarms_update` | Wekker aanpassen (tijd, dagen, naam) |
| `alarms_delete` | Wekker verwijderen |

### ⚡ Energie (3 tools)
| Tool | Omschrijving |
|------|-------------|
| `energy_get_live` | Live energie-rapport (verbruik, solar) |
| `energy_get_cost_settings` | kWh-prijs en valuta |
| `energy_set_kwh_cost` | kWh-prijs instellen |

### 🔊 Audio (2 tools)
| Tool | Omschrijving |
|------|-------------|
| `audio_get_volume` | Huidig systeemvolume |
| `audio_set_volume` | Systeemvolume instellen (0–100) |

### ⚙️ Systeem (6 tools)
| Tool | Omschrijving |
|------|-------------|
| `system_get_info` | Versie, platform, uptime, netwerk |
| `system_get_memory` | RAM-gebruik |
| `system_get_storage` | Schijfruimte |
| `system_rename` | Homey hernoemen |
| `system_reboot` | Homey herstarten (confirm vereist) |
| `system_get_energy` | Energie-overzicht |

### 🎤 Spraak & LED (2 tools)
| Tool | Omschrijving |
|------|-------------|
| `speech_say` | Homey laten spreken (TTS, meerdere talen) |
| `ledring_animate` | LED-ring animeren (loading, pulse, solid, off) |

---

## Voorbeelden

### Apparaten bedienen

> *"Zet alle lampen in de woonkamer uit"*

De AI roept `devices_zone_set_capability` aan:
```json
{
  "zone_id": "...",
  "capability": "onoff",
  "value": false,
  "class": "light"
}
```

### Flow aanmaken

> *"Maak een flow die elke dag om 7:30 het licht in de keuken aanzet"*

De AI roept `flows_create` aan met de juiste trigger- en actie-kaarten.

### Historische data analyseren

> *"Hoeveel energie heb ik vorige maand verbruikt?"*

De AI roept `insights_get_entries` aan met `resolution: "last31Days"`.

### Logica-variabele instellen

> *"Zet de variabele 'Vakantie' op true"*

De AI roept `logic_set` aan met `variable_name: "Vakantie"` en `value: true`.

---

## Probleemoplossing

### Settings pagina laadt niet
- Herstart de app via **Instellingen → Homey MCP Server → ⟳**
- Controleer of de app actief is in Meer → Apps

### "Token validation failed"
- Controleer of je PAT correct is gekopieerd
- Zorg dat de PAT niet verlopen is (my.homey.app/account)
- Controleer of alle benodigde scopes geselecteerd zijn

### AI-agent kan niet verbinden
- Controleer of je het juiste IP-adres gebruikt (zie settings pagina)
- Zorg dat poort 52199 niet geblokkeerd wordt door je firewall
- Test de verbinding: open `http://[homey-ip]:52199/health` in je browser

### "Port already in use"
- Wijzig de poort in de app-instellingen (bijv. 52200)
- Herstart de app

---

## Technische Details

- **Protocol:** MCP 2025-03-26 (StreamableHTTP, JSON-RPC 2.0)
- **Transport:** HTTP POST + SSE voor streaming
- **Auth:** Geen (vertrouwt op lokaal netwerk) — gebruik een firewall voor publieke netwerken
- **Node.js:** ≥ 18 vereist
- **Homey SDK:** v3

### Health check
```bash
curl http://[homey-ip]:52199/health
# {"status":"ok","version":"1.0.0","tools":81}
```

### Beschikbare endpoints
| Endpoint | Methode | Omschrijving |
|----------|---------|-------------|
| `/mcp` | POST | MCP JSON-RPC requests |
| `/mcp` | GET | SSE stream voor server-push |
| `/mcp` | DELETE | Sessie sluiten |
| `/health` | GET | Health check |
| `/info` | GET | Server info + tool lijst |

---

## Bijdragen

Pull requests zijn welkom!

**Nieuwe tool toevoegen:**
1. Maak een functie in het juiste bestand in `lib/tools/`
2. Roep `server.registerTool(name, description, inputSchema, handler)` aan
3. Voeg de import toe in `lib/tools/index.js`
4. Test met `homey app install` op je eigen Homey Pro

**Development setup:**
```bash
git clone https://github.com/weide43/homey-mcp-server
cd homey-mcp-server
npm install
# Maak een lokale settings preview stub aan (niet inchecken):
cp settings/homey.example.js settings/homey.js
# Pas settings/homey.js aan met jouw lokale IP
homey app install
```

---

## Licentie

MIT — vrij te gebruiken, aanpassen en distribueren.

---

*Gebouwd door de Homey community • Niet officieel gelieerd aan Athom of Anthropic*
