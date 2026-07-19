const decoder = new TextDecoder();

/** Read a single keypress from stdin. Assumes raw mode is active. */
export async function readKey(): Promise<string> {
  const buf = new Uint8Array(1);
  const n = await Deno.stdin.read(buf);
  if (n === null) return "";
  return decoder.decode(buf.subarray(0, n));
}

/** Enable or disable raw mode on stdin. */
export function setRawMode(enabled: boolean): void {
  Deno.stdin.setRaw(enabled);
}

/** Register a handler for SIGINT (Ctrl-C). */
export function onInterrupt(handler: () => void): void {
  Deno.addSignalListener("SIGINT", handler);
}
