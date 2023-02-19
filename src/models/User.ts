import { Socket } from "socket.io";

export interface IUser {
  address: string,
  name?: string,
  balance?: number,
  avatarId?: number,
  socket?: Socket,
}
