'use strict';

/**
 * Zone tools - Full CRUD for Homey zones (rooms/areas)
 */
module.exports = function registerZoneTools(server, client) {

  server.registerTool(
    'zones_list',
    'List all zones (rooms/areas) on Homey with their hierarchy (parent/child relationships).',
    {
      type: 'object',
      properties: {
        include_devices: { type: 'boolean', description: 'Include device count per zone (default: false)' },
      },
    },
    async ({ include_devices }) => {
      const zonesRaw = await client.getZones();
      const zones = Object.values(zonesRaw);

      let devicesByZone = {};
      if (include_devices) {
        const devicesRaw = await client.getDevices();
        for (const d of Object.values(devicesRaw)) {
          if (!devicesByZone[d.zone]) devicesByZone[d.zone] = 0;
          devicesByZone[d.zone]++;
        }
      }

      // Build hierarchy
      const rootZones = zones.filter(z => !z.parent);
      const childZones = zones.filter(z => z.parent);

      const buildTree = (zone) => {
        const children = childZones.filter(c => c.parent === zone.id);
        const result = {
          id:       zone.id,
          name:     zone.name,
          icon:     zone.icon,
          parent:   zone.parent || null,
          children: children.map(buildTree),
        };
        if (include_devices) result.deviceCount = devicesByZone[zone.id] || 0;
        return result;
      };

      return rootZones.map(buildTree);
    },
  );

  server.registerTool(
    'zones_get',
    'Get details of a specific zone.',
    {
      type: 'object',
      properties: {
        zone_id: { type: 'string', description: 'The zone ID' },
      },
      required: ['zone_id'],
    },
    async ({ zone_id }) => {
      return client.getZone(zone_id);
    },
  );

  server.registerTool(
    'zones_create',
    'Create a new zone (room/area) on Homey.',
    {
      type: 'object',
      properties: {
        name:      { type: 'string', description: 'Name of the new zone (e.g. "Garden", "Attic")' },
        parent_id: { type: 'string', description: 'Optional parent zone ID to nest this zone inside another' },
        icon:      { type: 'string', description: 'Optional icon name (e.g. "livingRoom", "bedroom", "kitchen", "bathroom", "garage", "office", "garden")' },
      },
      required: ['name'],
    },
    async ({ name, parent_id, icon }) => {
      const body = { name };
      if (parent_id) body.parent = parent_id;
      if (icon)      body.icon = icon;
      return client.createZone(body);
    },
  );

  server.registerTool(
    'zones_update',
    'Update a zone - rename it, change its icon, or move it to another parent zone.',
    {
      type: 'object',
      properties: {
        zone_id:   { type: 'string', description: 'The zone ID to update' },
        name:      { type: 'string', description: 'New name for the zone' },
        icon:      { type: 'string', description: 'New icon for the zone' },
        parent_id: { type: 'string', description: 'New parent zone ID (move zone)' },
      },
      required: ['zone_id'],
    },
    async ({ zone_id, name, icon, parent_id }) => {
      const body = {};
      if (name)      body.name = name;
      if (icon)      body.icon = icon;
      if (parent_id) body.parent = parent_id;
      await client.updateZone(zone_id, body);
      return { success: true, zone_id, updated: body };
    },
  );

  server.registerTool(
    'zones_delete',
    'Delete a zone. Devices in the zone will become unassigned. Child zones will also need to be reassigned.',
    {
      type: 'object',
      properties: {
        zone_id: { type: 'string', description: 'The zone ID to delete' },
      },
      required: ['zone_id'],
    },
    async ({ zone_id }) => {
      await client.deleteZone(zone_id);
      return { success: true, zone_id, message: 'Zone deleted' };
    },
  );

};
