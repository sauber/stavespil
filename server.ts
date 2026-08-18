import { join } from "jsr:@std/path@^1";

const DIST = join(Deno.cwd(), "dist");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function mime(path: string): string {
  const i = path.lastIndexOf(".");
  return MIME[path.slice(i)] ?? "application/octet-stream";
}

async function serveFile(path: string): Promise<Response> {
  try {
    const data = await Deno.readFile(join(DIST, path));
    return new Response(data, { headers: { "content-type": mime(path) } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

Deno.serve((req) => {
  const { pathname } = new URL(req.url);

  if (/^\/round\/\d+/.test(pathname)) {
    return serveFile("round.html");
  }

  const file = pathname === "/" ? "index.html" : decodeURIComponent(pathname).slice(1);
  return serveFile(file);
});
