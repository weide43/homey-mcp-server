'use strict';

const registerDeviceTools       = require('./devices');
const registerZoneTools         = require('./zones');
const registerFlowTools         = require('./flows');
const registerFlowCardTools     = require('./flowcards');
const registerLogicTools        = require('./logic');
const registerInsightsTools     = require('./insights');
const registerNotificationTools = require('./notifications');
const registerAppTools          = require('./apps');
const registerUserTools         = require('./users');
const registerPresenceTools     = require('./presence');
const registerAlarmTools        = require('./alarms');
const registerAudioTools        = require('./audio');
const registerEnergyTools       = require('./energy');
const registerSystemTools       = require('./system');

/**
 * Register ALL MCP tools on the server.
 *
 * Categories:
 *  - Devices      (10 tools) — CRUD + universal capability control
 *  - Zones        ( 5 tools) — CRUD rooms/areas
 *  - Flows        (14 tools) — basic + advanced flows CRUD + trigger
 *  - Flow Cards   ( 7 tools) — browse + run cards + folder management
 *  - Logic        ( 5 tools) — variables CRUD
 *  - Insights     ( 2 tools) — historical data
 *  - Notifications( 3 tools) — send + manage
 *  - Apps         ( 9 tools) — install/enable/disable/settings
 *  - Users        ( 3 tools) — list + presence
 *  - Presence     ( 3 tools) — home/away + sleep state
 *  - Alarms       ( 5 tools) — alarm clock CRUD
 *  - Audio        ( 2 tools) — volume get/set
 *  - Energy       ( 3 tools) — live + cost settings
 *  - System       ( 8 tools) — info + reboot + rename + memory + TTS + LED
 *
 * @param {McpServer} server
 * @param {HomeyClient} client
 * @param {object} homey  - Homey SDK instance (for native TTS/LED)
 */
function registerAllTools(server, client, homey) {
  registerDeviceTools(server, client);
  registerZoneTools(server, client);
  registerFlowTools(server, client);
  registerFlowCardTools(server, client);
  registerLogicTools(server, client);
  registerInsightsTools(server, client);
  registerNotificationTools(server, client);
  registerAppTools(server, client);
  registerUserTools(server, client);
  registerPresenceTools(server, client);
  registerAlarmTools(server, client);
  registerAudioTools(server, client);
  registerEnergyTools(server, client);
  registerSystemTools(server, client, homey);
}

module.exports = { registerAllTools };
