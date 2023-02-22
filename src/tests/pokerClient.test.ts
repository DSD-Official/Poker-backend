import PokerService from 'services/pokerService';
import { Server } from 'socket.io';
import ioClient, { Socket } from 'socket.io-client';

describe('Socket.io server', () => {
  let pokerService: PokerService;
  let server: Server;
  let user1: Socket;

  beforeEach(() => {
    // Initialize the Socket.io server
    server = new Server();
    server.listen(5000);

    pokerService = new PokerService(server);
    user1 = ioClient("http://localhost:5000");
  });

  afterEach(() => {
    server.close();
  });

  test('user connection', (done) => {
    user1.on("connect", (() => {
      user1.emit("joinGame", {
        address: "0xRaika"
      });
      done();
    }));
  });

  test("lobbyInfo", (done) => {
    user1.on("lobbyInfo", (data) => {
      console.log(data);
      done();
    });
  });

  test("error catch", (done) => {
    user1.on("error", (msg) => {
      console.error(msg);
      done(false);
    });
  })
});
