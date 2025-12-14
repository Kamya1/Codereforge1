const { spawn } = require('child_process');
const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const LOG_PATH = path.join(__dirname, '..', '.cursor', 'debug.log');
const LOG_ENDPOINT = 'http://127.0.0.1:7242/ingest/ffe9b9fa-7233-45a1-aedb-78e156f49788';

function log(message, data = {}) {
  const logEntry = {
    location: 'scripts/dev-with-browser.js',
    message,
    data,
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'A'
  };
  
  // Write to log file (NDJSON format)
  try {
    const logDir = path.dirname(LOG_PATH);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(LOG_PATH, JSON.stringify(logEntry) + '\n');
  } catch (e) {
    // Ignore file write errors
  }
  
  // Also try HTTP logging
  try {
    const postData = JSON.stringify(logEntry);
    const url = new URL(LOG_ENDPOINT);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, () => {});
    req.on('error', () => {});
    req.write(postData);
    req.end();
  } catch (e) {
    // Ignore HTTP logging errors
  }
  
  console.log(`[DEBUG] ${message}`, data);
}

function checkServerReady(url, maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const check = () => {
      attempts++;
      log('Checking server readiness', { attempt: attempts, url });
      
      const req = http.get(url, (res) => {
        log('Server is ready', { statusCode: res.statusCode, url });
        resolve(true);
      });
      
      req.on('error', (err) => {
        if (attempts >= maxAttempts) {
          log('Server check failed - max attempts reached', { attempts, error: err.message });
          reject(new Error(`Server not ready after ${maxAttempts} attempts`));
        } else {
          setTimeout(check, 1000);
        }
      });
      
      req.setTimeout(1000, () => {
        req.destroy();
        if (attempts >= maxAttempts) {
          log('Server check timeout - max attempts reached', { attempts });
          reject(new Error(`Server not ready after ${maxAttempts} attempts`));
        } else {
          setTimeout(check, 1000);
        }
      });
    };
    
    check();
  });
}

function openBrowser(url) {
  const platform = process.platform;
  log('Opening browser', { platform, url });
  
  let command;
  if (platform === 'win32') {
    command = `start "" "${url}"`;
  } else if (platform === 'darwin') {
    command = `open "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      log('Browser open error', { error: error.message, stderr });
    } else {
      log('Browser opened successfully', { stdout });
    }
  });
}

async function main() {
  const port = process.env.PORT || 3000;
  const url = `http://localhost:${port}`;
  
  log('Starting dev server script', { port, url, platform: process.platform });
  
  // Start Next.js dev server
  log('Spawning Next.js dev server', { command: 'next dev' });
  const nextProcess = spawn('npx', ['next', 'dev'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, PORT: port }
  });
  
  nextProcess.on('error', (error) => {
    log('Next.js process error', { error: error.message });
    process.exit(1);
  });
  
  nextProcess.on('exit', (code) => {
    log('Next.js process exited', { code });
    process.exit(code || 0);
  });
  
  // Wait for server to be ready
  try {
    log('Waiting for server to be ready', { url });
    await checkServerReady(url);
    log('Server ready, opening browser', { url });
    openBrowser(url);
  } catch (error) {
    log('Failed to wait for server', { error: error.message });
    // Don't exit - let the server continue running
  }
}

main().catch((error) => {
  log('Main function error', { error: error.message });
  process.exit(1);
});

