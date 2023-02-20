import { IPlayer, PlayerAction } from "./Player";

export enum Round {
  PREFLOP,
  FLOP,
  TURN,
  RIVER,
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
  cards?: number[];
  cooldown!: number;
  timestamp!: number;

  constructor(id: number, name: string, type: "NL Texas Hold'em" | "Pot Limit Omaha", smallBlind: number, bigBlind: number) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.smallBlind = smallBlind;
    this.bigBlind = bigBlind;
  }

  takeSeat(player: IPlayer, position: number) {
    this.players[position] = player;
  }
}