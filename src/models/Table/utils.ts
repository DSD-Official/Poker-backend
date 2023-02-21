import MersenneTwister from "mersenne-twister";
import { IPlayer } from "../Player";

const randGenerator = new MersenneTwister();

export const COUNT_DOWN = 12;
export const ANIMATION_TIME = 500;

export const rand = (n: number) => {
  return randGenerator.random_int() % n;
}

export const setSeed = (seed?: number) => {
  if (!seed) seed = Number(new Date());
  randGenerator.init_seed(seed);
}

export const shuffledCards = () => {
  let cards: number[] = [];
  for (let i = 0; i < 52; i++) cards[i] = i + 1;
  for (let i = 51; i >= 0; i--) {
    let j = rand(i + 1);
    let tmp = cards[i];
    cards[i] = cards[j];
    cards[j] = tmp;
  }
  return cards;
}

export const getNextPlayerId = (id: number, players: IPlayer[]) => {
  do {
    id = (id + 1) % 6;
  } while (!players[id] || !players[id].address);
  return id;
}

export const isValid = (player: IPlayer) => {
  if (player && player.address) return true;
  return false;
}

export const numberOfPlayers = (players: IPlayer[]) => {
  let count: number = 0;
  for (let i = 0; i < 6; i++) count += Number(isValid(players[i]));
  return count;
}
