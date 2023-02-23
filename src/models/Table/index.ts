import { Socket, Server } from "socket.io";
import { IPlayer } from "../Player";
import {
  shuffledCards,
  nextPlayerId,
  isValid,
  COUNT_DOWN,
  ANIMATION_TIME,
  ROUND_DELAY_TIME,
  numberOfPlayers,
  playersInfo,
  nullPlayer
} from "./utils";

export enum Round {
  PREFLOP,
  FLOP,
  TURN,
  RIVER,
  OVER,
}

export class Table {
  server!: Server;

  id!: number;
  name!: string;
  type!: "NL Texas Hold'em" | "Pot Limit Omaha";
  smallBlind!: number;
  bigBlind!: number;
  players: IPlayer[] = [];
  minBuyIn!: number;

  round!: Round;
  pot: number = 0;
  currentBet: number = 0;
  minRaise: number = 0;
  dealerId: number = 0;
  currentPlayerId: number = 0;
  cards: number[] = [];
  countdown!: number;
  timestamp!: number;
  status: string = "OVER";

  constructor(server: Server, id: number, name: string, type: "NL Texas Hold'em" | "Pot Limit Omaha", smallBlind: number, bigBlind: number) {
    this.server = server;
    this.id = id;
    this.name = name;
    this.type = type;
    this.smallBlind = smallBlind;
    this.bigBlind = bigBlind;
    this.minBuyIn = this.bigBlind * 10;
    this.round = Round.OVER;
    this.countdown = 1;
    for (let i = 0; i < 6; i++) this.players[i] = nullPlayer();
    this.tick();
  }

  takeSeat(player: IPlayer, position: number) {
    this.players[position] = player;
    this.dealerId = position;
    this.broadcast();
  }

  newHand() {
    console.log("new hand begins!");
    this.cards = shuffledCards();
    for (let i = 0; i < 6; i++) {
      if (isValid(this.players[i])) {
        this.players[i].cards = [this.cards.pop() ?? 0, this.cards.pop() ?? 0];
        this.players[i].betAmount = 0;
      }
    }
    this.round = Round.PREFLOP;
    this.dealerId = nextPlayerId(this.dealerId, this.players);
    this.countdown = COUNT_DOWN;
    for (let i = 0; i < 6; i++) {
      if (isValid(this.players[i])) {
        this.players[i].status = "NONE";
      }
    }
    this.status = "PREFLOP";
    this.currentPlayerId = this.dealerId;
    this.countdown = COUNT_DOWN;
    this.broadcast();
    // small blind
    setTimeout(() => {
      this.smallBlindFn();
      // big blind
      setTimeout(this.bigBlindFn, ANIMATION_TIME);
    }, ANIMATION_TIME * numberOfPlayers(this.players));
  }

  moveTurn() { // get next turn id
    this.currentPlayerId = nextPlayerId(this.currentPlayerId, this.players);

    this.countdown = COUNT_DOWN;
    // let isRoundCompleted: boolean = true;
    // for (let i = 0; i < 6; i++) {
    //   if (isValid(this.players[i])) {
    //     if (this.players[i].status != "CALL" && this.players[i].status != "CHECK")
    //       isRoundCompleted = false;
    //   }
    // }
    // if (isRoundCompleted) {
    //   this.round = (this.round + 1) % 5;
    //   for (let i = 0; i < 6; i++) {
    //     if (isValid(this.players[i])) {
    //       if (this.players[i].status != "FOLD") this.players[i].status = "NONE";
    //     }
    //   }
    //   setTimeout(() => {
    //   }, ROUND_DELAY_TIME);
    // }
  }

  stake(amount: number) {
    const player = this.players[this.currentPlayerId];
    amount = Math.min(amount, player.stack);
    player.stack -= amount;
    player.betAmount += amount;
    if (!player.stack) player.status = "ALLIN";
  }

  smallBlindFn() {
    this.status = "SMALL_BLIND";
    this.players[this.currentPlayerId].status = "SMALL_BLIND";
    this.stake(this.smallBlind);
    this.broadcast();
    this.moveTurn();
  }

  bigBlindFn() {
    this.status = "BIG_BLIND";
    this.players[this.currentPlayerId].status = "BIG_BLIND";
    this.stake(this.bigBlind);
    this.broadcast();
    this.moveTurn();
  }

  call() {
    let player = this.players[this.currentPlayerId];
    player.status = "CALL";
    this.stake(this.currentBet - player.betAmount);
    // const tableIo = this.server.to("room-" + this.id);
    // tableIo.emit("call", {
    //   playerId: this.currentPlayerId,
    // })
    this.moveTurn();
  }

  fold() {
    let player = this.players[this.currentPlayerId];
    player.status = "FOLD";
    this.moveTurn();
  }

  check() {
    let player = this.players[this.currentPlayerId];
    player.status = "CHECK";
    this.moveTurn();
  }

  allIn() {
    let player = this.players[this.currentPlayerId];
    player.status = "ALLIN";
    this.stake(player.stack - player.betAmount);
    this.moveTurn();
  }

  raise(amount: number) {
    let player = this.players[this.currentPlayerId];
    player.status = "RAISE";
    this.minRaise = amount - this.currentBet;
    this.currentBet = amount;
    this.stake(amount);
    this.moveTurn();
  }

  infoForLobby() {
    const { id, name, type, smallBlind, bigBlind, minBuyIn, } = this;
    return {
      id, name, type, smallBlind, bigBlind, minBuyIn,
      activePlayersCnt: numberOfPlayers(this.players),
    };
  }

  info = async (viewer: string = "") => {
    let data = {
      id: this.id,
      name: this.name,
      type: this.type,
      smallBlind: this.smallBlind,
      bigBlind: this.bigBlind,
      round: this.round,
      pot: this.pot,
      currentBet: this.currentBet,
      minRaise: this.minRaise,
      dealerId: this.dealerId,
      currentPlayerId: this.currentPlayerId,
      countdown: this.countdown,
      status: this.status,
      players: this.players,
    };
    data.players = await playersInfo(this.players, viewer);
    return data;
  }

  getPosition = (address: string) => {
    for (let i = 0; i < 6; i++)
      if (this.players[i].address == address) return i;
    return -1;
  }

  tick = async () => {
    this.countdown--;
    if (this.countdown <= 0) {
      switch (this.status) {
        case "PREFLOP":
        case "FLOP":
        case "TURN":
        case "RIVER":
          this.fold();
          break;
        case "OVER":
          if (numberOfPlayers(this.players) > 1) {
            this.newHand();
          } else this.countdown = 1;
          break;
        case "IDLE":
          this.fold();
          break;
      }
    }
    setTimeout(this.tick, 1000);
  }

  broadcast(channel: string = "") {
    const tableIo = this.server.to("room-" + this.id);
    this.info().then((data) => {
      tableIo.emit("tableInfo", data);
    });
  }
}
