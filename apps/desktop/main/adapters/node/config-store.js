const fs = require('node:fs');
const path = require('node:path');
const { normalizeConfig } = require('../../core/desktop-core');

function createJsonConfigStore({ configPath, fallbackConfig = () => ({}) }) {
  return {
    read() {
      try {
        return normalizeConfig(JSON.parse(fs.readFileSync(configPath, 'utf8')));
      } catch {
        return normalizeConfig(fallbackConfig());
      }
    },
    write(nextConfig) {
      const normalizedConfig = normalizeConfig(nextConfig);
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify(normalizedConfig, null, 2));
      return normalizedConfig;
    },
  };
}

module.exports = {
  createJsonConfigStore,
};
