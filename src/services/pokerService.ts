import { Server, Socket } from "socket.io";

import { Table } from "../models/Table";
import { IUser } from "../models/User";
import { IPlayer } from "../models/Player";
import { userService } from "./userService";
import { logger } from "../helpers";

export default class PokerService {
  private io!: Server;
  public tables: Table[] = [];
  public users: Record<string, IUser> = {};

  constructor(io: Server) {
    this.io = io;
    this.buildConnection();

    logger.info("Poker game service started");
  }

  buildConnection = () => {
    this.io.on("connection", (socket: Socket) => {
      this.sendMessage(socket, "hello");

      socket.on("hello", (data) => this.newConnection(socket, data));
      socket.on("getAllTables", () => this.sendTablesDetail(socket));
      socket.on("createTable", (data) => this.createTable(socket, data));
      socket.on("takeSeat", (data) => this.takeSeat(socket, data));
      socket.on("watchTable", (data) => this.watchTable(socket, data));
      socket.on("leaveTable", (data) => this.leaveTable(socket, data));
      socket.on("bet", (data) => this.bet(socket, data));
      socket.on("fold", (data) => this.fold(socket, data));
      socket.on("call", (data) => this.call(socket, data));
      socket.on("raise", (data) => this.raise(socket, data));
    });
  }

  newConnection = async (socket: Socket, { address }: { address: string }) => {
    console.log("connection from", address);

    const user = await userService.getUser(address);
    this.users[address] = user;
    this.sendMessage(socket, "userInfo", {
      address: user.address,
      name: user.name,
      balance: user.balance,
      avatarUrl: user.avatarUrl,
    })
  }

  sendTablesDetail = (socket: Socket) => {
    this.sendMessage(socket, "allTables", this.tables);
  }

  createTable = async (socket: Socket, data: any) => {
    const { address, name, type, smallBlind, bigBlind, startChipAmount } = data;
    const user = await userService.getUser(address);

    if (user.balance < startChipAmount || startChipAmount < bigBlind * 10) {
      this.sendMessage(socket, "error", "Not enough chips to create the table");
      return;
    }

    let currentTableId = this.tables.length;
    this.tables.push(new Table(
      currentTableId,
      name,
      type,
      smallBlind,
      bigBlind,
    ));

    this.takeSeat(socket, {
      address,
      tableId: currentTableId,
      position: 0,
      startChipAmount,
    })
  }

  watchTable = async (socket: Socket, data: any) => {
    const { address, tableId } = data;
    if (!address || !tableId || tableId >= this.tables.length) {
      this.sendMessage(socket, "error", "Invalid data");
    }
    socket.join("room-" + tableId);
  }

  takeSeat = async (socket: Socket, data: any) => {
    const { address, tableId, position, startChipAmount } = data;
    if (!data.address || !data.tableId || data.tableId >= this.tables.length || data.position >= 6) {
      this.sendMessage(socket, "error", "Invalid data");
    }

    const table = this.tables[data.tableId];
    const user = await userService.getUser(data.address);
    if (user.balance < table.THRESHOLD) {
      this.sendMessage(socket, "error", `You need at least ${table.THRESHOLD}chips`);
    }
    user.balance -= table.THRESHOLD;
    userService.updateUser(user);

    table.takeSeat({
      address: data.address,
      stack: data.startChipAmount,
      socket: socket,
    }, data.position);
  }

  leaveTable = async (socket: Socket, data: any) => {
  }

  // table actions
  bet = async (socket: Socket, data: any) => {
  }

  fold = async (socket: Socket, data: any) => {
  }

  call = async (socket: Socket, data: any) => {
  }

  raise = async (socket: Socket, data: any) => {
  }

  sendMessage = (socket: Socket, channel: string, data: any = {}) => {
    socket.emit(channel, data);
  }
}
