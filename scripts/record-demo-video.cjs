/**
 * Automated PayrollAO demo video recorder.
 * Starts Vite (browser preview mode), walks every main tab with Playwright,
 * exports demo/PayrollAO-demo.mp4 via ffmpeg-static.
 *
 * Usage: npm run demo:record
 */
const { spawn, spawnSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = 8080;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const DEMO_DIR = path.join(ROOT, 'demo');
const RAW_VIDEO_DIR = path.join(DEMO_DIR, 'raw');
const OUTPUT_MP4 = path.join(DEMO_DIR, 'PayrollAO-demo.mp4');

const SECTIONS = [
  {
    hash: '#/login',
    title: 'PayrollAO — Início de sessão',
    seconds: 12,
    async interact(page) {
      await page.waitForSelector('#username', { timeout: 30000 });
      await page.waitForFunction(
        () => {
          const btn = document.querySelector('button[type="submit"]');
          return btn && !btn.disabled;
        },
        { timeout: 30000 },
      );
      await page.fill('#username', 'admin');
      await page.fill('#password', 'admin');
      await page.keyboard.press('Enter');
      await page.waitForURL(/#\/(?!login)/, { timeout: 15000 }).catch(() => {});
    },
  },
  { hash: '#/', title: 'Painel Principal — KPIs e ações rápidas', seconds: 16 },
  {
    hash: '#/employees',
    title: 'Funcionários — gestão de pessoal',
    seconds: 18,
    async interact(page) {
      const row = page.locator('table tbody tr').first();
      if (await row.count()) {
        await row.click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(4000);
        await page.goto(`${BASE_URL}/#/employees`, { waitUntil: 'networkidle' });
      }
    },
  },
  { hash: '#/employee-cards', title: 'Cartões de identificação', seconds: 14 },
  { hash: '#/payroll', title: 'Folha salarial — cálculo e aprovação', seconds: 18 },
  { hash: '#/payroll-history', title: 'Histórico de folha', seconds: 14 },
  { hash: '#/hr-dashboard', title: 'Painel de Recursos Humanos', seconds: 14 },
  { hash: '#/attendance', title: 'Assiduidade e presenças', seconds: 14 },
  { hash: '#/deductions', title: 'Descontos — adiantamentos e armazém', seconds: 16 },
  { hash: '#/branches', title: 'Filiais', seconds: 13 },
  { hash: '#/labor-law', title: 'Lei laboral angolana', seconds: 12 },
  { hash: '#/tax-simulator', title: 'Simulador IRT / INSS', seconds: 14 },
  { hash: '#/documents', title: 'Documentos e contratos', seconds: 14 },
  { hash: '#/reports', title: 'Relatórios e exportações', seconds: 14 },
  { hash: '#/settings', title: 'Definições da empresa', seconds: 14 },
  { hash: '#/users', title: 'Utilizadores e permissões', seconds: 14 },
];

function log(msg) {
  console.log(`[demo] ${msg}`);
}

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}`, (res) => {
      res.resume();
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function waitForPort(port, timeoutMs) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const poll = async () => {
      if (await checkPort(port)) return resolve();
      if (Date.now() - start > timeoutMs) {
        return reject(new Error(`Vite did not start on port ${port} within ${timeoutMs}ms`));
      }
      setTimeout(poll, 600);
    };
    poll();
  });
}

async function showCaption(page, title) {
  await page.evaluate((text) => {
    let el = document.getElementById('payrollao-demo-caption');
    if (!el) {
      el = document.createElement('div');
      el.id = 'payrollao-demo-caption';
      el.style.cssText =
        'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);' +
        'background:rgba(15,23,42,0.92);color:#f8fafc;padding:10px 22px;border-radius:10px;' +
        'font:600 17px/1.3 Segoe UI,system-ui,sans-serif;z-index:2147483647;' +
        'box-shadow:0 8px 24px rgba(0,0,0,0.35);pointer-events:none;';
      document.body.appendChild(el);
    }
    el.textContent = text;
  }, title);
}

async function dismissOverlays(page) {
  await page.keyboard.press('Escape').catch(() => {});
  const closeTour = page.locator('button').filter({ has: page.locator('svg') }).first();
  await closeTour.click({ timeout: 800 }).catch(() => {});
}

async function smoothScroll(page) {
  await page.evaluate(async () => {
    const max = Math.min(document.body.scrollHeight - window.innerHeight, 900);
    let moved = 0;
    while (moved < max) {
      window.scrollBy(0, 60);
      moved += 60;
      await new Promise((r) => setTimeout(r, 45));
    }
    window.scrollTo(0, 0);
  });
}

async function recordDemo() {
  fs.mkdirSync(RAW_VIDEO_DIR, { recursive: true });

  let viteProcess = null;
  const portUp = await checkPort(PORT);
  if (!portUp) {
    log('Starting Vite dev server…');
    viteProcess = spawn('npm', ['run', 'dev'], {
      cwd: ROOT,
      shell: true,
      stdio: 'ignore',
      detached: process.platform !== 'win32',
    });
    await waitForPort(PORT, 90000);
    log('Vite is ready.');
  } else {
    log('Vite already running — reusing it.');
  }

  const { chromium } = require('playwright');

  log('Launching browser and recording…');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: RAW_VIDEO_DIR, size: { width: 1280, height: 720 } },
    locale: 'pt-PT',
    colorScheme: 'light',
  });

  const page = await context.newPage();

  await page.addInitScript(() => {
    localStorage.setItem('payroll_selected_province', 'Luanda');
    localStorage.removeItem('payrollao_tour_seen');
  });

  for (const section of SECTIONS) {
    log(`Scene: ${section.title}`);
    await page.goto(`${BASE_URL}/${section.hash}`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });
    await page.waitForTimeout(1500);
    await dismissOverlays(page);
    await showCaption(page, section.title);

    if (section.interact) {
      await section.interact(page).catch((err) => log(`  interact skipped: ${err.message}`));
    }

    const dwellMs = section.seconds * 1000;
    const scrollAt = Math.floor(dwellMs * 0.35);
    await page.waitForTimeout(scrollAt);
    await smoothScroll(page);
    await page.waitForTimeout(dwellMs - scrollAt);
  }

  const video = page.video();
  await context.close();
  await browser.close();

  const webmPath = video ? await video.path() : null;
  if (!webmPath || !fs.existsSync(webmPath)) {
    throw new Error('Playwright did not produce a video file.');
  }

  log(`Raw video: ${webmPath}`);

  let ffmpegPath;
  try {
    ffmpegPath = require('ffmpeg-static');
  } catch {
    ffmpegPath = 'ffmpeg';
  }

  log('Converting to MP4…');
  const ff = spawnSync(
    ffmpegPath,
    ['-y', '-i', webmPath, '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUTPUT_MP4],
    { stdio: 'inherit', shell: false },
  );

  if (ff.status !== 0) {
    fs.copyFileSync(webmPath, path.join(DEMO_DIR, 'PayrollAO-demo.webm'));
    throw new Error('ffmpeg conversion failed — saved WebM in demo/ instead.');
  }

  const stat = fs.statSync(OUTPUT_MP4);
  const sizeMb = (stat.size / (1024 * 1024)).toFixed(1);
  log(`Done: ${OUTPUT_MP4} (${sizeMb} MB)`);

  if (viteProcess && viteProcess.pid) {
    try {
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/PID', String(viteProcess.pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        process.kill(-viteProcess.pid);
      }
    } catch {
      viteProcess.kill();
    }
  }
}

recordDemo().catch((err) => {
  console.error('[demo] FAILED:', err.message || err);
  process.exit(1);
});
