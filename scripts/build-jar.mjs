#!/usr/bin/env node
// Rebuilds jar-light.svg and jar-dark.svg from the contribution calendar.
// One stone for each active week of the last year, oldest first.
// A stone that has settled never moves again.
//
//   GITHUB_TOKEN=... node scripts/build-jar.mjs

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOGIN = 'AnilBurcu';

const query = `query($login:String!){user(login:$login){contributionsCollection{
  contributionCalendar{weeks{contributionDays{contributionCount}}}}}}`;

const res = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    'Content-Type': 'application/json',
    'User-Agent': 'jar-builder',
  },
  body: JSON.stringify({ query, variables: { login: LOGIN } }),
});
const body = await res.json();
if (!res.ok || body.errors) throw new Error(JSON.stringify(body));

const weeks = body.data.user.contributionsCollection.contributionCalendar.weeks
  .map((w) => w.contributionDays.reduce((sum, d) => sum + d.contributionCount, 0))
  .filter((count) => count > 0);
if (weeks.length === 0) throw new Error('No contributions came back');

// Geometry. The jar is 300 by 250 and the stones live inside its body.
const W = 300;
const H = 250;
const LEFT = 63;
const RIGHT = 237;
const BOTTOM = 235;
const CORNER = 13;
const NECK_LEFT = 96;
const NECK_RIGHT = 204;

// Physics, in steps. 90 steps make one second of animation.
const RATE = 90;
const GRAVITY = 0.2;
const DAMPING = 0.992;
const SPAWN_EVERY = 11;
const REST_SPEED = 0.09;
const REST_STEPS = 14;
const MAX_AGE = 320;

const radius = (count) => 3 + Math.sqrt(count) * 0.98;

const stones = [];

function spawn(count, index) {
  const r = radius(count);
  const span = NECK_RIGHT - NECK_LEFT - 2 * r;
  const x = NECK_LEFT + r + (((index * 37) % 100) / 100) * span;
  const y = -r - 2;
  stones.push({ x, y, px: x, py: y - 0.4, r, count, still: 0, age: 0, done: false, born: 0, path: [] });
}

function keepInside(s) {
  if (s.x < LEFT + s.r) s.x = LEFT + s.r;
  if (s.x > RIGHT - s.r) s.x = RIGHT - s.r;
  if (s.y > BOTTOM - s.r) s.y = BOTTOM - s.r;
  const inner = CORNER - s.r;
  if (inner <= 0) return;
  for (const cx of [LEFT + CORNER, RIGHT - CORNER]) {
    const cy = BOTTOM - CORNER;
    const outside = cx < W / 2 ? s.x < cx : s.x > cx;
    if (!outside || s.y < cy) continue;
    const dx = s.x - cx;
    const dy = s.y - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > inner) {
      s.x = cx + (dx / dist) * inner;
      s.y = cy + (dy / dist) * inner;
    }
  }
}

function step() {
  for (const s of stones) {
    if (s.done) continue;
    const vx = (s.x - s.px) * DAMPING;
    const vy = (s.y - s.py) * DAMPING;
    s.px = s.x;
    s.py = s.y;
    s.x += vx;
    s.y += vy + GRAVITY;
    s.age += 1;
  }
  for (let pass = 0; pass < 6; pass += 1) {
    for (let i = 0; i < stones.length; i += 1) {
      const a = stones[i];
      for (let j = i + 1; j < stones.length; j += 1) {
        const b = stones[j];
        if (a.done && b.done) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const min = a.r + b.r + 0.4;
        const d2 = dx * dx + dy * dy;
        if (d2 === 0 || d2 >= min * min) continue;
        const dist = Math.sqrt(d2);
        const push = (min - dist) / dist;
        if (a.done) {
          b.x += dx * push;
          b.y += dy * push;
        } else if (b.done) {
          a.x -= dx * push;
          a.y -= dy * push;
        } else {
          a.x -= dx * push * 0.5;
          a.y -= dy * push * 0.5;
          b.x += dx * push * 0.5;
          b.y += dy * push * 0.5;
        }
      }
      if (!a.done) keepInside(a);
    }
  }
  for (const s of stones) {
    if (s.done) continue;
    const speed = Math.abs(s.x - s.px) + Math.abs(s.y - s.py);
    s.still = speed < REST_SPEED ? s.still + 1 : 0;
    if (s.still > REST_STEPS || s.age > MAX_AGE) {
      s.done = true;
      s.px = s.x;
      s.py = s.y;
    }
  }
}

let t = 0;
let next = 0;
while (next < weeks.length || stones.some((s) => !s.done)) {
  if (t % SPAWN_EVERY === 0 && next < weeks.length) {
    spawn(weeks[next], next);
    stones[stones.length - 1].born = t;
    next += 1;
  }
  step();
  for (const s of stones) if (!s.done) s.path.push({ t, x: s.x, y: s.y });
  t += 1;
}

// Keeps only the points the eye needs, measured against linear interpolation in time.
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const a = points[0];
  const b = points[points.length - 1];
  let worst = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const k = (points[i].t - a.t) / (b.t - a.t);
    const err = Math.hypot(points[i].x - (a.x + (b.x - a.x) * k), points[i].y - (a.y + (b.y - a.y) * k));
    if (err > worst) {
      worst = err;
      index = i;
    }
  }
  if (worst <= tolerance) return [a, b];
  return [...simplify(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplify(points.slice(index), tolerance)];
}

const round = (n) => Math.round(n * 10) / 10;
const peak = Math.max(...weeks);

let keyframes = '';
let rules = '';
let circles = '';

stones.forEach((s, i) => {
  const first = { t: s.born, x: s.path[0]?.x ?? s.x, y: s.path[0]?.y ?? s.y };
  const points = simplify([first, ...s.path, { t: s.path.at(-1).t + 1, x: s.x, y: s.y }], 0.8);
  const start = points[0].t;
  const span = points.at(-1).t - start;
  const frames = points
    .map((p) => {
      const pct = Math.round(((p.t - start) / span) * 10000) / 100;
      const at = `translate(${round(p.x - s.x)}px,${round(p.y - s.y)}px)`;
      return `${pct}%{transform:${at}}`;
    })
    .join('');
  keyframes += `@keyframes k${i}{${frames}}\n`;
  rules += `.s${i}{animation:k${i} ${(span / RATE).toFixed(2)}s linear ${(start / RATE).toFixed(2)}s both}\n`;
  const opacity = (0.18 + (s.count / peak) * 0.74).toFixed(2);
  circles += `<circle class="s s${i}" cx="${round(s.x)}" cy="${round(s.y)}" r="${round(s.r)}" fill-opacity="${opacity}"/>\n`;
});

const render = (ink) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="A jar of stones, one stone for each active week of commits in the last year.">
<style>
.s{fill:${ink}}
.j{fill:none;stroke:${ink};stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
${rules}${keyframes}@media (prefers-reduced-motion:reduce){.s{animation:none}}
</style>
${circles}<path class="j" d="M92 25V34C92 46 62 44 62 64V221Q62 236 77 236H223Q238 236 238 221V64C238 44 208 46 208 34V25"/>
<rect class="j" x="86" y="14" width="128" height="11" rx="3"/>
</svg>
`;

writeFileSync(join(ROOT, 'jar-light.svg'), render('#1f2328'));
writeFileSync(join(ROOT, 'jar-dark.svg'), render('#e6edf3'));

const top = Math.min(...stones.map((s) => s.y - s.r));
console.log(`${stones.length} stones, ${(t / RATE).toFixed(1)}s, pile top at y=${top.toFixed(0)}`);
