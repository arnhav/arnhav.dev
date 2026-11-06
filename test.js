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
    console.log("ok");
  } finally {
    server.close();
  }
});
