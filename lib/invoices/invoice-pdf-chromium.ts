import { existsSync } from "node:fs";
import { join } from "node:path";
import puppeteer, { type Browser } from "puppeteer-core";

/** API estática de `@sparticuz/chromium` (binario serverless). */
type SparticuzChromiumExports = {
  executablePath: (input?: string) => Promise<string>;
  readonly args: string[];
  readonly defaultViewport: {
    width: number;
    height: number;
    deviceScaleFactor?: number;
    isMobile?: boolean;
    isLandscape?: boolean;
    hasTouch?: boolean;
  };
  readonly headless: true | "shell";
};

function baseArgs(): string[] {
  return [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--font-render-hinting=none",
  ];
}

function tryLocalWindowsChrome(): string | null {
  if (process.env.LOCALAPPDATA) {
    const p = join(
      process.env.LOCALAPPDATA,
      "Google",
      "Chrome",
      "Application",
      "chrome.exe",
    );
    if (existsSync(p)) {
      return p;
    }
  }
  for (const w of [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ]) {
    if (existsSync(w)) {
      return w;
    }
  }
  return null;
}

function tryMacChrome(): string | null {
  const p = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  return existsSync(p) ? p : null;
}

function tryLinuxChrome(): string | null {
  for (const p of [
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ]) {
    if (existsSync(p)) {
      return p;
    }
  }
  return null;
}

function shouldUseServerlessChromiumBundle(): boolean {
  if (process.env.USE_SPARTICUZ_CHROMIUM === "0") {
    return false;
  }
  return (
    process.env.USE_SPARTICUZ_CHROMIUM === "1" ||
    process.env.VERCEL === "1" ||
    Boolean(process.env.VERCEL_ENV) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME)
  );
}

/**
 * Misma aproximación que «Guardar como PDF» en Chrome: motor Chromium + @media print.
 */
export async function renderPrintPageUrlToPdf(input: {
  printPageUrl: string;
  origin: string;
  sessionCookie: { name: "staff_session"; value: string };
}): Promise<Buffer | { error: "no_chrome" }> {
  const created = await launchChromium();
  if ("error" in created) {
    return { error: "no_chrome" };
  }
  const { browser, close } = created;
  try {
    const page = await browser.newPage();
    await page.setCookie({
      name: input.sessionCookie.name,
      value: input.sessionCookie.value,
      url: input.origin,
    });
    await page.setViewport({ width: 1200, height: 1800, deviceScaleFactor: 1 });
    await page.emulateMediaType("print");
    await page.goto(input.printPageUrl, {
      waitUntil: "networkidle0",
      timeout: 90_000,
    });
    await page.waitForSelector("#invoice-pdf-root", { visible: true, timeout: 25_000 });
    try {
      await page.evaluate(async () => {
        await document.fonts?.ready;
      });
    } catch {
      /* ignore */
    }
    await new Promise((r) => setTimeout(r, 250));
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
    });
    return Buffer.from(pdf);
  } finally {
    await close();
  }
}

type LaunchResult =
  | { browser: Browser; close: () => Promise<void> }
  | { error: "no_chrome" };

async function launchChromium(): Promise<LaunchResult> {
  /** Producción sin Chrome del sistema (@sparticuz/chromium tiene bin/br + brotli en node_modules). */
  if (shouldUseServerlessChromiumBundle()) {
    try {
      const chromiumMod = await import("@sparticuz/chromium");
      /**
       * CJS export: `exports = Chromium`, en ESM `import(...).default` suele ser la clase Chromium.
       * @see https://github.com/Sparticuz/chromium README (puppeteer.launch).
       */
      /** `export = Chromium` → en `import()` suele estar en `.default`. */
      const n = chromiumMod as unknown as { default?: SparticuzChromiumExports };
      const C = (n.default ?? chromiumMod) as unknown as SparticuzChromiumExports;
      const executablePath = await C.executablePath();
      const browser = await puppeteer.launch({
        executablePath,
        args: C.args,
        defaultViewport: C.defaultViewport,
        headless: C.headless,
      });
      return { browser, close: () => browser.close() };
    } catch {
      /* continuar intentos locales */
    }
  }

  const envP = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
  if (envP && existsSync(envP)) {
    const browser = await puppeteer.launch({
      executablePath: envP,
      headless: true,
      args: baseArgs(),
    });
    return { browser, close: () => browser.close() };
  }
  const win = tryLocalWindowsChrome();
  if (win) {
    const browser = await puppeteer.launch({ executablePath: win, headless: true, args: baseArgs() });
    return { browser, close: () => browser.close() };
  }
  const mac = tryMacChrome();
  if (mac) {
    const browser = await puppeteer.launch({ executablePath: mac, headless: true, args: baseArgs() });
    return { browser, close: () => browser.close() };
  }
  const linux = tryLinuxChrome();
  if (linux) {
    const browser = await puppeteer.launch({
      executablePath: linux,
      headless: true,
      args: baseArgs(),
    });
    return { browser, close: () => browser.close() };
  }

  return { error: "no_chrome" };
}
