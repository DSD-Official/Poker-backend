import { Socket } from "socket.io";

export enum PlayerAction {
  NONE = "NONE",
  SMALL_BLIND = "SMALL_BLIND",
  BIG_BLIND = "BIG_BLIND",
  CHECK = "CHECK",
  CALL = "CALL",
  RAISE = "RAISE",
  ALLIN = "ALLIN",
  FOLD = "FOLD",
}

export interface IPlayer {
  address: string,
  stack: number,
  betAmount: number,
  status?: PlayerAction,
  socket: Socket;
  cards?: number[],
}
