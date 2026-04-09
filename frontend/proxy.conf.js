/** @type {import('@angular/cli/lib/config/workspace-schema').SchematicsPlusProxyConfig} */
module.exports = {
  '/api': {
    target: 'http://backend:5000',
    secure: false,
    changeOrigin: true
  }
};