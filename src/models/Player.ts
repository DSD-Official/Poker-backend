import { Socket } from "socket.io";

export enum PlayerAction {
  NONE,
  CHECK,
  CALL,
  RAISE,
  ALLIN,
  FOLD,
}

export interface IPlayer {
  address: string,
  stack: number,
  status?: PlayerAction,
  socket: Socket;
}
