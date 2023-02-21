import { IPlayer, PlayerAction } from "../Player";
import {
  shuffledCards,
  getNextPlayerId,
  isValid,
  COUNT_DOWN,
  ANIMATION_TIME,
} from "./utils";

export enum Round {
  PREFLOP,
  FLOP,
  TURN,
  RIVER,
  OVER,
}

export class Table {
  id!: number;
  name!: string;
  type!: "NL Texas Hold'em" | "Pot Limit Omaha";
  smallBlind!: number;
  bigBlind!: number;
  players: IPlayer[] = [];
  THRESHOLD!: number;

  round!: Round;
  pot: number = 0;
  currentBetAmount: number = 0;
  lastRaiseAmount: number = 0;
  dealerId: number = 0;
  currentPlayerId: number = 0;
  cards: number[] = [];
  countdown!: number;
  timestamp!: number;
  status: string = "IDLE";

  constructor(id: number, name: string, type: "NL Texas Hold'em" | "Pot Limit Omaha", smallBlind: number, bigBlind: number) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.smallBlind = smallBlind;
    this.bigBlind = bigBlind;
  }

  takeSeat(player: IPlayer, position: number) {
    this.players[position] = player;
    this.dealerId = position;
  }

  newHand() {
    this.cards = shuffledCards();
    for (let i = 0; i < 6; i++) {
      if (isValid(this.players[i])) {
        this.players[i].cards = [this.cards.pop() ?? 0, this.cards.pop() ?? 0];
        this.players[i].betAmount = 0;
      }
    }
    this.round = Round.PREFLOP;
    this.dealerId = getNextPlayerId(this.dealerId, this.players);
    this.countdown = COUNT_DOWN;
    for (let i = 0; i < 6; i++) {
      if (isValid(this.players[i])) {
        this.players[i].status = PlayerAction.NONE;
      }
    }
    this.currentPlayerId = this.dealerId;
    this.countdown = COUNT_DOWN;
    // small blind
    this.players[this.currentPlayerId].status = PlayerAction.SMALL_BLIND;
    this.stake(this.smallBlind);
    this.moveTurn();
    // big blind
    setTimeout(() => {
      this.players[this.currentPlayerId].status = PlayerAction.BIG_BLIND;
      this.stake(this.bigBlind);
      this.moveTurn();
    }, ANIMATION_TIME);
  }

  moveTurn() { // get next turn id
    this.currentPlayerId = getNextPlayerId(this.currentPlayerId, this.players);
    let isRoundCompleted: boolean = true;
    for (let i = 0; i < 6; i++) {
      if (isValid(this.players[i])) {
        if (this.players[i].status != PlayerAction.CALL && this.players[i].status != PlayerAction.CHECK)
          isRoundCompleted = false;
      }
    }
    if (isRoundCompleted) {
      this.round = (this.round + 1) % 5;
    } else {
    }
  }

  stake(amount: number) {
    const player = this.players[this.currentPlayerId];
    amount = Math.min(amount, player.stack);
    player.stack -= amount;
    player.betAmount += amount;
    if (!player.stack) player.status = PlayerAction.ALLIN;
  }

  call() {
    let player = this.players[this.currentPlayerId];
    player.status = PlayerAction.CALL;
    this.stake(this.currentBetAmount - player.betAmount);
    this.moveTurn();
  }

  fold() {
    let player = this.players[this.currentPlayerId];
    player.status = PlayerAction.FOLD;
    this.moveTurn();
  }

  check() {
    let player = this.players[this.currentPlayerId];
    player.status = PlayerAction.CHECK;
    this.moveTurn();
  }

  allIn() {
    let player = this.players[this.currentPlayerId];
    player.status = PlayerAction.ALLIN;
    this.stake(player.stack - player.betAmount);
    this.moveTurn();
  }

  raise(amount: number) {
    let player = this.players[this.currentPlayerId];
    player.status = PlayerAction.RAISE;
    if (amount < this.lastRaiseAmount) return "Invalid Raise!";
    this.lastRaiseAmount = amount;
    this.stake(amount);
    this.moveTurn();
  }

  run() {
    if (this.status == "IDLE") {
    }

    setTimeout(() => {
      this.run();
    }, 100);
  }
}