'use strict';

/**
 * Insights tools - Read historical data from Homey Insights
 */
module.exports = function registerInsightsTools(server, client) {

  server.registerTool(
    'insights_list',
    'List all available insight logs from all apps and devices on Homey.',
    {
      type: 'object',
      properties: {
        search:   { type: 'string', description: 'Filter logs by title/name' },
        uri:      { type: 'string', description: 'Filter by app URI (e.g. homey:device:[id])' },
        type:     { type: 'string', enum: ['number', 'boolean'], description: 'Filter by data type' },
      },
    },
    async ({ search, uri, type }) => {
      const raw = await client.getInsightLogs();
      let logs = Object.values(raw);

      if (uri)    logs = logs.filter(l => l.uri?.includes(uri));
      if (type)   logs = logs.filter(l => l.type === type);
      if (search) {
        const q = search.toLowerCase();
        logs = logs.filter(l =>
          l.title?.toLowerCase().includes(q) || l.id?.toLowerCase().includes(q),
        );
      }

      return logs.map(l => ({
        id:       l.id,
        uri:      l.uri,
        title:    l.title,
        type:     l.type,
        units:    l.units,
        decimals: l.decimals,
      }));
    },
  );

  server.registerTool(
    'insights_get_entries',
    `Get historical data entries from an insight log.
Resolution options: "lastHour", "last6Hours", "last24Hours", "last7Days", "last14Days", "last31Days", "last3Months", "last6Months", "lastYear", "last2Years"
Or provide custom from/to as ISO 8601 timestamps.`,
    {
      type: 'object',
      properties: {
        uri:        { type: 'string', description: 'Log URI (from insights_list)' },
        log_id:     { type: 'string', description: 'Log ID (from insights_list)' },
        resolution: { type: 'string', description: 'Time range preset (e.g. "last24Hours", "last7Days")' },
        from:       { type: 'string', description: 'Start time (ISO 8601, alternative to resolution)' },
        to:         { type: 'string', description: 'End time (ISO 8601, alternative to resolution)' },
      },
      required: ['uri', 'log_id'],
    },
    async ({ uri, log_id, resolution, from, to }) => {
      const opts = {};
      if (resolution) opts.resolution = resolution;
      if (from) opts.from = from;
      if (to)   opts.to = to;

      const entries = await client.getInsightEntries(uri, log_id, opts);
      return {
        uri,
        log_id,
        resolution: resolution || 'custom',
        entries: Array.isArray(entries) ? entries : (entries?.data || entries),
      };
    },
  );

};
