// CP865 (DOS Nordic) to Unicode mapping for bytes 0x80-0xFF.
// Windows Console delivers CP865-encoded bytes in raw mode, not UTF-8.
const cp865: Record<number, string> = {
  0x80: "\u00c7", 0x81: "\u00fc", 0x82: "\u00e9", 0x83: "\u00e2",
  0x84: "\u00e4", 0x85: "\u00e0", 0x86: "\u00e5", 0x87: "\u00e7",
  0x88: "\u00ea", 0x89: "\u00eb", 0x8a: "\u00e8", 0x8b: "\u00ef",
  0x8c: "\u00ee", 0x8d: "\u00ec", 0x8e: "\u00c4", 0x8f: "\u00c5",
  0x90: "\u00c9", 0x91: "\u00e6", 0x92: "\u00c6", 0x93: "\u00f4",
  0x94: "\u00f6", 0x95: "\u00f2", 0x96: "\u00fb", 0x97: "\u00f9",
  0x98: "\u00ff", 0x99: "\u00d6", 0x9a: "\u00dc", 0x9b: "\u00f8",
  0x9c: "\u00a3", 0x9d: "\u00d8", 0x9e: "\u20a7", 0x9f: "\u0192",
  0xa0: "\u00e1", 0xa1: "\u00ed", 0xa2: "\u00f3", 0xa3: "\u00fa",
  0xa4: "\u00f1", 0xa5: "\u00d1", 0xa6: "\u00aa", 0xa7: "\u00ba",
  0xa8: "\u00bf", 0xa9: "\u2310", 0xaa: "\u00ac", 0xab: "\u00bd",
  0xac: "\u00bc", 0xad: "\u00a1", 0xae: "\u00ab", 0xaf: "\u00a4",
  0xb0: "\u2591", 0xb1: "\u2592", 0xb2: "\u2593", 0xb3: "\u2502",
  0xb4: "\u2524", 0xb5: "\u2561", 0xb6: "\u2562", 0xb7: "\u2556",
  0xb8: "\u2555", 0xb9: "\u2563", 0xba: "\u2551", 0xbb: "\u2557",
  0xbc: "\u255d", 0xbd: "\u255c", 0xbe: "\u255b", 0xbf: "\u2510",
  0xc0: "\u2514", 0xc1: "\u2534", 0xc2: "\u252c", 0xc3: "\u251c",
  0xc4: "\u2500", 0xc5: "\u253c", 0xc6: "\u255e", 0xc7: "\u255f",
  0xc8: "\u255a", 0xc9: "\u2554", 0xca: "\u2569", 0xcb: "\u2566",
  0xcc: "\u2560", 0xcd: "\u2550", 0xce: "\u256c", 0xcf: "\u2567",
  0xd0: "\u2568", 0xd1: "\u2564", 0xd2: "\u2565", 0xd3: "\u2559",
  0xd4: "\u2558", 0xd5: "\u2552", 0xd6: "\u2553", 0xd7: "\u256b",
  0xd8: "\u256a", 0xd9: "\u2518", 0xda: "\u250c", 0xdb: "\u2588",
  0xdc: "\u2584", 0xdd: "\u258c", 0xde: "\u2590", 0xdf: "\u2580",
  0xe0: "\u03b1", 0xe1: "\u00df", 0xe2: "\u0393", 0xe3: "\u03c0",
  0xe4: "\u03a3", 0xe5: "\u03c3", 0xe6: "\u00b5", 0xe7: "\u03c4",
  0xe8: "\u03a6", 0xe9: "\u0398", 0xea: "\u03a9", 0xeb: "\u03b4",
  0xec: "\u221e", 0xed: "\u03c6", 0xee: "\u03b5", 0xef: "\u2229",
  0xf0: "\u2261", 0xf1: "\u00b1", 0xf2: "\u2265", 0xf3: "\u2264",
  0xf4: "\u2320", 0xf5: "\u2321", 0xf6: "\u00f7", 0xf7: "\u2248",
  0xf8: "\u00b0", 0xf9: "\u2219", 0xfa: "\u00b7", 0xfb: "\u221a",
  0xfc: "\u207f", 0xfd: "\u00b2", 0xfe: "\u25a0", 0xff: "\u00a0",
};

const asciiDecoder = new TextDecoder();

/** Read a single keypress from stdin. Assumes raw mode is active. */
export async function readKey(): Promise<string> {
  const buf = new Uint8Array(1);
  const n = await Deno.stdin.read(buf);
  if (n === null) return "";

  if (buf[0] < 0x80) return asciiDecoder.decode(buf);
  return cp865[buf[0]] ?? String.fromCharCode(buf[0]);
}

/** Enable or disable raw mode on stdin. */
export function setRawMode(enabled: boolean): void {
  Deno.stdin.setRaw(enabled);
}

/** Register a handler for SIGINT (Ctrl-C). */
export function onInterrupt(handler: () => void): void {
  Deno.addSignalListener("SIGINT", handler);
}
