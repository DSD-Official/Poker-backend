import { IPlayer } from "./Player";

export enum Round {
  PREFLOP,
  FLOP,
  TURN,
  RIVER,
}

export interface ITable {
  id: number,
  name: string,
  type: "NL Texas Hold'em" | "Pot Limit Omaha",
  smallBlind: number,
  bigBlind: number,
  players: IPlayer[],

  round: Round,
  pot: number,
  currentBetAmount: number,
  lastRaiseAmount: number,
  dealerId: number,
  currentPlayerId: number,
  cards?: number[],
  timestamp: number,
}
