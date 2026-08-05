// Download Danish word pronunciations once and store them as static MP3 files.
//
// Source: Microsoft Edge "Read Aloud" neural voices (free, no API key).
// Voice: da-DK-ChristelNeural (female). Alternative: da-DK-JeppeNeural.
//
// Output: public/sounds/<word>.mp3
//
// Usage:
//   deno task sound:download                  # all words
//   deno task sound:download --word kat       # single word (smoke test)
//   deno task sound:download --limit 50       # first 50 missing words
//   deno task sound:download --voice da-DK-JeppeNeural
import WebSocket from "ws";

const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const WSS_BASE =
  "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";
const CHROMIUM_VERSION = "143.0.0.0";
const SEC_MS_GEC_VERSION = "1-143.0.3650.75";
const WIN_EPOCH = 11644473600;

const DEFAULT_VOICE = "da-DK-ChristelNeural";
const OUTPUT_DIR = "public/sounds";
const WORDS_PATH = "public/words.json";

const CONCURRENCY = 3;
const MAX_ATTEMPTS = 3;
const HANDSHAKE_TIMEOUT_MS = 30_000;
const SYNTH_TIMEOUT_MS = 30_000;
const RETRY_BASE_DELAY_MS = 1_000;

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Clock skew between client and Microsoft server (seconds).
let clockSkewSeconds = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return [...buf]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function connectId(): string {
  return crypto.randomUUID().replaceAll("-", "");
}

/** JavaScript-style date string matching Edge's expected X-Timestamp format. */
function dateToString(): string {
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");
  return (
    `${DAY_NAMES[d.getUTCDay()]} ${MONTH_NAMES[d.getUTCMonth()]} ` +
    `${pad(d.getUTCDate())} ${d.getUTCFullYear()} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} ` +
    "GMT+0000 (Coordinated Universal Time)"
  );
}

/**
 * Generate the Sec-MS-GEC token: SHA-256 of the Windows file time rounded
 * down to five minutes concatenated with the trusted client token.
 * Mirrors Microsoft's own client so no network call is required.
 */
async function generateSecMsGec(): Promise<string> {
  const unix = Date.now() / 1000 + clockSkewSeconds;
  let ticks = unix + WIN_EPOCH;
  ticks -= ticks % 300;
  ticks *= 1e7;
  const toHash = `${ticks.toFixed(0)}${TRUSTED_CLIENT_TOKEN}`;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(toHash),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function ssmlFor(word: string, voice: string): string {
  return (
    `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
    `<voice name='${voice}'>` +
    `<prosody pitch='+0Hz' rate='+0%' volume='+0%'>` +
    `${escapeXml(word)}` +
    `</prosody></voice></speak>`
  );
}

function configMessage(): string {
  return (
    `X-Timestamp:${dateToString()}\r\n` +
    "Content-Type:application/json; charset=utf-8\r\n" +
    "Path:speech.config\r\n\r\n" +
    '{"context":{"synthesis":{"audio":{"metadataoptions":' +
    '{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},' +
    '"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n'
  );
}

function ssmlMessage(word: string, voice: string): string {
  return (
    `X-RequestId:${connectId()}\r\n` +
    "Content-Type:application/ssml+xml\r\n" +
    `X-Timestamp:${dateToString()}Z\r\n` +
    "Path:ssml\r\n\r\n" +
    `${ssmlFor(word, voice)}`
  );
}

function toUint8(data: unknown): Uint8Array {
  if (data instanceof Uint8Array) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  return new Uint8Array(0);
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function isValidMp3(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return true;
  return bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
}

type HandshakeInfo = { status: number; date: string };

function openConnection(token: string): Promise<WebSocket> {
  const url =
    `${WSS_BASE}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}` +
    `&ConnectionId=${connectId()}` +
    `&Sec-MS-GEC=${token}` +
    `&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`;
  const headers = {
    Pragma: "no-cache",
    "Cache-Control": "no-cache",
    Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
    "User-Agent":
      `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ` +
      `(KHTML, like Gecko) Chrome/${CHROMIUM_VERSION} Safari/537.36 Edg/${CHROMIUM_VERSION}`,
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Accept-Language": "en-US,en;q=0.9",
    Cookie: `muid=${randomHex(16)};`,
  };

  return new Promise((resolve, reject) => {
    const handshake: HandshakeInfo = { status: 0, date: "" };
    const ws = new WebSocket(url, { headers });

    // Permanent no-op listener: stray sockets must never crash the batch.
    ws.on("error", () => {});

    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        ws.terminate();
        reject(new Error("Opening handshake timed out"));
      }
    }, HANDSHAKE_TIMEOUT_MS);

    const cleanup = (): void => {
      clearTimeout(timer);
      ws.off("open", onOpen);
      ws.off("error", onError);
      ws.off("unexpected-response", onUnexpected);
    };

    const onOpen = (): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(ws);
    };

    const onError = (err: Error): void => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(
        Object.assign(err, {
          statusCode: handshake.status,
          date: handshake.date,
        }),
      );
    };

    const onUnexpected = (
      req: unknown,
      res: {
        statusCode?: number;
        headers?: Record<string, string | string[] | undefined>;
        resume: () => void;
      },
    ): void => {
      handshake.status = res.statusCode ?? 0;
      const date = res.headers?.["date"];
      handshake.date = Array.isArray(date) ? date[0] ?? "" : date ?? "";
      try {
        res.resume();
      } catch {
        // ignore
      }
      try {
        (req as { destroy?: () => void }).destroy?.();
      } catch {
        // ignore
      }
    };

    ws.on("unexpected-response", onUnexpected);
    ws.on("open", onOpen);
    ws.on("error", onError);
  });
}

/**
 * Send one SSML request over an open connection and collect the MP3 bytes
 * until the server reports `turn.end`.
 */
function synthesize(ws: WebSocket, word: string, voice: string): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        ws.terminate();
        reject(new Error(`Timed out synthesizing '${word}'`));
      }
    }, SYNTH_TIMEOUT_MS);

    const cleanup = (): void => {
      clearTimeout(timer);
      ws.off("message", onMessage);
      ws.off("error", onError);
      ws.off("close", onClose);
    };

    const fail = (err: Error): void => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    const onError = (err: Error): void => {
      fail(new Error(`WebSocket error: ${err.message}`));
    };

    const onClose = (): void => {
      fail(new Error("Connection closed before turn.end"));
    };

    const onMessage = (data: unknown, isBinary: boolean): void => {
      try {
        if (isBinary) {
          const buf = toUint8(data);
          if (buf.length < 2) return;
          const headerLength = (buf[0] << 8) | buf[1];
          if (headerLength + 2 > buf.length) return;
          const header = new TextDecoder().decode(buf.subarray(2, 2 + headerLength));
          if (header.split("\r\n").some((line) => line === "Path:audio")) {
            const audio = buf.subarray(2 + headerLength);
            if (audio.length > 0) chunks.push(audio);
          }
          return;
        }
        const text = String(data);
        const boundary = text.indexOf("\r\n\r\n");
        const header = boundary >= 0 ? text.slice(0, boundary) : text;
        if (header.split("\r\n").some((line) => line === "Path:turn.end")) {
          if (settled) return;
          settled = true;
          cleanup();
          if (chunks.length === 0) {
            reject(new Error(`No audio received for '${word}'`));
            return;
          }
          resolve(concatBytes(chunks));
        }
      } catch (err) {
        fail(err instanceof Error ? err : new Error(String(err)));
      }
    };

    ws.on("message", onMessage);
    ws.on("error", onError);
    ws.on("close", onClose);
    ws.send(ssmlMessage(word, voice));
  });
}

function applySkewFromDate(date: string): void {
  const serverMs = Date.parse(date);
  if (!Number.isNaN(serverMs)) {
    clockSkewSeconds = (serverMs - Date.now()) / 1000;
  }
}

async function downloadWord(word: string, voice: string): Promise<Uint8Array> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let ws: WebSocket | undefined;
    try {
      const token = await generateSecMsGec();
      ws = await openConnection(token);
      ws.send(configMessage());
      const bytes = await synthesize(ws, word, voice);
      if (!isValidMp3(bytes)) {
        throw new Error("Received data is not a valid MP3");
      }
      return bytes;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const status = (err as { statusCode?: number }).statusCode;
      const date = (err as { date?: string }).date;
      if (status === 403 && date) applySkewFromDate(date);
      console.warn(`  attempt ${attempt} failed for '${word}': ${lastError.message}`);
      await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
    } finally {
      if (ws) {
        ws.terminate();
      }
    }
  }
  throw lastError ?? new Error(`Failed to synthesize '${word}'`);
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_");
}

type Options = { voice: string; limit: number; word?: string; delay: number };

function parseArgs(): Options {
  const args = Deno.args;
  const opts: Options = { voice: DEFAULT_VOICE, limit: Infinity, delay: 100 };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--voice":
        opts.voice = args[++i] ?? opts.voice;
        break;
      case "--limit": {
        const n = Number.parseInt(args[++i] ?? "", 10);
        opts.limit = Number.isFinite(n) ? n : Infinity;
        break;
      }
      case "--word":
        opts.word = args[++i];
        break;
      case "--delay": {
        const n = Number.parseInt(args[++i] ?? "", 10);
        opts.delay = Number.isFinite(n) ? n : 0;
        break;
      }
    }
  }
  return opts;
}

async function main(): Promise<void> {
  const { voice, limit, word, delay } = parseArgs();
  await Deno.mkdir(OUTPUT_DIR, { recursive: true });

  if (word) {
    console.log(`Synthesizing '${word}' (voice: ${voice})…`);
    const bytes = await downloadWord(word, voice);
    const out = `${OUTPUT_DIR}/${sanitizeFilename(`${word}.mp3`)}`;
    await Deno.writeFile(out, bytes);
    console.log(`Saved ${out} (${(bytes.length / 1024).toFixed(1)} kB)`);
    return;
  }

  const groups = JSON.parse(await Deno.readTextFile(WORDS_PATH)) as Array<
    Array<{ word: string }>
  >;
  const allWords = [
    ...new Set(groups.flat().map((entry) => String(entry.word))),
  ].filter((w) => w.length > 0);
  const targets = Number.isFinite(limit) ? allWords.slice(0, limit) : allWords;
  const total = targets.length;

  console.log(`Downloading ${total} words to ${OUTPUT_DIR} (voice: ${voice})…`);

  const queue = [...targets];
  const failed: string[] = [];
  let processed = 0;

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const current = queue.shift() as string;
      const out = `${OUTPUT_DIR}/${sanitizeFilename(`${current}.mp3`)}`;
      if (await fileExists(out)) {
        processed++;
        continue;
      }
      try {
        const bytes = await downloadWord(current, voice);
        await Deno.writeFile(out, bytes);
        processed++;
        console.log(`[${processed}/${total}] ${current} → ${(bytes.length / 1024).toFixed(1)} kB`);
      } catch (err) {
        failed.push(current);
        console.error(`[FAIL] ${current}: ${(err as Error).message}`);
      }
      if (delay > 0) await sleep(delay);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  if (failed.length > 0) {
    console.error(`\n${failed.length} words failed: ${failed.join(", ")}`);
    console.error("Re-run the same command to retry only the missing files.");
    Deno.exit(1);
  }
  console.log("\nDone.");
}

if (import.meta.main) {
  await main();
}
