'use strict';

/**
 * Flow card & folder tools
 * - Browse available trigger/condition/action cards from all installed apps
 * - Execute action cards and test condition cards directly
 * - Manage flow folders
 */
module.exports = function registerFlowCardTools(server, client) {

  // ─── Browse flow cards ────────────────────────────────────────────

  server.registerTool(
    'flowcards_list_actions',
    'List all available flow action cards from all installed apps. Useful for building flows.',
    {
      type: 'object',
      properties: {
        search:  { type: 'string', description: 'Search by title or app ID' },
        app_id:  { type: 'string', description: 'Filter by app ID (e.g. com.athom.homeyscript)' },
      },
    },
    async ({ search, app_id }) => {
      const raw = await client.getFlowCardActions();
      let cards = Object.values(raw);
      if (app_id) cards = cards.filter(c => c.ownerUri?.includes(app_id));
      if (search) {
        const q = search.toLowerCase();
        cards = cards.filter(c =>
          c.title?.toLowerCase().includes(q) || c.id?.toLowerCase().includes(q),
        );
      }
      return cards.map(c => ({
        id:       c.id,
        title:    c.title,
        ownerUri: c.ownerUri,
        args:     c.args,
      })).slice(0, 100); // limit to 100
    },
  );

  server.registerTool(
    'flowcards_list_conditions',
    'List all available flow condition cards from all installed apps.',
    {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Search by title or app ID' },
        app_id: { type: 'string', description: 'Filter by app ID' },
      },
    },
    async ({ search, app_id }) => {
      const raw = await client.getFlowCardConditions();
      let cards = Object.values(raw);
      if (app_id) cards = cards.filter(c => c.ownerUri?.includes(app_id));
      if (search) {
        const q = search.toLowerCase();
        cards = cards.filter(c =>
          c.title?.toLowerCase().includes(q) || c.id?.toLowerCase().includes(q),
        );
      }
      return cards.map(c => ({
        id:       c.id,
        title:    c.title,
        ownerUri: c.ownerUri,
        args:     c.args,
      })).slice(0, 100);
    },
  );

  server.registerTool(
    'flowcards_list_triggers',
    'List all available flow trigger cards from all installed apps.',
    {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Search by title or app ID' },
        app_id: { type: 'string', description: 'Filter by app ID' },
      },
    },
    async ({ search, app_id }) => {
      const raw = await client.getFlowCardTriggers();
      let cards = Object.values(raw);
      if (app_id) cards = cards.filter(c => c.ownerUri?.includes(app_id));
      if (search) {
        const q = search.toLowerCase();
        cards = cards.filter(c =>
          c.title?.toLowerCase().includes(q) || c.id?.toLowerCase().includes(q),
        );
      }
      return cards.map(c => ({
        id:       c.id,
        title:    c.title,
        ownerUri: c.ownerUri,
        args:     c.args,
      })).slice(0, 100);
    },
  );

  // ─── Execute cards directly ───────────────────────────────────────

  server.registerTool(
    'flowcards_run_action',
    `Run a flow action card directly without needing a full flow.
Useful for quickly executing actions like "send a notification", "set a variable", "say something".
Example: Run HomeyScript with uri="homey:app:com.athom.homeyscript", id="run", args={"script":"..."}`,
    {
      type: 'object',
      properties: {
        uri:  { type: 'string', description: 'Card owner URI (e.g. "homey:app:com.athom.homeyscript")' },
        id:   { type: 'string', description: 'Card ID' },
        args: { type: 'object', description: 'Card arguments (depends on the card)' },
      },
      required: ['uri', 'id'],
    },
    async ({ uri, id, args = {} }) => {
      const result = await client.runFlowCardAction({ uri, id, args });
      return { success: true, uri, id, result };
    },
  );

  server.registerTool(
    'flowcards_test_condition',
    'Test/evaluate a flow condition card and get a true/false result.',
    {
      type: 'object',
      properties: {
        uri:  { type: 'string', description: 'Card owner URI' },
        id:   { type: 'string', description: 'Condition card ID' },
        args: { type: 'object', description: 'Card arguments' },
      },
      required: ['uri', 'id'],
    },
    async ({ uri, id, args = {} }) => {
      const result = await client.runFlowCardCondition({ uri, id, args });
      return { uri, id, result: !!result };
    },
  );

  // ─── Flow folders ─────────────────────────────────────────────────

  server.registerTool(
    'flow_folders_list',
    'List all flow folders (for organizing flows).',
    { type: 'object', properties: {} },
    async () => {
      const raw = await client.getFlowFolders();
      return Object.values(raw).map(f => ({
        id:   f.id,
        name: f.name,
      }));
    },
  );

  server.registerTool(
    'flow_folders_create',
    'Create a new flow folder.',
    {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Folder name' },
      },
      required: ['name'],
    },
    async ({ name }) => {
      const result = await client.createFlowFolder({ name });
      return { success: true, folder_id: result.id, name };
    },
  );

  server.registerTool(
    'flow_folders_rename',
    'Rename a flow folder.',
    {
      type: 'object',
      properties: {
        folder_id: { type: 'string', description: 'Folder ID' },
        name:      { type: 'string', description: 'New name' },
      },
      required: ['folder_id', 'name'],
    },
    async ({ folder_id, name }) => {
      await client.updateFlowFolder(folder_id, { name });
      return { success: true, folder_id, name };
    },
  );

  server.registerTool(
    'flow_folders_delete',
    'Delete a flow folder. Flows inside are not deleted.',
    {
      type: 'object',
      properties: {
        folder_id: { type: 'string', description: 'Folder ID to delete' },
      },
      required: ['folder_id'],
    },
    async ({ folder_id }) => {
      await client.deleteFlowFolder(folder_id);
      return { success: true, folder_id };
    },
  );

};
