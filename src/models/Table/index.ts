import { Socket, Server } from "socket.io";
import { IPlayer } from "../Player";
const Hand = require("pokersolver").Hand;
import {
  shuffledCards,
  nextActivePlayerId,
  isValid,
  isActive,
  COUNT_DOWN,
  ANIMATION_TIME,
  ROUND_DELAY_TIME,
  numberOfPlayers,
  playersInfo,
  nullPlayer,
  numberOfActivePlayers,
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
  communityCards: number[] = [];
  countdown!: number;
  timestamp!: number;
  status: string = "OVER";
  isLockup: boolean = false;

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
    this.pot = 0;
    this.isLockup = false;
    for (let i = 0; i < 6; i++) {
      if (isValid(this.players[i])) {
        this.players[i].cards = [this.cards.pop() ?? 0, this.cards.pop() ?? 0];
        this.players[i].betAmount = 0;
      }
    }
    this.communityCards = [];
    for (let i = 0; i < 6; i++) {
      if (isValid(this.players[i])) {
        this.players[i].status = "NONE";
      }
    }
    this.dealerId = nextActivePlayerId(this.dealerId, this.players);

    this.preflop();
  }

  checkRoundResult() {
    let cnt = 0;
    for (let i = 0; i < 6; i++) {
      if (isActive(this.players[i])) {
        if (this.players[i].betAmount != this.currentBet && this.players[i].status != "ALLIN")
          return "RUNNING";
        cnt++;
      }
    }
    if (cnt < 2) return "LOCKUP";
    for (let i = 0; i < 6; i++) {
      if (isActive(this.players[i])) {
        if (this.players[i].status != "CHECK")
          return "RUNNING";
      }
    }
    return "ENDED";
  }

  moveTurn() {
    this.countdown = COUNT_DOWN;
    this.broadcast();
    setTimeout(() => {
      if (!numberOfActivePlayers(this.players)) console.log("what a bug on", this.id);
      this.currentPlayerId = nextActivePlayerId(this.currentPlayerId, this.players);

      if (numberOfActivePlayers(this.players) <= 1) { // win the pot uncontested
        if (!numberOfActivePlayers(this.players)) console.log("what a bug on", this.id);
        this.over();
        return;
      }
      let roundResult = this.checkRoundResult();
      if (roundResult != "RUNNING") {
        this.round = (this.round + 1) % 5;
        if (roundResult == "ENDED") {
          for (let i = 0; i < 6; i++) {
            if (isActive(this.players[i])) {
              if (this.players[i].status != "ALLIN") {
                this.players[i].status = "NONE";
              }
            }
          }
        }
        switch (this.round) {
          case Round.FLOP:
            this.flop();
            break;
          case Round.TURN:
            this.turn();
            break;
          case Round.RIVER:
            this.river();
            break;
          case Round.OVER:
            this.over();
            break;
        }
        if (roundResult == "LOCKUP") {
          console.log("locked up on", this.id);
          this.isLockup = true;
          setTimeout(() => {
            this.moveTurn();
          }, ROUND_DELAY_TIME);
        }
      }
    }, 1000);
  }

  preflop() {
    this.round = Round.PREFLOP;
    this.countdown = COUNT_DOWN;
    this.status = "PREFLOP";
    this.currentPlayerId = nextActivePlayerId(this.dealerId, this.players);
    this.countdown = COUNT_DOWN;
    this.broadcast();
    // small blind
    setTimeout(() => {
      this.smallBlindFn();
      // big blind
      setTimeout(() => { this.bigBlindFn() }, 1000);
      // }, ANIMATION_TIME * numberOfPlayers(this.players));
    }, ANIMATION_TIME * 2 * numberOfPlayers(this.players));
  }

  flop() {
    this.status = "FLOP";
    this.communityCards.push(this.cards.pop() ?? 0);
    this.communityCards.push(this.cards.pop() ?? 0);
    this.communityCards.push(this.cards.pop() ?? 0);
    this.broadcast();
  }

  turn() {
    this.status = "TURN";
    this.communityCards.push(this.cards.pop() ?? 0);
    this.broadcast();
  }

  river() {
    this.status = "RIVER";
    this.communityCards.push(this.cards.pop() ?? 0);
    this.broadcast();
  }

  over() {

  }

  stake(amount: number) {
    const player = this.players[this.currentPlayerId];
    amount = Math.min(amount, player.stack);
    player.stack -= amount;
    player.betAmount += amount;
    this.pot += amount;
    if (!player.stack) player.status = "ALLIN";
  }

  smallBlindFn() {
    console.log("small blind on ", this.id);
    this.status = "BET";
    this.players[this.currentPlayerId].status = "SMALL_BLIND";
    this.stake(this.smallBlind);
    this.moveTurn();
  }

  bigBlindFn() {
    console.log("big blind on ", this.id);
    this.status = "BET";
    this.players[this.currentPlayerId].status = "BIG_BLIND";
    this.stake(this.bigBlind);
    this.moveTurn();
  }

  call() {
    console.log("call on", this.id);
    this.status = "BET";
    let player = this.players[this.currentPlayerId];
    player.status = "CALL";
    this.stake(this.currentBet - player.betAmount);
    this.moveTurn();
  }

  fold() {
    console.log("fold on", this.id);
    this.status = "FOLD";
    let player = this.players[this.currentPlayerId];
    player.status = "FOLD";
    this.moveTurn();
  }

  check() {
    console.log("check on", this.id);
    this.status = "CHECK";
    let player = this.players[this.currentPlayerId];
    player.status = "CHECK";
    this.moveTurn();
  }

  allIn() {
    console.log("allin on", this.id);
    this.status = "ALLIN";
    let player = this.players[this.currentPlayerId];
    player.status = "ALLIN";
    this.stake(player.stack - player.betAmount);
    this.moveTurn();
  }

  raise(amount: number) {
    this.status = "BET";
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
      communityCards: this.communityCards,
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
    if (this.countdown < 0) {
      switch (this.status) {
        case "PREFLOP":
        case "FLOP":
        case "TURN":
        case "RIVER":
          console.log("tick error while community action");
          break;
        case "OVER":
          if (numberOfPlayers(this.players) > 1) {
            this.newHand();
          } else this.countdown = 2;
          break;
        case "IDLE":
          // this.fold();
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
