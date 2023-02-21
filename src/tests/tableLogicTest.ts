import MersenneTwister from "mersenne-twister";

console.log(Number(new Date()));
var generator = new MersenneTwister(Number(new Date()));

for (let i = 0; i < 100; i++)
  console.log(generator.random_int());
