const http = require("http");

const server = http.createServer((req, res) => {
    res.end("ok\n");
});

server.listen(4000, () => {
    console.log("test server listening on http://localhost:4000");
});
