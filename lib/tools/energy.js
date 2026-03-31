'use strict';

/**
 * Energy tools - Live energy reports and cost configuration
 */
module.exports = function registerEnergyTools(server, client) {

  server.registerTool(
    'energy_get_live',
    'Get the current live energy report from Homey Energy — real-time power consumption and solar data.',
    { type: 'object', properties: {} },
    async () => {
      const report = await client.getEnergyLiveReport();
      return report;
    },
  );

  server.registerTool(
    'energy_get_cost_settings',
    'Get the energy cost settings configured on Homey (currency and kWh price).',
    { type: 'object', properties: {} },
    async () => {
      const [currency, cost] = await Promise.all([
        client.getEnergyCurrency().catch(() => null),
        client.getEnergyKWhCost().catch(() => null),
      ]);
      return { currency, kwhCost: cost };
    },
  );

  server.registerTool(
    'energy_set_kwh_cost',
    'Set the energy cost per kWh on Homey (used for energy cost calculations).',
    {
      type: 'object',
      properties: {
        cost:     { type: 'number', description: 'Cost per kWh (e.g. 0.28 for €0.28/kWh)' },
        currency: { type: 'string', description: 'Currency code (e.g. "EUR", "USD", "GBP")' },
      },
      required: ['cost'],
    },
    async ({ cost, currency }) => {
      await client.setEnergyKWhCost({ value: cost });
      if (currency) await client.setEnergyCurrency({ value: currency });
      return { success: true, cost, currency };
    },
  );

};
