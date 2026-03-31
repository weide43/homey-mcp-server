'use strict';

/**
 * App management tools - List, enable, disable, restart, install apps
 */
module.exports = function registerAppTools(server, client) {

  server.registerTool(
    'apps_list',
    'List all installed apps on Homey with their version, status, and permissions.',
    {
      type: 'object',
      properties: {
        enabled_only: { type: 'boolean', description: 'Only return enabled/running apps' },
        search:       { type: 'string',  description: 'Search apps by name or ID' },
      },
    },
    async ({ enabled_only, search }) => {
      const raw = await client.getApps();
      let apps = Object.values(raw);

      if (enabled_only) apps = apps.filter(a => a.enabled);
      if (search) {
        const q = search.toLowerCase();
        apps = apps.filter(a =>
          a.name?.toLowerCase().includes(q) || a.id?.toLowerCase().includes(q),
        );
      }

      return apps.map(a => ({
        id:          a.id,
        name:        a.name,
        version:     a.version,
        enabled:     a.enabled,
        ready:       a.ready,
        crashed:     a.crashed,
        permissions: a.permissions,
        author:      a.author,
        homeyVersion: a.compatibility,
      }));
    },
  );

  server.registerTool(
    'apps_get',
    'Get detailed information about a specific app.',
    {
      type: 'object',
      properties: {
        app_id: { type: 'string', description: 'The app ID (e.g. com.athom.homeyscript)' },
      },
      required: ['app_id'],
    },
    async ({ app_id }) => {
      return client.getApp(app_id);
    },
  );

  server.registerTool(
    'apps_enable',
    'Enable an app on Homey.',
    {
      type: 'object',
      properties: {
        app_id: { type: 'string', description: 'The app ID to enable' },
      },
      required: ['app_id'],
    },
    async ({ app_id }) => {
      await client.enableApp(app_id);
      return { success: true, app_id, message: 'App enabled' };
    },
  );

  server.registerTool(
    'apps_disable',
    'Disable an app on Homey.',
    {
      type: 'object',
      properties: {
        app_id: { type: 'string', description: 'The app ID to disable' },
      },
      required: ['app_id'],
    },
    async ({ app_id }) => {
      await client.disableApp(app_id);
      return { success: true, app_id, message: 'App disabled' };
    },
  );

  server.registerTool(
    'apps_restart',
    'Restart an app on Homey. Useful when an app is misbehaving.',
    {
      type: 'object',
      properties: {
        app_id: { type: 'string', description: 'The app ID to restart' },
      },
      required: ['app_id'],
    },
    async ({ app_id }) => {
      await client.restartApp(app_id);
      return { success: true, app_id, message: 'App restarted' };
    },
  );

  server.registerTool(
    'apps_update',
    'Update an app to its latest version from the App Store.',
    {
      type: 'object',
      properties: {
        app_id: { type: 'string', description: 'The app ID to update' },
      },
      required: ['app_id'],
    },
    async ({ app_id }) => {
      await client.updateApp(app_id);
      return { success: true, app_id, message: 'App update triggered' };
    },
  );

  server.registerTool(
    'apps_get_settings',
    'Get all settings (key-value pairs) of a specific installed app.',
    {
      type: 'object',
      properties: {
        app_id: { type: 'string', description: 'The app ID' },
      },
      required: ['app_id'],
    },
    async ({ app_id }) => {
      return client.getAppSettings(app_id);
    },
  );

  server.registerTool(
    'apps_set_setting',
    'Set a setting value for a specific installed app.',
    {
      type: 'object',
      properties: {
        app_id: { type: 'string', description: 'The app ID' },
        key:    { type: 'string', description: 'Setting key' },
        value:  { description: 'Setting value (any type)' },
      },
      required: ['app_id', 'key', 'value'],
    },
    async ({ app_id, key, value }) => {
      await client.setAppSetting(app_id, key, value);
      return { success: true, app_id, key, value };
    },
  );

  server.registerTool(
    'apps_uninstall',
    'Uninstall an app from Homey.',
    {
      type: 'object',
      properties: {
        app_id: { type: 'string', description: 'The app ID to uninstall' },
      },
      required: ['app_id'],
    },
    async ({ app_id }) => {
      await client.uninstallApp(app_id);
      return { success: true, app_id, message: 'App uninstalled' };
    },
  );

};
