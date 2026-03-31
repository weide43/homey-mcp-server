'use strict';

/**
 * HomeyClient - Universal Homey Web API client
 * Supports both local (Homey Pro) and cloud (Homey Cloud) connections
 * Uses the Homey Web API v2 with Personal Access Token authentication
 */
class HomeyClient {

  constructor({ token, localAddress, cloudId, useCloud = false }) {
    this.token = token;
    this.localAddress = localAddress;   // e.g. "192.168.1.10"
    this.cloudId = cloudId;             // Homey Cloud ID (for cloud access)
    this.useCloud = useCloud;
  }

  /**
   * Base URL for API calls
   */
  get baseUrl() {
    if (this.useCloud && this.cloudId) {
      return `https://api.homey.app/v1/homey/${this.cloudId}`;
    }
    const addr = this.localAddress || '127.0.0.1';
    return `http://${addr}`;
  }

  /**
   * Make an authenticated API request to Homey
   */
  async request(method, path, body = null) {
    const url = `${this.baseUrl}${path}`;
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    if (body !== null && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    let res;
    try {
      res = await fetch(url, options);
    } catch (err) {
      throw new Error(`Network error connecting to Homey at ${url}: ${err.message}`);
    }

    const text = await res.text();

    if (!res.ok) {
      let msg = text;
      try {
        const json = JSON.parse(text);
        msg = json.error || json.message || text;
      } catch (_) {}
      throw new Error(`Homey API error ${res.status}: ${msg}`);
    }

    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch (_) {
      return text;
    }
  }

  // ─── Shorthand methods ────────────────────────────────────────────

  get(path) { return this.request('GET', path); }
  post(path, body) { return this.request('POST', path, body); }
  put(path, body) { return this.request('PUT', path, body); }
  patch(path, body) { return this.request('PATCH', path, body); }
  delete(path) { return this.request('DELETE', path); }

  // ─── Manager helpers ──────────────────────────────────────────────

  manager(name) { return `/api/manager/${name}`; }

  // ─── Devices ─────────────────────────────────────────────────────

  getDevices()                         { return this.get('/api/manager/devices/device'); }
  getDevice(id)                        { return this.get(`/api/manager/devices/device/${id}`); }
  updateDevice(id, body)               { return this.put(`/api/manager/devices/device/${id}`, body); }
  deleteDevice(id)                     { return this.delete(`/api/manager/devices/device/${id}`); }
  getCapability(id, cap)               { return this.get(`/api/manager/devices/device/${id}/capability/${cap}`); }
  setCapability(id, cap, value)        { return this.put(`/api/manager/devices/device/${id}/capability/${cap}`, { value }); }

  // ─── Zones ───────────────────────────────────────────────────────

  getZones()                           { return this.get('/api/manager/zones/zone'); }
  getZone(id)                          { return this.get(`/api/manager/zones/zone/${id}`); }
  createZone(body)                     { return this.post('/api/manager/zones/zone', body); }
  updateZone(id, body)                 { return this.put(`/api/manager/zones/zone/${id}`, body); }
  deleteZone(id)                       { return this.delete(`/api/manager/zones/zone/${id}`); }

  // ─── Flows ───────────────────────────────────────────────────────

  getFlows()                           { return this.get('/api/manager/flow/flow'); }
  getFlow(id)                          { return this.get(`/api/manager/flow/flow/${id}`); }
  createFlow(body)                     { return this.post('/api/manager/flow/flow', body); }
  updateFlow(id, body)                 { return this.put(`/api/manager/flow/flow/${id}`, body); }
  deleteFlow(id)                       { return this.delete(`/api/manager/flow/flow/${id}`); }
  triggerFlow(id, tokens)              { return this.post(`/api/manager/flow/flow/${id}/trigger`, { tokens: tokens || {} }); }

  // ─── Advanced Flows ──────────────────────────────────────────────

  getAdvancedFlows()                   { return this.get('/api/manager/flow/advancedflow'); }
  getAdvancedFlow(id)                  { return this.get(`/api/manager/flow/advancedflow/${id}`); }
  createAdvancedFlow(body)             { return this.post('/api/manager/flow/advancedflow', body); }
  updateAdvancedFlow(id, body)         { return this.put(`/api/manager/flow/advancedflow/${id}`, body); }
  deleteAdvancedFlow(id)               { return this.delete(`/api/manager/flow/advancedflow/${id}`); }
  triggerAdvancedFlow(id, tokens)      { return this.post(`/api/manager/flow/advancedflow/${id}/trigger`, { tokens: tokens || {} }); }

  // ─── Flow Tokens ─────────────────────────────────────────────────

  getFlowTokens()                      { return this.get('/api/manager/flow/flowtoken'); }

  // ─── Logic (Variables) ───────────────────────────────────────────

  getVariables()                       { return this.get('/api/manager/logic/variable'); }
  getVariable(id)                      { return this.get(`/api/manager/logic/variable/${id}`); }
  createVariable(body)                 { return this.post('/api/manager/logic/variable', body); }
  updateVariable(id, body)             { return this.put(`/api/manager/logic/variable/${id}`, body); }
  deleteVariable(id)                   { return this.delete(`/api/manager/logic/variable/${id}`); }

  // ─── Insights ────────────────────────────────────────────────────

  getInsightLogs()                     { return this.get('/api/manager/insights/log'); }
  getInsightLog(uri, id)               { return this.get(`/api/manager/insights/log/${encodeURIComponent(uri)}/${id}`); }
  getInsightEntries(uri, id, opts)     {
    const params = new URLSearchParams();
    if (opts?.from)        params.set('start', opts.from);
    if (opts?.to)          params.set('end', opts.to);
    if (opts?.resolution)  params.set('resolution', opts.resolution);
    const qs = params.toString() ? `?${params}` : '';
    return this.get(`/api/manager/insights/log/${encodeURIComponent(uri)}/${id}/entry${qs}`);
  }

  // ─── Notifications ───────────────────────────────────────────────

  getNotifications()                   { return this.get('/api/manager/notifications/notification'); }
  createNotification(body)             { return this.post('/api/manager/notifications/notification', body); }
  deleteNotification(id)               { return this.delete(`/api/manager/notifications/notification/${id}`); }

  // ─── Apps ────────────────────────────────────────────────────────

  getApps()                            { return this.get('/api/manager/apps/app'); }
  getApp(id)                           { return this.get(`/api/manager/apps/app/${id}`); }
  enableApp(id)                        { return this.post(`/api/manager/apps/app/${id}/enable`, {}); }
  disableApp(id)                       { return this.post(`/api/manager/apps/app/${id}/disable`, {}); }
  restartApp(id)                       { return this.post(`/api/manager/apps/app/${id}/restart`, {}); }
  updateApp(id)                        { return this.post(`/api/manager/apps/app/${id}/update`, {}); }
  installApp(id)                       { return this.post('/api/manager/apps/app', { id }); }
  uninstallApp(id)                     { return this.delete(`/api/manager/apps/app/${id}`); }

  // ─── Users ───────────────────────────────────────────────────────

  getUsers()                           { return this.get('/api/manager/users/user'); }
  getUser(id)                          { return this.get(`/api/manager/users/user/${id}`); }

  // ─── Geolocation ─────────────────────────────────────────────────

  getGeolocation()                     { return this.get('/api/manager/geolocation/'); }

  // ─── Alarms ──────────────────────────────────────────────────────

  getAlarms()                          { return this.get('/api/manager/alarms/alarm'); }
  getAlarm(id)                         { return this.get(`/api/manager/alarms/alarm/${id}`); }
  createAlarm(body)                    { return this.post('/api/manager/alarms/alarm', body); }
  updateAlarm(id, body)                { return this.put(`/api/manager/alarms/alarm/${id}`, body); }
  deleteAlarm(id)                      { return this.delete(`/api/manager/alarms/alarm/${id}`); }

  // ─── Presence ────────────────────────────────────────────────────

  getPresence()                        { return this.get('/api/manager/presence/'); }
  setPresence(userId, body)            { return this.put(`/api/manager/presence/user/${userId}`, body); }
  setPresenceMe(body)                  { return this.put('/api/manager/presence/user/me', body); }
  setAsleep(userId, body)              { return this.put(`/api/manager/presence/user/${userId}/asleep`, body); }
  setAsleepMe(body)                    { return this.put('/api/manager/presence/user/me/asleep', body); }

  // ─── System ──────────────────────────────────────────────────────

  getSystemInfo()                      { return this.get('/api/manager/system/info'); }
  getSystemMemory()                    { return this.get('/api/manager/system/memory'); }
  getSystemStorage()                   { return this.get('/api/manager/system/storage'); }
  setSystemName(name)                  { return this.put('/api/manager/system/name', { name }); }
  rebootSystem()                       { return this.post('/api/manager/system/reboot', {}); }

  // ─── Energy ──────────────────────────────────────────────────────

  getEnergyOverview()                  { return this.get('/api/manager/energy/'); }
  getEnergyLiveReport()                { return this.get('/api/manager/energy/live'); }
  getEnergyCurrency()                  { return this.get('/api/manager/energy/option/currency'); }
  setEnergyCurrency(body)              { return this.put('/api/manager/energy/option/currency', body); }
  getEnergyKWhCost()                   { return this.get('/api/manager/energy/option/cost'); }
  setEnergyKWhCost(body)               { return this.put('/api/manager/energy/option/cost', body); }

  // ─── Audio ───────────────────────────────────────────────────────

  getAudioVolume()                     { return this.get('/api/manager/audio/option/volume'); }
  setAudioVolume(body)                 { return this.put('/api/manager/audio/option/volume', body); }

  // ─── Flow cards & folders ─────────────────────────────────────────

  getFlowCardActions()                 { return this.get('/api/manager/flow/flowcardaction'); }
  getFlowCardConditions()              { return this.get('/api/manager/flow/flowcardcondition'); }
  getFlowCardTriggers()                { return this.get('/api/manager/flow/flowcardtrigger'); }
  runFlowCardAction(body)              { return this.post('/api/manager/flow/flowcardaction/run', body); }
  runFlowCardCondition(body)           { return this.post('/api/manager/flow/flowcardcondition/run', body); }
  getFlowFolders()                     { return this.get('/api/manager/flow/flowfolder'); }
  createFlowFolder(body)               { return this.post('/api/manager/flow/flowfolder', body); }
  updateFlowFolder(id, body)           { return this.put(`/api/manager/flow/flowfolder/${id}`, body); }
  deleteFlowFolder(id)                 { return this.delete(`/api/manager/flow/flowfolder/${id}`); }

  // ─── Advanced Flows ───────────────────────────────────────────────

  getAdvancedFlows()                   { return this.get('/api/manager/flow/advancedflow'); }
  getAdvancedFlow(id)                  { return this.get(`/api/manager/flow/advancedflow/${id}`); }
  createAdvancedFlow(body)             { return this.post('/api/manager/flow/advancedflow', body); }
  updateAdvancedFlow(id, body)         { return this.put(`/api/manager/flow/advancedflow/${id}`, body); }
  deleteAdvancedFlow(id)               { return this.delete(`/api/manager/flow/advancedflow/${id}`); }

  // ─── Basic Flows ──────────────────────────────────────────────────

  createFlow(body)                     { return this.post('/api/manager/flow/flow', body); }
  updateFlow(id, body)                 { return this.put(`/api/manager/flow/flow/${id}`, body); }
  deleteFlow(id)                       { return this.delete(`/api/manager/flow/flow/${id}`); }

  // ─── App settings ─────────────────────────────────────────────────

  getAppSettings(appId)                { return this.get(`/api/manager/apps/app/${appId}/settings`); }
  getAppSetting(appId, key)            { return this.get(`/api/manager/apps/app/${appId}/settings/${key}`); }
  setAppSetting(appId, key, value)     { return this.put(`/api/manager/apps/app/${appId}/settings/${key}`, { value }); }
  unsetAppSetting(appId, key)          { return this.delete(`/api/manager/apps/app/${appId}/settings/${key}`); }

}

module.exports = HomeyClient;
