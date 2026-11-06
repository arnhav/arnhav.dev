const http = require("http");
const fs = require("fs");
const path = require("path");

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".pdf": "application/pdf", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain" };

// Only files present in public/ at boot are served, so no request path can escape the folder.
const dir = path.join(__dirname, "public");
const files = new Map(fs.readdirSync(dir).map((f) => ["/" + f, fs.readFileSync(path.join(dir, f))]));

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x").pathname;
  const name = url === "/" ? "/index.html" : url;
  const body = files.get(name);
  if (!body) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    return res.end("bash: " + url + ": No such file or directory\n");
  }
  res.writeHead(200, {
    "Content-Type": TYPES[path.extname(name)] || "application/octet-stream",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(req.method === "HEAD" ? undefined : body);
});

if (require.main === module) server.listen(process.env.PORT || 3000, () => console.log("listening on " + (process.env.PORT || 3000)));
module.exports = server;
