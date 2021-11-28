const http = require("http");
const webSocketServer = require("websocket").server;
const httpServer = http.createServer();
const clients = {};
const games = {};

httpServer.listen(8080, () => {
  console.log("im listening on 8080");
});

const wsServer = new webSocketServer({
  httpServer: httpServer,
});

wsServer.on("request", (request) => {
  const connection = request.accept(null, request.origin);

  // Connecting to the server
  const clientId = guid();

  clients[clientId] = {
    connection: connection,
  };
  const payLoad = {
    method: "connect",
    clientId: clientId,
  };
  connection.send(JSON.stringify(payLoad));

  /////////////////////////////////////////////////
  // MESSAGES CLIENT REQUESTS
  connection.on("message", (message) => {
    const result = JSON.parse(message.utf8Data);
    console.log(result);

    // Creating a game
    if (result.method === "create") {
      const clientID = result.clientId;
      const clientEmail = result.clientEmail;
      const clientName = result.clientName;
      const gamePassword = result.gamePassword;
      const playersNumber = result.playersNumber;
      const gameID = guid();

      games[gameID] = {
        gameID: gameID,
        playersNumber: playersNumber,
        hostID: clientID,
        hostName: clientName,
        gamePassword: gamePassword,
        roomMessages: [],
        players: [],
        gameStarted: false,
      };

      const payLoad = {
        method: "create",
        game: games[gameID],
      };

      clients[clientID].connection.send(JSON.stringify(payLoad));
    }

    // Verify The Game ID
    if (result.method === "verify") {
      const clientID = result.clientId;
      const gameID = result.gameId;
      const payLoad = {
        method: "verify",
        check: null,
      };

      if (games[gameID] != null) {
        payLoad.check = true;
      } else {
        payLoad.check = false;
      }
      clients[clientID] = connection.send(JSON.stringify(payLoad));
    }

    // Verify Password & Joining a game
    if (result.method === "join") {
      const clientID = result.clientId;
      const clientName = result.clientName;
      const gameID = result.gameId;
      const gamePassword = result.gamePassword;

      if (gamePassword != game.gamePassword) {
        const payLoad = {
          method: "join",
          passCheck: false,
        };
        clients[clientID].connection.send(JSON.stringify(payLoad));
      } else {
        const game = games[gameID];
        if (
          game.players.length <= games.playersNumber &&
          game.gameStarted == false
        ) {
          const player = {
            playerID: clientID,
            clientName: clientName,
            playerPoints: 0,
          };

          game.players.push(player);

          const payLoad = {
            method: "join",
            passCheck: true,
            game: game,
          };
          clients[clientID].connection.send(JSON.stringify(payLoad));
        } else {
          const payLoad = {
            method: "join",
            game: games[gameID],
          };
          clients[clientID].connection.send(JSON.stringify(payLoad));
        }
      }
    }

    //Start game for all players
    if (result.method === "startGameForAll") {
      const gameID = result.gameId;
      const game = games[gameID];
      const hostID = game.hostID;
      const players = game.players;
      game.gameStarted = true;

      const alphabets = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const random = Math.floor(Math.random() * (alphabets.length - 1));
      const randomChar = alphabets[random];

      const payLoad = {
        method: "startGameForAll",
        hostID: hostID,
        randomChar: randomChar,
      };

      clients[hostID].connection.send(JSON.stringify(payLoad));
      players.forEach((player) =>
        clients[player].connection.send(JSON.stringify(payLoad))
      );
    }

    //End game for all players

    if (result.method === "endGameForAll") {
      const gameID = result.gameId;
      const game = games[gameID];
      const hostID = game.hostID;
      const players = game.players;
      game.gameStarted = false;

      const payLoad = {
        method: "endGameForAll",
      };

      clients[hostID].connection.send(JSON.stringify(payLoad));
      players.forEach((player) =>
        clients[player].connection.send(JSON.stringify(payLoad))
      );
    }
  });

  /////////////////////////////////////////////////
  // Closing Connection to the server
  connection.on("close", () => console.log("close"));
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
