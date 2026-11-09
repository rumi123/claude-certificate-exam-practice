export const DAY_MS = 86_400_000;

let offsetProvider: () => number = () => 0;

export function setClockOffsetProvider(fn: () => number): void {
  offsetProvider = fn;
}

export function now(): number {
  return Date.now() + offsetProvider();
}
