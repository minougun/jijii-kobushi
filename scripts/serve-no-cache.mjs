import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.cwd());
const preferredPort = Number(process.argv[2] ?? 4188);
const fallbackPorts = [preferredPort, 4173, 4174, 4189].filter((port, index, ports) => ports.indexOf(port) === index);

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".m4v": "video/mp4",
  ".mjs": "text/javascript; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
  ".webm": "video/webm",
};

function resolveRequestPath(url) {
  const parsed = new URL(url, "http://localhost");
  const decodedPath = decodeURIComponent(parsed.pathname);
  const cleanPath = normalize(decodedPath).replace(/^(\.\.[/\\])+/, "");
  const requested = resolve(join(root, cleanPath));
  if (!requested.startsWith(root)) return null;
  if (!existsSync(requested)) return null;
  const stats = statSync(requested);
  if (stats.isDirectory()) return resolve(join(requested, "index.html"));
  return requested;
}

function noCacheHeaders(filePath) {
  const ext = extname(filePath);
  return {
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    Expires: "0",
    Pragma: "no-cache",
    "Content-Type": MIME_TYPES[ext] ?? "application/octet-stream",
  };
}

function parseRange(rangeHeader, size) {
  if (!rangeHeader) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
  if (!match) return "invalid";

  const [, rawStart, rawEnd] = match;
  if (!rawStart && !rawEnd) return "invalid";

  if (!rawStart) {
    const suffixLength = Number(rawEnd);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return "invalid";
    return {
      start: Math.max(size - suffixLength, 0),
      end: size - 1,
    };
  }

  const start = Number(rawStart);
  const end = rawEnd ? Number(rawEnd) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) {
    return "invalid";
  }

  return {
    start,
    end: Math.min(end, size - 1),
  };
}

function handleRequest(request, response) {
  const filePath = resolveRequestPath(request.url ?? "/");
  if (!filePath || !existsSync(filePath)) {
    response.writeHead(404, {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    });
    response.end("not found");
    return;
  }

  const stats = statSync(filePath);
  const headers = noCacheHeaders(filePath);
  const range = parseRange(request.headers.range, stats.size);

  if (range === "invalid") {
    response.writeHead(416, {
      ...headers,
      "Content-Range": `bytes */${stats.size}`,
    });
    response.end();
    return;
  }

  if (range) {
    const contentLength = range.end - range.start + 1;
    response.writeHead(206, {
      ...headers,
      "Content-Length": contentLength,
      "Content-Range": `bytes ${range.start}-${range.end}/${stats.size}`,
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    createReadStream(filePath, range).pipe(response);
    return;
  }

  response.writeHead(200, {
    ...headers,
    "Content-Length": stats.size,
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(filePath).pipe(response);
}

function listenOn(portIndex = 0) {
  const port = fallbackPorts[portIndex];
  const server = createServer(handleRequest);
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && portIndex + 1 < fallbackPorts.length) {
      listenOn(portIndex + 1);
      return;
    }
    throw error;
  });
  server.listen(port, () => {
    console.log(`no-cache server: http://localhost:${port}/`);
  });
}

listenOn();
