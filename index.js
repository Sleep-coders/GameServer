const http = require("http");
const webSocketServer = require("websocket").server;
const httpServer = http.createServer();
const clients = {};

httpServer.listen(8080, () => {
  console.log("im listening on 8080");
});

const wsServer = new webSocketServer({
  httpServer: httpServer,
});

wsServer.on("request", (request) => {
  const connection = request.accept(null, "*");
  console.log(request);
  connection.on("open", () => console.log("opened"));
  connection.on("close", () => console.log("close"));
  connection.on("message", () => (message) => {
    const result = JSON.parse(message);
    console.log(result);
  });

  const clientId = guid();

  clients[clientId] = {
    connection: connection,
    NickName: "osaid",
  };

  const payLoad = {
    method: "connect",
    clientId: clientId,
  };

  connection.send(JSON.stringify(payLoad));
});

/////////////////////////////////////////////////////

function S4() {
  return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

// then to call it, plus stitch in '4' in the third group
const guid = () =>
  (
    S4() +
    S4() +
    "-" +
    S4() +
    "-4" +
    S4().substr(0, 3) +
    "-" +
    S4() +
    "-" +
    S4() +
    S4() +
    S4()
  ).toLowerCase();
