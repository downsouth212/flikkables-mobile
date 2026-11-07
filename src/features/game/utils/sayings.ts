export const TRAVEL_SAYINGS = [
  'Weeeeeeee!!',
  'Here we go!!',
  'Hold onto your hat!',
  'Up, up and awaaay!',
  'Next stop: adventure!',
  'Woohoo, window seat!',
  'Is this what clouds taste like?',
  'Passport ready!',
  'Wind in my fur!',
  'Don’t wait up!',
  'Faster! Faster!',
  'Bon voyage, me!',
  'Yippee-ki-yay!',
  'I can see my house from here!',
  'Postcard incoming!',
  'Wheeeee, no brakes!',
  'Hello, new city!',
  'Zoooooom!',
  'Best. Trip. Ever!',
  'Catch me if you can!',
] as const;

export function randomSaying(not?: string) {
  const pool = TRAVEL_SAYINGS.filter((s) => s !== not);
  return pool[Math.floor(Math.random() * pool.length)]!;
}
