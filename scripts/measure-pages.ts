const PAGES = ['/', '/report', '/practice', '/review', '/questions', '/flashcards', '/cheatsheet'];
const RUNS = 5;
const LIMIT_MS = 300;

function median(xs: number[]): number {
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

async function timeOnce(url: string): Promise<number> {
  const start = performance.now();
  const res = await fetch(url);
  await res.text();
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return performance.now() - start;
}

async function main(): Promise<number> {
  const base = (process.argv[2] ?? 'http://localhost:3200').replace(/\/$/, '');
  let slow = 0;
  for (const page of PAGES) {
    const times: number[] = [];
    for (let i = 0; i < RUNS; i++) times.push(await timeOnce(`${base}${page}`));
    const ms = median(times);
    if (ms >= LIMIT_MS) slow++;
    console.log(`${page.padEnd(12)} ${ms.toFixed(0).padStart(5)} ms${ms >= LIMIT_MS ? '  SLOW' : ''}`);
  }
  return slow === 0 ? 0 : 1;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (e) => {
    console.error((e as Error).message);
    process.exitCode = 1;
  },
);
