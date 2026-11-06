const http = require("http");
const fs = require("fs");
const path = require("path");

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".pdf": "application/pdf", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain" };

// Only files present in public/ at boot are served, so no request path can escape the folder.
const dir = path.join(__dirname, "public");
const files = new Map(fs.readdirSync(dir).map((f) => ["/" + f, fs.readFileSync(path.join(dir, f))]));

// `curl arnhav.dev` gets a coloured plain-text version, built from the same HTML so content lives in one place.
const CLI = /^(curl|wget|httpie|xh)\//i;
const ESC = (code) => `\x1b[${code}m`, RESET = ESC(0);
const visible = (s) => s.replace(/\x1b\[[\d;]*m/g, "");

function wrap(line, width = 80) {
  if (visible(line).length <= width) return line;
  const lead = line.match(/^\s*/)[0];
  const indent = " ".repeat(visible(line).match(/^\s*(- )?/)[0].length);
  const lines = [];
  let cur = lead;
  for (const word of line.trimStart().split(" ")) {
    if (cur.trim() && visible(cur).length + 1 + visible(word).length > width) { lines.push(cur); cur = indent + word; }
    else cur += (cur.trim() ? " " : "") + word;
  }
  return [...lines, cur].join("\n");
}

function toText(html) {
  const main = html.match(/<main id="content">([\s\S]*)<\/main>/)[1].replace(/<!--[\s\S]*?-->/g, "");
  const banner = main.match(/<pre[^>]*>\n?([\s\S]*?)<\/pre>/)[1];
  const body = [...main.matchAll(/<section data-cmd="(\w+)"[^>]*>([\s\S]*?)<\/section>/g)]
    .filter((m) => m[1] !== "banner")
    .map((m) => m[2])
    .join("")
    .replace(/\s+/g, " ")
    .replace(/<h2>(.*?)<\/h2>/g, `\n\n${ESC("1;32")}$1${RESET}`)
    .replace(/<\/ul>/g, "\n")
    .replace(/<a href="([^"]+)">(.*?)<\/a>/g, (_, href, text) => (href.includes(text) ? ESC("4;34") + href + RESET : `${text} ${ESC(2)}(${href})${RESET}`))
    .replace(/<span class="warn">(.*?)<\/span>/g, `${ESC(33)}$1${RESET}`)
    .replace(/<p class="dim">(.*?)<\/p>/g, `\n${ESC(2)}$1${RESET}\n`)
    .replace(/<span class="dim">(.*?)<\/span>/g, `${ESC(2)}$1${RESET}`)
    .replace(/<li>/g, "\n  - ")
    .replace(/<br>/g, "\n    ")
    .replace(/<p[^>]*>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
    .split("\n").map((l) => wrap(l.trimEnd())).join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return `\n${ESC(32)}${banner}${RESET}\n${body}\n\n${ESC(2)}Interactive version: https://arnhav.dev${RESET}\n\n`;
}

const indexText = Buffer.from(toText(files.get("/index.html").toString()));

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x").pathname;
  const name = url === "/" ? "/index.html" : url;
  const cli = name === "/index.html" && CLI.test(req.headers["user-agent"] || "");
  const body = cli ? indexText : files.get(name);
  if (!body) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    return res.end("bash: " + url + ": No such file or directory\n");
  }
  res.writeHead(200, {
    "Content-Type": cli ? "text/plain; charset=utf-8" : TYPES[path.extname(name)] || "application/octet-stream",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    ...(name === "/index.html" && { Vary: "User-Agent" }),
  });
  res.end(req.method === "HEAD" ? undefined : body);
});

if (require.main === module) server.listen(process.env.PORT || 3000, () => console.log("listening on " + (process.env.PORT || 3000)));
module.exports = server;
