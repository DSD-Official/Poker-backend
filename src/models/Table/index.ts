import { Socket, Server } from "socket.io";
import { IPlayer } from "../Player";
const Hand = require("pokersolver").Hand;
import {
  shuffledCards,
  nextActivePlayerId,
  isValid,
  isActive,
  COUNT_DOWN,
  ANIMATION_DELAY_TIME,
  numberOfPlayers,
  playersInfo,
  nullPlayer,
  numberOfActivePlayers,
  numbersToCards,
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
  status: string = "WAIT";
  isLockup: boolean = false;
  leaveList: number[] = [];
  plusBet: number = 0; // for last action (currentBet - player.betAmount)
  prizes: number[] = [];
  lastNewPlayerId: number = -1;

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
    this.test();
  }

  takeSeat(player: IPlayer, position: number) {
    player.status = "JOIN";
    this.players[position] = player;
    this.lastNewPlayerId = position;
    this.broadcast();
    if (this.status == "WAIT") this.newHand();
  }

  leaveSeat(pos: number) {
    let player = this.players[pos];
    if (isValid(player)) {
      player.status = "DISCONNECT";
    }
  }

  sitOut() {
  }

  newHand() {
    if (numberOfPlayers(this.players) < 2) {
      console.log("not enough people to start the game");
      return;
    }
    console.log("new hand begins!");

    for (let i = 0; i < 6; i++)
      if (this.players[i].status == "DISCONNECT") this.players[i] = nullPlayer();
    this.cards = shuffledCards();
    this.pot = 0;
    this.isLockup = false;
    this.minRaise = this.bigBlind;
    for (let i = 0; i < 6; i++) {
      if (isValid(this.players[i])) {
        this.players[i].cards = [this.cards.pop() ?? 0, this.cards.pop() ?? 0];
        this.players[i].betAmount = 0;
        this.players[i].totalBet = 0;
      }
    }
    this.communityCards = [];
    for (let i = 0; i < 6; i++) {
      if (isValid(this.players[i])) {
        this.players[i].status = "NONE";
      }
    }
    if (this.lastNewPlayerId != -1) this.dealerId = this.lastNewPlayerId;
    this.dealerId = nextActivePlayerId(this.dealerId, this.players);
    this.lastNewPlayerId = -1;

    this.preflop();
  }

  checkRoundResult() {
    let cnt = 0;
    for (let i = 0; i < 6; i++) {
      if (isActive(this.players[i])) {
        cnt += Number(this.players[i].status != "ALLIN");
      }
    }
    if (cnt < 2) return "LOCKUP";
    for (let i = 0; i < 6; i++) {
      if (isActive(this.players[i])) {
        if (this.players[i].betAmount != this.currentBet && this.players[i].status != "ALLIN")
          return "RUNNING";
        if (this.players[i].status == "NONE")
          return "RUNNING";
      }
    }
    return "ENDED";
  }

  moveTurn() {
    this.countdown = COUNT_DOWN;
    this.broadcast();
    setTimeout(() => {
      this.currentPlayerId = nextActivePlayerId(this.currentPlayerId, this.players);
      if (!numberOfActivePlayers(this.players)) console.log("what a bug on", this.id);

      if (numberOfActivePlayers(this.players) <= 1) { // win the pot uncontested
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
          }, ANIMATION_DELAY_TIME);
        } else {
          setTimeout(() => {
            // pot and bet update
            for (let i = 0; i < 6; i++) {
              this.pot += this.players[i].betAmount;
              this.players[i].totalBet += this.players[i].betAmount;
              this.players[i].betAmount = 0;
            }
            this.minRaise = this.bigBlind;
            this.currentBet = 0;
            this.status = "IDLE";
            this.currentPlayerId = nextActivePlayerId(this.dealerId, this.players);
            this.broadcast();
          }, ANIMATION_DELAY_TIME);
        }
      }
      else {
        this.status = "IDLE";
        if (!this.status.includes("BLIND")) this.broadcast();
      }
    }, ANIMATION_DELAY_TIME);
  }

  preflop() {
    this.round = Round.PREFLOP;
    this.countdown = COUNT_DOWN;
    this.status = "PREFLOP";
    this.broadcast();
    // small blind
    setTimeout(() => {
      this.currentPlayerId = nextActivePlayerId(this.dealerId, this.players);
      this.smallBlindFn();
      // big blind
      setTimeout(() => { this.bigBlindFn() }, ANIMATION_DELAY_TIME);
    }, ANIMATION_DELAY_TIME * numberOfActivePlayers(this.players));
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
    let players = this.players;
    let earnings = [0, 0, 0, 0, 0, 0];
    console.log(this.players.map(player => player.totalBet));
    console.log(this.players.map(player => player.betAmount));
    for (let i = 0; i < 6; i++)
      if (isValid(players[i]))
        console.log(players[i].cards, numbersToCards(players[i].cards.concat(this.communityCards)));
    while (numberOfActivePlayers(players)) {
      let hands = [], arr = [];
      for (let i = 0; i < 6; i++) {
        if (isActive(players[i])) {
          hands[i] = Hand.solve(
            numbersToCards(players[i].cards.concat(this.communityCards)));
          arr.push(hands[i]);
        }
      }
      let winnners = Hand.winners(arr);
      let order = [];
      for (let i = 0; i < 6; i++) {
        if (winnners.includes(hands[i])) order.push(i);
      }
      console.log(order);
      order.sort((a, b) => players[a].totalBet - players[b].totalBet);
      for (let cur of order) {
        let prize = 0, curAmount = players[cur].totalBet;
        for (let i = 0; i < 6; i++) {
          prize += Math.min(curAmount, players[i].totalBet);
          players[i].totalBet -= Math.min(curAmount, players[i].totalBet);
        }
        order.forEach(i => {
          let v = Math.floor(prize / order.length);
          players[i].stack += v;
          earnings[i] += v;
        })
        players[cur].status = "FOLD";
      }
    }
    this.status = "OVER";
    this.prizes = earnings;
    this.broadcast();

    setTimeout(() => {
      for (let i = 0; i < 6; i++)
        if (!players[i].stack) players[i].status = "DISCONNECT";
      this.newHand();
    }, ANIMATION_DELAY_TIME * 5);
  }

  stake(amount: number) {
    const player = this.players[this.currentPlayerId];
    amount = Math.min(amount, player.stack);
    player.stack -= amount;
    player.betAmount += amount;
    this.plusBet = amount;
    if (!player.stack) player.status = "ALLIN";
  }

  smallBlindFn() {
    console.log("small blind on ", this.id);
    this.status = "SMALL_BLIND";
    this.players[this.currentPlayerId].status = "SMALL_BLIND";
    this.stake(this.smallBlind);
    this.moveTurn();
  }

  bigBlindFn() {
    console.log("big blind on ", this.id);
    this.status = "BIG_BLIND";
    this.players[this.currentPlayerId].status = "BIG_BLIND";
    this.currentBet = this.bigBlind;
    this.stake(this.bigBlind);
    this.moveTurn();
    setTimeout(() => {
      for (let i = 0; i < 6; i++)
        if (isActive(this.players[i])) this.players[i].status = "NONE";
    }, ANIMATION_DELAY_TIME);
  }

  call() {
    console.log("call on", this.id);
    this.status = "CALL";
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
    this.status = "RAISE";
    let player = this.players[this.currentPlayerId];
    player.status = "RAISE";
    this.minRaise = player.betAmount + amount - this.currentBet;
    console.log(this.minRaise);
    this.currentBet = amount + player.betAmount;
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
      communityCards: this.communityCards,
      plusBet: this.plusBet,
      players: this.players,
    };
    // if (data.status.includes("BLIND") || data.status == "CALL" || data.status == "RAISE" || data.status == "ALLIN") {
    //   data.status = "BET";
    // }
    data.players = await playersInfo(this.players, this.round == Round.OVER ? "all" : viewer);
    data.players.forEach((player, index) => {
      if (isValid(player)) {
        if (index != this.currentPlayerId) player.status = "IDLE";
        else if (this.status == "IDLE") player.status = "ACTIVE";
        if (player.status.includes("BLIND") || player.status == "CALL" || player.status == "RAISE" || player.status == "ALLIN") player.status = "BET";
        player.prize = this.prizes[index];
      }
    })
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
          break;
        case "IDLE":
          // this.fold();
          break;
      }
    }
    setTimeout(this.tick, 1000);
  }

  broadcast(channel: string = "") {
    // console.log("-- broadcast on", this.id);
    console.log(this.status, this.currentPlayerId);
    console.log(this.players.map(player => player.status));

    this.server.in("room-" + this.id).fetchSockets().then((sockets) => {
      for (let socket of sockets) {
        let viewer = "";
        this.players.forEach(player => {
          if (player.socket?.id == socket.id) viewer = player.address;
        });
        this.info(viewer).then((data) => {
          socket.emit("tableInfo", data);
        });
      }
    });
  }

  getPlayerPosition(socket: Socket) {
    for (let i = 0; i < 6; i++) {
      if (this.players[i].socket?.id == socket.id)
        return i;
    }
    return -1;
  }

  isSocketOfPlayer(socket: Socket) {
    return this.getPlayerPosition(socket) > -1;
  }

  numberOfPlayers() {
    return numberOfPlayers(this.players);
  }
  test() {
  }
}
