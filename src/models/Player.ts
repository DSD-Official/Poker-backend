/*
  NONE,
  SMALL_BLIND,
  BIG_BLIND,
  BET,
  CHECK,
  CALL,
  RAISE,
  ALLIN,
  FOLD,

  LEAVE,
  JOIN,
*/

export interface IPlayer {
  address: string,
  stack: number,
  betAmount: number,
  status: string,
  position: number,
  cards: number[],
}
