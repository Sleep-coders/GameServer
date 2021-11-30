const http = require("http");
const webSocketServer = require("websocket").server;
const httpServer = http.createServer();
const clients = {};
const games = {};
let counter = 0;

httpServer.listen(8080, () => {
  console.log("im listening on 8080");
});

const wsServer = new webSocketServer({
  httpServer: httpServer,
});

wsServer.on("request", async (request) => {
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
  console.log("Client Connected ========");
  console.log();
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

      const player = {
        playerID: clientID,
        clientName: clientName,
        playerPoints: 0,
        answers: {},
      };
      games[gameID].players.push(player);

      const payLoad = {
        method: "create",
        game: games[gameID],
      };
      console.log(payLoad);
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
      clients[clientID].connection.send(JSON.stringify(payLoad));
    }

    // Verify Password & Joining a game
    if (result.method === "join") {
      const clientID = result.clientId;
      const clientName = result.clientName;
      const gameID = result.gameId;
      const game = games[gameID];
      const gamePassword = result.gamePassword;

      if (gamePassword != game.gamePassword) {
        const payLoad = {
          method: "join",
          passCheck: false,
        };
        clients[clientID].connection.send(JSON.stringify(payLoad));
      } else {
        if (
          game.players.length <= game.playersNumber &&
          game.gameStarted == false
        ) {
          const player = {
            playerID: clientID,
            clientName: clientName,
            playerPoints: 0,
            answers: {},
          };

          game.players.push(player);

          const payLoadClient = {
            method: "join",
            passCheck: true,
            game: game,
          };

          const payLoadPlayers = {
            method: "update",
            hostID: game.hostID,
            game: game,
          };

          clients[clientID].connection.send(JSON.stringify(payLoadClient));

          game.players.forEach((player) => {
            if (player.playerID != clientID) {
              clients[player.playerID].connection.send(
                JSON.stringify(payLoadPlayers)
              );
            }
          });
        } else {
          const payLoad = {
            method: "join",
            passCheck: "trueButFalse",
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

      players.forEach((player) =>
        clients[player.playerID].connection.send(JSON.stringify(payLoad))
      );
    }

    // game logic processing
    if (result.method == "sendGameLogicToServer") {
      const { human, animal, plant, country, thing, gameID, clientID } = result;
      const game = games[gameID];

      game.players.forEach((player) => {
        if (player.playerID == clientID) {
          player.answers = {
            human: human,
            plant: plant,
            animal: animal,
            country: country,
            thing: thing,
          };
        }
      });

      const payLoad = {
        method: "sendGameLogicToServer",
        hostID: game.hostID,
        game: game,
      };
      counter++;
      if (counter == game.players.length) {
        game.players.forEach((player) => {
          clients[player.playerID].connection.send(JSON.stringify(payLoad));
        });
        counter = 0;
      }
    }

    //Adding Point to the user
    if (result.method == "addPointsToTheUsers") {
      const gameID = result.gameID;
      const game = games[gameID];
      const playersGrade = result.gradingResults;
      game.gameStarted = false;

      game.players.forEach((player) => {
        playersGrade.forEach((winingPlayer) => {
          if (player.playerID == winingPlayer.clientID) {
            player.playerPoints += winingPlayer.points;
          }
        });
      });

      const payLoad = {
        method: "addPointsToTheUsers",
        hostID: game.hostID,
        game: game,
      };

      game.players.forEach((player) => {
        clients[player.playerID].connection.send(JSON.stringify(payLoad));
      });
    }

    //End game for all players
    if (result.method === "endGameForAll") {
      const gameID = result.gameId;
      const game = games[gameID];

      const payLoad = {
        method: "endGameForAll",
        hostID: game.hostID,
      };

      game.players.forEach((player) => {
        clients[player.playerID].connection.send(JSON.stringify(payLoad));
      });
    }

    //End game for one player
    if (result.method === "endGameForOne") {
      const clientID = result.clientId;
      const gameID = result.gameId;
      const game = games[gameID];

      game.players = game.players.filter(
        (player) => player.playerID != clientID
      );

      const payLoad = {
        method: "endGameForOne",
        hostID: game.hostID,
        clientID: clientID,
        game: game,
      };

      clients[clientID].connection.send(JSON.stringify(payLoad));
      game.players.forEach((player) => {
        clients[player.playerID].connection.send(JSON.stringify(payLoad));
      });
    }
  });

  /////////////////////////////////////////////////
  // Closing Connection to the server
  connection.on("close", () => console.log("connection closed"));
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
