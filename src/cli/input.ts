const decoder = new TextDecoder();

function utf8ByteLength(lead: number): number {
  if (lead < 0x80) return 1;
  if ((lead & 0xe0) === 0xc0) return 2;
  if ((lead & 0xf0) === 0xe0) return 3;
  if ((lead & 0xf8) === 0xf0) return 4;
  return 1;
}

/** Read a single keypress from stdin. Assumes raw mode is active. */
export async function readKey(): Promise<string> {
  const lead = new Uint8Array(1);
  const n = await Deno.stdin.read(lead);
  if (n === null) return "";

  const len = utf8ByteLength(lead[0]);
  if (len === 1) return decoder.decode(lead.subarray(0, 1));

  const buf = new Uint8Array(len);
  buf[0] = lead[0];
  let offset = 1;
  while (offset < len) {
    const more = await Deno.stdin.read(buf.subarray(offset));
    if (more === null) break;
    offset += more;
  }
  return decoder.decode(buf.subarray(0, offset));
}

/** Enable or disable raw mode on stdin. */
export function setRawMode(enabled: boolean): void {
  Deno.stdin.setRaw(enabled);
}

/** Register a handler for SIGINT (Ctrl-C). */
export function onInterrupt(handler: () => void): void {
  Deno.addSignalListener("SIGINT", handler);
}
