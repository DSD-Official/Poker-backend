import { Socket } from "socket.io";

export enum PlayerAction {
  NONE,
  SMALL_BLIND,
  BIG_BLIND,
  CHECK,
  CALL,
  RAISE,
  ALLIN,
  FOLD,
}

export interface IPlayer {
  address: string,
  stack: number,
  betAmount: number,
  status?: PlayerAction,
  socket: Socket;
  cards?: number[],
}
