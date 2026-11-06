const assert = require("assert");
const server = require("./server");

server.listen(0, async () => {
  const base = "http://localhost:" + server.address().port;
  const get = (p) => fetch(base + p);
  try {
    assert.equal((await get("/")).status, 200);
    assert.match(await (await get("/")).text(), /guest@arnhav\.dev/);
    assert.equal((await get("/nope")).status, 404);
    assert.equal((await get("/../server.js")).status, 404);
    assert.equal((await get("/%2e%2e/server.js")).status, 404);

    const cli = await fetch(base + "/", { headers: { "User-Agent": "curl/8.7.1" } });
    const text = await cli.text();
    assert.match(cli.headers.get("content-type"), /^text\/plain/);
    assert.match(text, /Meritize/);
    assert.match(text, /https:\/\/github\.com\/arnhav/);
    assert.doesNotMatch(text, /<[a-z\/]|&nbsp;|&amp;/); // no leftover tags or entities
    for (const line of text.replace(/\x1b\[[\d;]*m/g, "").split("\n")) assert.ok(line.length <= 80, "line over 80 cols: " + line);
    console.log("ok");
  } finally {
    server.close();
  }
});
