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
  status: PlayerAction,
}
