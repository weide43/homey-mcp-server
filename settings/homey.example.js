// Preview stub — simulates the Homey bridge for local development.
// Copy this file to homey.js and adjust the values for your local setup.
// homey.js is gitignored and excluded from the app bundle.
(function() {
  var store = {
    status: 'running',
    mcp_url: 'http://192.168.x.x:52199/mcp',  // change to your Homey IP
    port: 52199,
    tool_count: 81,
    sessions: 0,
    local_address: ''
  };

  window.onload = function() {
    if (typeof onHomeyReady === 'function') {
      onHomeyReady({
        ready: function() {},
        get: function(k, cb) { cb(null, store[k] != null ? store[k] : null); },
        set: function(k, v, cb) { store[k] = v; if (cb) cb(); },
        alert: function(msg) { console.warn('[Homey]', msg); }
      });
    }
  };
})();
