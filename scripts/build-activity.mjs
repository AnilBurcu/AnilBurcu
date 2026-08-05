#!/usr/bin/env node
/**
 * Regenerates activity.svg from live GitHub data.
 *
 *   node scripts/build-activity.mjs
 *
 * Needs the `gh` CLI authenticated as the profile owner — the private repo
 * count and the contribution calendar are only visible to that account.
 *
 * The card is a plain committed SVG rather than a third-party stats service:
 * no external image host in the README, no rate limits, and the private
 * count is something no public service can read anyway.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const gh = (args) =>
  execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });

// ── Data ────────────────────────────────────────────────────────────────────
const calendar = JSON.parse(
  gh([
    'api',
    'graphql',
    '-f',
    'query={viewer{contributionsCollection{contributionCalendar{totalContributions weeks{firstDay contributionDays{contributionCount}}}}}}',
  ])
).data.viewer.contributionsCollection.contributionCalendar;

const weeks = calendar.weeks.map((w) => ({
  first: w.firstDay,
  sum: w.contributionDays.reduce((a, d) => a + d.contributionCount, 0),
}));

const repos = JSON.parse(
  gh(['repo', 'list', 'AnilBurcu', '--limit', '500', '--json', 'isPrivate,isFork,name'])
);
const priv = repos.filter((r) => r.isPrivate).length;
const pub = repos.length - priv;

// Language mix by bytes. One call per repo — the languages endpoint has no
// bulk form — so this is the slow part of the rebuild (~40s over 79 repos).
// Byte counts, not repo counts: counting repos would rank JavaScript first
// purely on the strength of old throwaway projects.
const sources = repos.filter((r) => !r.isFork);
const langBytes = {};
for (const r of sources) {
  let payload;
  try {
    payload = JSON.parse(gh(['api', `repos/AnilBurcu/${r.name}/languages`]));
  } catch {
    continue; // repo vanished or is inaccessible; skip rather than fail the build
  }
  for (const [lang, bytes] of Object.entries(payload)) {
    langBytes[lang] = (langBytes[lang] || 0) + bytes;
  }
}
const langTotal = Object.values(langBytes).reduce((a, b) => a + b, 0) || 1;
const DISPLAY = { PLpgSQL: 'PL/pgSQL', 'Objective-C': 'Obj-C' };
const LANG_COLOUR = ['#3B82F6', '#3FCF8E', '#FB7185', '#FBBF24', '#8B5CF6'];
const ranked = Object.entries(langBytes).sort((a, b) => b[1] - a[1]);
const topLangs = ranked.slice(0, 4).map(([name, bytes], i) => ({
  name: DISPLAY[name] || name,
  pct: (bytes / langTotal) * 100,
  colour: LANG_COLOUR[i],
}));
const restPct = 100 - topLangs.reduce((a, l) => a + l.pct, 0);
if (restPct > 0.05) {
  topLangs.push({ name: 'Other', pct: restPct, colour: '#94A3B8' });
}

const total = calendar.totalContributions;
const activeWeeks = weeks.filter((w) => w.sum > 0).length;
const peak = Math.max(...weeks.map((w) => w.sum), 1);

// ── Geometry ────────────────────────────────────────────────────────────────
const W = 1000;
const H = 372;
const X0 = 60;
const X1 = 940;
const SPAN = X1 - X0;
const BASE = 240; // silhouette baseline
const BAR_MAX = 94;
const pitch = SPAN / weeks.length;
// Columns touch: the year reads as one continuous mass rather than 53
// separate bars, which is what makes a busy year look busy.
const barW = pitch + 0.4;

/**
 * Square-root scale, not linear.
 *
 * The distribution is heavily skewed — a 133-contribution peak against a
 * median active week of 19. On a linear scale every ordinary week collapses
 * into a 4-6px sliver and a year of steady work reads as an empty chart.
 * Sqrt keeps the ordering intact and the peak still the tallest bar, while
 * giving typical weeks a readable height. The peak value is printed in the
 * caption so the top of the range stays explicit.
 */
const barHeight = (v) => (v === 0 ? 0 : Math.max(4, Math.sqrt(v / peak) * BAR_MAX));

const fmt = (n) => n.toLocaleString('en-US');

const stats = [
  [fmt(pub), 'PUBLIC REPOSITORIES'],
  [fmt(priv), 'PRIVATE REPOSITORIES'],
  [fmt(total), 'CONTRIBUTIONS · 12 MO'],
  [`${activeWeeks}/${weeks.length}`, 'ACTIVE WEEKS'],
];

const statSvg = stats
  .map(([value, label], i) => {
    const x = X0 + i * 220;
    return `  <text class="stat" x="${x}" y="68">${value}</text>
  <text class="statlabel" x="${x}" y="87">${label}</text>`;
  })
  .join('\n');

// Bars: one per ISO week. Silent weeks keep a faint stub so the axis reads
// as a continuous year rather than a gap.
const barSvg = weeks
  .map((w, i) => {
    const x = +(X0 + i * pitch).toFixed(2);
    const h = w.sum === 0 ? 3 : barHeight(w.sum);
    const y = +(BASE - h).toFixed(2);
    const cls = w.sum === 0 ? 'bar zero' : 'bar';
    return `  <rect class="${cls}" style="animation-delay:${(i * 13).toFixed(0)}ms" x="${x}" y="${y}" width="${barW.toFixed(2)}" height="${h.toFixed(2)}"/>`;
  })
  .join('\n');

// ── Language mix ────────────────────────────────────────────────────────────
const LANG_Y = 318;
const LANG_H = 12;
const GAP = 2;
let cursor = X0;
const langSegs = topLangs
  .map((l, i) => {
    const w = (l.pct / 100) * SPAN;
    const drawW = Math.max(1, w - (i < topLangs.length - 1 ? GAP : 0));
    const seg = `  <rect x="${cursor.toFixed(2)}" y="${LANG_Y}" width="${drawW.toFixed(2)}" height="${LANG_H}" fill="${l.colour}"/>`;
    cursor += w;
    return seg;
  })
  .join('\n');

const langLegend = topLangs
  .map((l, i) => {
    const x = X0 + i * (SPAN / topLangs.length);
    return `  <circle cx="${(x + 4).toFixed(1)}" cy="${LANG_Y + 34}" r="4" fill="${l.colour}"/>
  <text class="legend" x="${(x + 16).toFixed(1)}" y="${LANG_Y + 38}">${l.name} <tspan class="legendpct">${l.pct.toFixed(1)}%</tspan></text>`;
  })
  .join('\n');

// Month ticks: label the first week that lands in a new month.
let lastMonth = null;
const monthSvg = weeks
  .map((w, i) => {
    const d = new Date(w.first + 'T00:00:00Z');
    const m = d.getUTCMonth();
    if (m === lastMonth) return null;
    lastMonth = m;
    const x = +(X0 + i * pitch + barW / 2).toFixed(2);
    if (x > X1 - 14) return null;
    const name = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
    return `  <text class="month" x="${x}" y="${BASE + 19}" text-anchor="middle">${name}</text>`;
  })
  .filter(Boolean)
  .join('\n');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Repositories and activity: ${pub} public and ${priv} private repositories, ${fmt(total)} contributions over the last 12 months across ${activeWeeks} active weeks.">
  <defs>
    <linearGradient id="spectrum" gradientUnits="userSpaceOnUse" x1="${X0}" y1="0" x2="${X1}" y2="0">
      <stop offset="0%"   stop-color="#3FCF8E"/>
      <stop offset="16%"  stop-color="#22D3EE"/>
      <stop offset="33%"  stop-color="#3B82F6"/>
      <stop offset="50%"  stop-color="#8B5CF6"/>
      <stop offset="66%"  stop-color="#EC4899"/>
      <stop offset="83%"  stop-color="#FB7185"/>
      <stop offset="100%" stop-color="#FBBF24"/>
    </linearGradient>
    <clipPath id="langclip">
      <rect x="${X0}" y="${LANG_Y}" width="${SPAN}" height="${LANG_H}" rx="${LANG_H / 2}"/>
    </clipPath>
  </defs>

  <style>
    :root {
      --fg: #14181d;
      --muted: #5b6570;
      --rule: rgba(20, 24, 29, 0.11);
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --fg: #e8eef5;
        --muted: #8d99a6;
        --rule: rgba(232, 238, 245, 0.13);
      }
    }
    .section, .statlabel, .caption, .month {
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
      fill: var(--muted);
    }
    .section { font-size: 11px; letter-spacing: 2.7px; }
    .statlabel { font-size: 9.5px; letter-spacing: 1.6px; opacity: 0.72; }
    .caption { font-size: 9.5px; letter-spacing: 1.7px; opacity: 0.6; }
    .month { font-size: 8.5px; letter-spacing: 1.2px; opacity: 0.5; }
    .stat {
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 32px; font-weight: 600; letter-spacing: 0.2px; fill: var(--fg);
    }
    .rule { stroke: var(--rule); stroke-width: 1; }
    .baseline { stroke: var(--rule); stroke-width: 1.5; stroke-linecap: round; }

    .legend {
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
      font-size: 10px; letter-spacing: 0.6px; fill: var(--fg); opacity: 0.78;
    }
    .legendpct { opacity: 0.55; }

    .bar {
      fill: url(#spectrum);
      transform-box: fill-box;
      transform-origin: bottom;
      animation: grow 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    .zero { opacity: 0.22; }
    @keyframes grow {
      from { transform: scaleY(0); opacity: 0; }
      to   { transform: scaleY(1); opacity: 1; }
    }
    .langbar {
      transform-box: fill-box;
      transform-origin: left;
      animation: sweep 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.35s both;
    }
    @keyframes sweep {
      from { transform: scaleX(0); }
      to   { transform: scaleX(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      .bar, .langbar { animation: none; }
    }
  </style>

  <text class="section" x="${X0}" y="26">REPOSITORIES &amp; ACTIVITY</text>

${statSvg}

  <line class="rule" x1="${X0}" y1="106" x2="${X1}" y2="106"/>
  <text class="caption" x="${X0}" y="127">CONTRIBUTION ACTIVITY · WEEKLY · PEAK ${peak}</text>

${barSvg}

  <line class="baseline" x1="${X0}" y1="${BASE + 1}" x2="${X1}" y2="${BASE + 1}"/>

${monthSvg}

  <line class="rule" x1="${X0}" y1="288" x2="${X1}" y2="288"/>
  <text class="caption" x="${X0}" y="309">LANGUAGES · SHARE OF CODE BY BYTES · ${sources.length} REPOSITORIES</text>

  <g class="langbar" clip-path="url(#langclip)">
${langSegs}
  </g>

${langLegend}
</svg>
`;

mkdirSync(ROOT, { recursive: true });
writeFileSync(join(ROOT, 'activity.svg'), svg);
console.log(
  `activity.svg — ${pub} public, ${priv} private, ${fmt(total)} contributions, ${activeWeeks}/${weeks.length} active weeks, peak ${peak}`
);
