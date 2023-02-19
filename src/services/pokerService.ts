import { Server } from "socket.io";

import { IPoker } from "models/Poker";
import { ITable } from "models/Table";
import { logger } from "../helpers";

export default class Poker implements IPoker {
  public tables: ITable[] = [];
  private io!: Server;

  constructor(io: Server) {
    this.io = io;

    logger.info("Poker service started");
  }
}
