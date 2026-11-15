/**
 * Pure analytics helpers. All timestamps are epoch milliseconds.
 * `tzOffsetMin` follows JS Date#getTimezoneOffset (UTC - local, in minutes),
 * so buckets line up with the viewer's local hours/days.
 */

export type RangeKey = "24h" | "7d" | "30d";

const HOUR = 3600_000;
const DAY = 24 * HOUR;

export const RANGES: Record<
  RangeKey,
  { span: number; trendBucket: number; volumeBucket: number }
> = {
  "24h": { span: DAY, trendBucket: HOUR, volumeBucket: HOUR },
  "7d": { span: 7 * DAY, trendBucket: 3 * HOUR, volumeBucket: DAY },
  "30d": { span: 30 * DAY, trendBucket: 12 * HOUR, volumeBucket: DAY },
};

export interface TokenLite {
  queueId: string;
  status: "WAITING" | "SERVING" | "SERVED" | "CANCELLED";
  createdAt: number;
  servedAt: number | null;
  completedAt: number | null;
  cancelledAt: number | null;
}

/** When the token stopped waiting in line (assigned for service or cancelled), or null if still waiting. */
export const waitEnd = (t: TokenLite) => t.servedAt ?? t.cancelledAt ?? null;

export function alignDown(ms: number, size: number, tzOffsetMin: number) {
  const shift = tzOffsetMin * 60_000;
  return Math.floor((ms - shift) / size) * size + shift;
}

export function buildBuckets(
  start: number,
  end: number,
  size: number,
  tzOffsetMin: number,
) {
  const buckets: { start: number; end: number }[] = [];
  for (let b = alignDown(start, size, tzOffsetMin); b < end; b += size) {
    buckets.push({ start: b, end: b + size });
  }
  return buckets;
}

/**
 * Queue length over time via an event sweep.
 * Returns, per bucket, the time-weighted average length and the peak length.
 */
export function queueLengthTrend(
  tokens: TokenLite[],
  buckets: { start: number; end: number }[],
  now: number,
) {
  if (!buckets.length) return [];
  const from = buckets[0].start;
  const events: { at: number; delta: number }[] = [];
  let length = 0;

  for (const t of tokens) {
    const end = waitEnd(t);
    if (t.createdAt < from) {
      // Already in line when the window opened?
      if (end === null || end > from) {
        length++;
        if (end !== null) events.push({ at: end, delta: -1 });
      }
    } else {
      events.push({ at: t.createdAt, delta: +1 });
      if (end !== null) events.push({ at: end, delta: -1 });
    }
  }
  // Exits sort before entries at the same instant
  events.sort((a, b) => a.at - b.at || a.delta - b.delta);

  const out: { start: number; avg: number; peak: number; end: number }[] = [];
  let i = 0;
  for (const b of buckets) {
    const stop = Math.min(b.end, now);
    if (b.start >= now) break;
    let cursor = b.start;
    let area = 0;
    let peak = length;
    while (i < events.length && events[i].at < b.end) {
      const e = events[i];
      if (e.at > cursor) {
        area += length * (Math.min(e.at, stop) - cursor);
        cursor = Math.min(e.at, stop);
      }
      length += e.delta;
      peak = Math.max(peak, length);
      i++;
    }
    area += length * Math.max(0, stop - cursor);
    const dur = stop - b.start;
    out.push({
      start: b.start,
      avg: dur > 0 ? Math.round((area / dur) * 10) / 10 : length,
      peak,
      end: length,
    });
  }
  return out;
}

export function percentile(sorted: number[], p: number) {
  if (!sorted.length) return null;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx];
}

export const WAIT_HISTOGRAM_BINS = [
  { label: "< 5 min", max: 5 },
  { label: "5–10", max: 10 },
  { label: "10–15", max: 15 },
  { label: "15–30", max: 30 },
  { label: "30–60", max: 60 },
  { label: "60+ min", max: Infinity },
];

export function computeAnalytics(
  tokens: TokenLite[],
  opts: {
    range: RangeKey;
    tzOffsetMin: number;
    now: number;
    queues: { id: string; name: string }[];
  },
) {
  const { range, tzOffsetMin, now, queues } = opts;
  const cfg = RANGES[range];
  const from = now - cfg.span;
  const inRange = (ms: number | null) => ms !== null && ms >= from && ms <= now;

  const created = tokens.filter((t) => inRange(t.createdAt));
  const served = tokens.filter((t) => inRange(t.servedAt)); // assigned for service in range
  const completed = tokens.filter(
    (t) => t.status === "SERVED" && inRange(t.completedAt) && t.servedAt,
  );
  const cancelled = tokens.filter(
    (t) => t.status === "CANCELLED" && inRange(t.cancelledAt),
  );

  const waits = served
    .map((t) => (t.servedAt! - t.createdAt) / 1000)
    .sort((a, b) => a - b);
  const services = completed.map((t) => (t.completedAt! - t.servedAt!) / 1000);
  const avg = (xs: number[]) =>
    xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;

  const currentlyWaiting = tokens.filter((t) => t.status === "WAITING").length;
  const currentlyServing = tokens.filter((t) => t.status === "SERVING").length;

  // Volume per bucket
  const volumeBuckets = buildBuckets(from, now, cfg.volumeBucket, tzOffsetMin);
  const volume = volumeBuckets.map((b) => {
    const within = (ms: number | null) =>
      ms !== null && ms >= b.start && ms < b.end;
    const bucketWaits = served
      .filter((t) => within(t.servedAt))
      .map((t) => (t.servedAt! - t.createdAt) / 1000);
    return {
      start: b.start,
      joined: created.filter((t) => within(t.createdAt)).length,
      served: bucketWaits.length,
      cancelled: cancelled.filter((t) => within(t.cancelledAt)).length,
      avgWaitSec: avg(bucketWaits),
    };
  });

  const trendBuckets = buildBuckets(from, now, cfg.trendBucket, tzOffsetMin);
  const lengthTrend = queueLengthTrend(tokens, trendBuckets, now);

  // Average wait by local hour of day (when they joined)
  const byHour = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    total: 0,
    count: 0,
  }));
  for (const t of served) {
    const localHour = new Date(
      t.createdAt - tzOffsetMin * 60_000,
    ).getUTCHours();
    byHour[localHour].total += (t.servedAt! - t.createdAt) / 1000;
    byHour[localHour].count++;
  }
  const waitByHour = byHour.map((h) => ({
    hour: h.hour,
    avgWaitSec: h.count ? Math.round(h.total / h.count) : null,
    count: h.count,
  }));

  const waitHistogram = WAIT_HISTOGRAM_BINS.map((bin, i) => {
    const min = i === 0 ? 0 : WAIT_HISTOGRAM_BINS[i - 1].max;
    return {
      label: bin.label,
      count: waits.filter((w) => w / 60 >= min && w / 60 < bin.max).length,
    };
  });

  const perQueue = queues.map((q) => {
    const qServed = served.filter((t) => t.queueId === q.id);
    return {
      queueId: q.id,
      name: q.name,
      waiting: tokens.filter(
        (t) => t.queueId === q.id && t.status === "WAITING",
      ).length,
      joined: created.filter((t) => t.queueId === q.id).length,
      served: qServed.length,
      cancelled: cancelled.filter((t) => t.queueId === q.id).length,
      avgWaitSec: avg(qServed.map((t) => (t.servedAt! - t.createdAt) / 1000)),
    };
  });

  const finished = served.length + cancelled.length;
  return {
    range,
    from,
    to: now,
    summary: {
      joined: created.length,
      served: served.length,
      cancelled: cancelled.length,
      cancelRate: finished
        ? Math.round((cancelled.length / finished) * 1000) / 10
        : null,
      currentlyWaiting,
      currentlyServing,
      avgWaitSec: avg(waits),
      medianWaitSec:
        percentile(waits, 50) !== null
          ? Math.round(percentile(waits, 50)!)
          : null,
      p90WaitSec:
        percentile(waits, 90) !== null
          ? Math.round(percentile(waits, 90)!)
          : null,
      maxWaitSec: waits.length ? Math.round(waits[waits.length - 1]) : null,
      avgServiceSec: avg(services),
      peakLength: lengthTrend.reduce((m, p) => Math.max(m, p.peak), 0),
    },
    lengthTrend,
    volume,
    waitByHour,
    waitHistogram,
    perQueue,
  };
}
