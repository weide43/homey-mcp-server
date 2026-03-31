'use strict';

/**
 * Presence tools - Presence detection and sleep state management
 */
module.exports = function registerPresenceTools(server, client) {

  server.registerTool(
    'presence_get_all',
    'Get the current presence status (home/away and asleep/awake) for all users.',
    { type: 'object', properties: {} },
    async () => {
      const [users, presence] = await Promise.all([
        client.getUsers().catch(() => ({})),
        client.getPresence().catch(() => ({})),
      ]);

      const userList = Object.values(users);
      const presenceData = Object.values(presence);

      return {
        users: userList.map(u => ({
          id:      u.id,
          name:    u.name,
          present: u.present,
          asleep:  u.asleep,
        })),
        summary: {
          home:   userList.filter(u => u.present).map(u => u.name),
          away:   userList.filter(u => !u.present).map(u => u.name),
          asleep: userList.filter(u => u.asleep).map(u => u.name),
          anyoneHome: userList.some(u => u.present),
          everyoneAsleep: userList.length > 0 && userList.every(u => u.asleep),
        },
      };
    },
  );

  server.registerTool(
    'presence_set',
    'Set the presence status (home or away) for a user.',
    {
      type: 'object',
      properties: {
        user_id: { type: 'string',  description: 'User ID. Use "me" for the current user.' },
        present: { type: 'boolean', description: 'true = home, false = away' },
      },
      required: ['user_id', 'present'],
    },
    async ({ user_id, present }) => {
      if (user_id === 'me') {
        await client.setPresenceMe({ present });
      } else {
        await client.setPresence(user_id, { present });
      }
      return { success: true, user_id, present };
    },
  );

  server.registerTool(
    'presence_set_asleep',
    'Set the sleep status for a user (asleep or awake).',
    {
      type: 'object',
      properties: {
        user_id: { type: 'string',  description: 'User ID. Use "me" for the current user.' },
        asleep:  { type: 'boolean', description: 'true = asleep, false = awake' },
      },
      required: ['user_id', 'asleep'],
    },
    async ({ user_id, asleep }) => {
      if (user_id === 'me') {
        await client.setAsleepMe({ asleep });
      } else {
        await client.setAsleep(user_id, { asleep });
      }
      return { success: true, user_id, asleep };
    },
  );

};
