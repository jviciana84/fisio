import { existsSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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

type LaunchResult =
  | { browser: Browser; close: () => Promise<void> }
  | { error: "no_chrome" };

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

function hasSparticuzBrokerFiles(dir: string): boolean {
  if (!existsSync(dir)) return false;
  if (existsSync(join(dir, "chromium.br"))) return true;
  try {
    return readdirSync(dir).some((f) => f.endsWith(".br"));
  } catch {
    return false;
  }
}

/**
 * Carpeta `(...)/@sparticuz/chromium/bin` con los `.br`.
 * En Vercel el `cwd` suele ser `/var/task`; si `createRequire(package.json)` falla, probamos rutas fijas y el módulo actual.
 */
function resolveSparticuzChromiumBinDir(): string | null {
  const env = process.env.SPARTICUZ_CHROMIUM_BIN?.trim();
  if (env && hasSparticuzBrokerFiles(env)) {
    return env;
  }

  const fromCwd = join(process.cwd(), "node_modules", "@sparticuz", "chromium", "bin");
  if (hasSparticuzBrokerFiles(fromCwd)) {
    return fromCwd;
  }

  const lambdaStyle = "/var/task/node_modules/@sparticuz/chromium/bin";
  if (hasSparticuzBrokerFiles(lambdaStyle)) {
    return lambdaStyle;
  }

  const tryRequireResolve = (rq: ReturnType<typeof createRequire>): string | null => {
    try {
      const pkgJson = rq.resolve("@sparticuz/chromium/package.json");
      const binDir = join(dirname(pkgJson), "bin");
      return hasSparticuzBrokerFiles(binDir) ? binDir : null;
    } catch {
      return null;
    }
  };

  const fromPkgJson = tryRequireResolve(createRequire(join(process.cwd(), "package.json")));
  if (fromPkgJson) {
    return fromPkgJson;
  }

  try {
    const here = fileURLToPath(import.meta.url);
    const fromModule = tryRequireResolve(createRequire(here));
    if (fromModule) {
      return fromModule;
    }
  } catch {
    /* import.meta no disponible / build raro */
  }

  return null;
}

function logChromiumLaunchError(phase: string, err: unknown): void {
  if (process.env.VERCEL !== "1" && !process.env.DEBUG_INVOICE_CHROMIUM) return;
  const msg = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(`[invoice-pdf-chromium:${phase}] ${msg}`, stack ?? "");
}

function getSparticuzChromiumRequireLoaders(): Array<() => SparticuzChromiumExports> {
  const loaders: Array<() => SparticuzChromiumExports> = [];
  loaders.push(() => {
    const rq = createRequire(join(process.cwd(), "package.json"));
    return rq("@sparticuz/chromium") as SparticuzChromiumExports;
  });
  try {
    const here = fileURLToPath(import.meta.url);
    loaders.push(() => {
      const rq = createRequire(here);
      return rq("@sparticuz/chromium") as SparticuzChromiumExports;
    });
  } catch {
    /* import.meta no disponible en este build */
  }
  return loaders;
}

async function launchSparticuzChromium(): Promise<
  { browser: Browser; close: () => Promise<void> } | null
> {
  const binDir = resolveSparticuzChromiumBinDir();
  const chromiumLoaders = getSparticuzChromiumRequireLoaders();

  for (let i = 0; i < chromiumLoaders.length; i++) {
    try {
      const chromium = chromiumLoaders[i]();
      const exe = await chromium.executablePath(binDir ?? undefined);
      const browser = await puppeteer.launch({
        executablePath: exe,
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        headless: chromium.headless,
      });
      return { browser, close: () => browser.close() };
    } catch (err) {
      logChromiumLaunchError(`sparticuz-require-${i}`, err);
    }
  }

  return null;
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

async function launchChromium(): Promise<LaunchResult> {
  /** Producción Vercel/Lambda: binario Sparticuz con ruta explícita al `bin/`. */
  if (shouldUseServerlessChromiumBundle()) {
    const spartz = await launchSparticuzChromium();
    if (spartz) {
      return spartz;
    }
    try {
      const chromiumMod = await import("@sparticuz/chromium");
      const n = chromiumMod as unknown as { default?: SparticuzChromiumExports };
      const C = (n.default ?? chromiumMod) as unknown as SparticuzChromiumExports;
      const binDir = resolveSparticuzChromiumBinDir();
      const executablePath = await C.executablePath(binDir ?? undefined);
      const browser = await puppeteer.launch({
        executablePath,
        args: C.args,
        defaultViewport: C.defaultViewport,
        headless: C.headless,
      });
      return { browser, close: () => browser.close() };
    } catch (err) {
      logChromiumLaunchError("sparticuz-dynamic-import", err);
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
