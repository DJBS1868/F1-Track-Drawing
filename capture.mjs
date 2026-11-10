import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const runtime = process.env.OMGITHUB_PLAYWRIGHT_DIR
  || join(process.env.HOME, '.local/share/omgithub-playwright');
const require = createRequire(join(runtime, 'package.json'));
const { chromium } = require('playwright');

const captureUrl = process.env.CAPTURE_URL;
const captureDir = process.env.CAPTURE_DIR;
const projectDir = process.env.PROJECT_DIR || process.cwd();

const VIEWS = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, isMobile: false },
  { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true }
];

function nowMs() {
  return Number(process.hrtime.bigint() / 1000000n);
}

async function timed(label, fn) {
  const start = nowMs();
  try {
    return await fn();
  } finally {
    console.error(`[timing] ${label}: ${nowMs() - start} ms`);
  }
}

function withExitCode(error, exitCode) {
  error.exitCode = exitCode;
  return error;
}

function transient(message, cause) {
  const error = new Error(message, cause ? { cause } : undefined);
  return withExitCode(error, 75);
}

function defect(message, cause) {
  const error = new Error(message, cause ? { cause } : undefined);
  return withExitCode(error, 1);
}

function sameOrigin(url) {
  try {
    return new URL(url).origin === new URL(captureUrl).origin;
  } catch {
    return false;
  }
}

async function captureView(browser, view) {
  const context = await browser.newContext({
    viewport: view.viewport,
    screen: view.viewport,
    deviceScaleFactor: 1,
    isMobile: view.isMobile,
    hasTouch: view.isMobile,
    locale: 'en-US'
  }).catch((error) => {
    throw transient(`Could not create ${view.name} browser context: ${error.message}`, error);
  });

  const page = await context.newPage().catch((error) => {
    throw transient(`Could not open ${view.name} page: ${error.message}`, error);
  });

  const renderErrors = [];
  page.on('pageerror', (error) => renderErrors.push(`page error: ${error.message}`));
  page.on('response', (response) => {
    if (response.status() >= 400 && sameOrigin(response.url())) {
      renderErrors.push(`HTTP ${response.status()}: ${response.url()}`);
    }
  });

  try {
    const response = await timed(`navigate ${view.name}`, () => page.goto(captureUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    })).catch((error) => {
      throw transient(`Navigation failed for ${view.name}: ${error.message}`, error);
    });

    if (!response) throw transient(`Navigation returned no response for ${view.name}`);
    const status = response.status();
    if (status >= 500 || status === 408 || status === 429) {
      throw transient(`Preview returned HTTP ${status} for ${view.name}`);
    }
    if (status >= 400) {
      throw defect(`Preview returned HTTP ${status} for ${view.name}`);
    }

    await timed(`load ${view.name}`, () => page.waitForLoadState('load', {
      timeout: 45000
    })).catch((error) => {
      throw transient(`Page load stalled for ${view.name}: ${error.message}`, error);
    });

    await timed(`wait for ${view.name} render`, async () => {
      await page.waitForFunction(() => {
        const loading = document.querySelector('#loading');
        const menu = document.querySelector('#screen-menu.is-active');
        return Boolean(window.__apex && menu && loading && getComputedStyle(loading).display === 'none');
      }, null, { timeout: 45000 });
      await page.evaluate(async () => {
        await document.fonts?.ready;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
    }).catch((error) => {
      throw defect(`Application did not render for ${view.name}: ${error.message}`, error);
    });

    const canvasReady = await page.evaluate(() => {
      const canvas = document.querySelector('#webgl');
      if (!canvas) return false;
      const rect = canvas.getBoundingClientRect();
      return canvas.width > 0 && canvas.height > 0 && rect.width > 0 && rect.height > 0;
    }).catch((error) => {
      throw defect(`Could not inspect the ${view.name} canvas: ${error.message}`, error);
    });

    if (!canvasReady) throw defect(`WebGL canvas is not rendered for ${view.name}`);

    const output = join(captureDir, `final-${view.name}.png`);
    await timed(`screenshot ${view.name}`, () => page.screenshot({
      path: output,
      timeout: 30000
    })).catch((error) => {
      if (error.name === 'TimeoutError' || !browser.isConnected()) {
        throw transient(`Screenshot failed for ${view.name}: ${error.message}`, error);
      }
      throw defect(`Screenshot failed for ${view.name}: ${error.message}`, error);
    });

    if (renderErrors.length) {
      throw defect(`The ${view.name} page reported render errors: ${renderErrors.join('; ')}`);
    }

    console.log(`Captured ${view.name}: ${output}`);
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
}

async function main() {
  if (!captureUrl) throw defect('CAPTURE_URL is required.');
  if (!captureDir) throw defect('CAPTURE_DIR is required.');

  let parsed;
  try {
    parsed = new URL(captureUrl);
  } catch {
    throw defect(`CAPTURE_URL is not a valid URL: ${captureUrl}`);
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    throw defect(`CAPTURE_URL must be HTTP or HTTPS: ${captureUrl}`);
  }

  const configFile = join(runtime, process.platform === 'darwin' ? 'metal.json' : 'linux.json');
  const config = JSON.parse(readFileSync(configFile, 'utf8'));
  if (process.platform === 'linux' && !process.env.DISPLAY) {
    try {
      process.env.DISPLAY = `:${readFileSync(join(runtime, 'display'), 'utf8').trim()}`;
    } catch {
      // Playwright can still fall back to its default display discovery.
    }
  }

  const launchOptions = { ...config.browser.launchOptions, headless: false };
  delete launchOptions.channel;
  const systemChrome = process.env.CHROME_PATH || '/opt/google/chrome/chrome';
  if (existsSync(systemChrome)) launchOptions.executablePath = systemChrome;

  let browser;
  try {
    browser = await timed('launch browser', () => chromium.launch(launchOptions)).catch((error) => {
      throw transient(`Could not launch browser: ${error.message}`, error);
    });

    for (const view of VIEWS) {
      await captureView(browser, view);
    }
  } finally {
    if (browser) {
      await browser.close().catch((error) => {
        console.error(`[warning] browser close failed: ${error.message}`);
        if (!process.exitCode) process.exitCode = 75;
      });
    }
  }
}

console.log(`Capture source: ${captureUrl}`);
console.log(`Capture output: ${captureDir} (outside ${projectDir})`);

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = error.exitCode || 1;
});
