import { Socket } from "socket.io";

/*
  NONE,
  SMALL_BLIND,
  BIG_BLIND,
  CHECK,
  CALL,
  RAISE,
  ALLIN,
  FOLD,
*/

export interface IPlayer {
  address: string,
  stack: number,
  betAmount: number,
  status: string,
  cards?: number[],
}
