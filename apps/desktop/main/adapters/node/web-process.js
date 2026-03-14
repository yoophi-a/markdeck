const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const http = require('node:http');

function waitForWeb(url, timeoutMs = 30000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve();
      });

      request.on('error', () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error('Timed out waiting for MarkDeck web app'));
          return;
        }

        setTimeout(attempt, 500);
      });
    };

    attempt();
  });
}

function createWebProcessController({ isDev, webPort, webUrl, createWebEnv, desktopDirname }) {
  let webProcess = null;

  function getStandaloneEntrypoint() {
    return path.join(process.resourcesPath, 'web', 'standalone', 'apps', 'web', 'server.js');
  }

  function getStandaloneCwd() {
    return path.dirname(getStandaloneEntrypoint());
  }

  function spawnWebProcess(command, args, cwd) {
    webProcess = spawn(command, args, {
      cwd,
      env: createWebEnv(),
      stdio: 'inherit',
    });

    webProcess.on('exit', () => {
      webProcess = null;
    });
  }

  return {
    async ensureWebApp() {
      if (!webProcess) {
        if (isDev) {
          spawnWebProcess('npm', ['run', 'dev', '--', '--port', String(webPort)], path.resolve(desktopDirname, '../web'));
        } else {
          const entrypoint = getStandaloneEntrypoint();

          if (!fs.existsSync(entrypoint)) {
            throw new Error(`Standalone web bundle not found: ${entrypoint}`);
          }

          spawnWebProcess(process.execPath, [entrypoint], getStandaloneCwd());
        }
      }

      await waitForWeb(webUrl);
      return webUrl;
    },
    stop() {
      if (webProcess) {
        webProcess.kill();
      }
    },
  };
}

module.exports = {
  createWebProcessController,
  waitForWeb,
};
