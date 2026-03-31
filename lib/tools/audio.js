'use strict';

/**
 * Audio tools - Homey system volume control
 */
module.exports = function registerAudioTools(server, client) {

  server.registerTool(
    'audio_get_volume',
    'Get the current Homey system volume (for speech and sounds).',
    { type: 'object', properties: {} },
    async () => {
      const volume = await client.getAudioVolume();
      return { volume };
    },
  );

  server.registerTool(
    'audio_set_volume',
    'Set the Homey system volume (0–100) for speech and notification sounds.',
    {
      type: 'object',
      properties: {
        volume: {
          type: 'number',
          minimum: 0,
          maximum: 100,
          description: 'Volume level 0–100',
        },
      },
      required: ['volume'],
    },
    async ({ volume }) => {
      await client.setAudioVolume({ value: volume });
      return { success: true, volume };
    },
  );

};
