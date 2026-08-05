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
  gh(['repo', 'list', 'AnilBurcu', '--limit', '500', '--json', 'isPrivate'])
);
const priv = repos.filter((r) => r.isPrivate).length;
const pub = repos.length - priv;

const total = calendar.totalContributions;
const activeWeeks = weeks.filter((w) => w.sum > 0).length;
const peak = Math.max(...weeks.map((w) => w.sum), 1);

// ── Geometry ────────────────────────────────────────────────────────────────
const W = 1000;
const H = 250;
const X0 = 60;
const X1 = 940;
const SPAN = X1 - X0;
const BASE = 212; // bar baseline
const BAR_MAX = 78;
const pitch = SPAN / weeks.length;
const barW = Math.max(6, pitch - 2.2);

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
    return `  <rect class="${cls}" style="animation-delay:${(i * 13).toFixed(0)}ms" x="${x}" y="${y}" width="${barW.toFixed(2)}" height="${h.toFixed(2)}" rx="2.5"/>`;
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
    return `  <text class="month" x="${x}" y="231" text-anchor="middle">${name}</text>`;
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
    @media (prefers-reduced-motion: reduce) {
      .bar { animation: none; }
    }
  </style>

  <text class="section" x="${X0}" y="26">REPOSITORIES &amp; ACTIVITY</text>

${statSvg}

  <line class="rule" x1="${X0}" y1="106" x2="${X1}" y2="106"/>
  <text class="caption" x="${X0}" y="127">CONTRIBUTION ACTIVITY · WEEKLY · PEAK ${peak}</text>

${barSvg}

  <line class="baseline" x1="${X0}" y1="${BASE + 1}" x2="${X1}" y2="${BASE + 1}"/>

${monthSvg}
</svg>
`;

mkdirSync(ROOT, { recursive: true });
writeFileSync(join(ROOT, 'activity.svg'), svg);
console.log(
  `activity.svg — ${pub} public, ${priv} private, ${fmt(total)} contributions, ${activeWeeks}/${weeks.length} active weeks, peak ${peak}`
);
