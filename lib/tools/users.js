'use strict';

/**
 * User & presence tools
 */
module.exports = function registerUserTools(server, client) {

  server.registerTool(
    'users_list',
    'List all users registered on this Homey and their current presence status.',
    { type: 'object', properties: {} },
    async () => {
      const raw = await client.getUsers();
      return Object.values(raw).map(u => ({
        id:       u.id,
        name:     u.name,
        present:  u.present,
        role:     u.role,
        avatar:   u.avatar,
        lastSeen: u.lastSeen,
      }));
    },
  );

  server.registerTool(
    'users_get_presence',
    'Get who is currently home. Returns a simple list of present/absent users.',
    { type: 'object', properties: {} },
    async () => {
      const raw = await client.getUsers();
      const users = Object.values(raw);
      return {
        home:   users.filter(u => u.present).map(u => u.name),
        away:   users.filter(u => !u.present).map(u => u.name),
        anyoneHome: users.some(u => u.present),
      };
    },
  );

  server.registerTool(
    'geolocation_get',
    'Get the home location (latitude/longitude) configured on Homey.',
    { type: 'object', properties: {} },
    async () => {
      return client.getGeolocation();
    },
  );

};
