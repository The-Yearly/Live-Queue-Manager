"use client";

import { useEffect, useMemo, useState } from "react";
import {
  api,
  type Analytics,
  type QueueSummary,
  type RangeKey,
} from "@/lib/api";
import { formatDuration } from "@/lib/format";
import { CHART_COLORS, ColumnChart, TrendLineChart } from "@/components/charts";

const RANGES: { key: RangeKey; short: string; phrase: string }[] = [
  { key: "24h", short: "24h", phrase: "in the last 24 hours" },
  { key: "7d", short: "7d", phrase: "in the last 7 days" },
  { key: "30d", short: "30d", phrase: "in the last 30 days" },
];

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const plural = (n: number, one: string, many: string) =>
  `${n.toLocaleString()} ${n === 1 ? one : many}`;
const hourLabel = (h: number) =>
  new Date(2000, 0, 1, h).toLocaleTimeString([], { hour: "numeric" });
const toMinutes = (sec: number | null) =>
  sec === null ? null : Math.round((sec / 60) * 10) / 10;
const minutesTooltip = (m: number) => formatDuration(m * 60);
const minutesAxis = (m: number) => `${m}m`;

function ChartCard({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <h3 className="font-semibold">{title}</h3>
      {caption && <p className="mt-0.5 text-sm text-muted">{caption}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

const has = (v: number | null | undefined): v is number =>
  typeof v === "number";

function describePeriod(s: Analytics["summary"], phrase: string) {
  if (s.joined === 0) return `Nobody joined a queue ${phrase}.`;

  const sentences = [
    `${plural(s.joined, "person", "people")} joined ${phrase}, and ${s.served.toLocaleString()} were served.`,
  ];

  if (has(s.avgWaitSec)) {
    const slowest = has(s.p90WaitSec)
      ? `, and 1 in 10 people waited longer than ${formatDuration(s.p90WaitSec)}`
      : "";
    sentences.push(
      `The average wait was ${formatDuration(s.avgWaitSec)}${slowest}.`,
    );
  }
  if (has(s.maxWaitSec))
    sentences.push(
      `The longest anyone waited was ${formatDuration(s.maxWaitSec)}.`,
    );
  if (has(s.avgServiceSec))
    sentences.push(
      `Each person spent about ${formatDuration(s.avgServiceSec)} at the counter.`,
    );
  if (s.cancelled > 0)
    sentences.push(
      `${plural(s.cancelled, "person", "people")} left before being called.`,
    );

  return sentences.join(" ");
}

export default function DashboardPage() {
  const [range, setRange] = useState<RangeKey>("7d");
  const [queueId, setQueueId] = useState("all");
  const [queues, setQueues] = useState<QueueSummary[]>([]);
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    api<{ queues: QueueSummary[] }>("/queues")
      .then((r) => setQueues(r.queues))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      const qs = new URLSearchParams({
        range,
        queueId,
        tzOffset: String(new Date().getTimezoneOffset()),
      });
      api<Analytics>(`/analytics?${qs}`)
        .then((d) => {
          if (cancelled) return;
          setData(d);
          setError(null);
          setUpdatedAt(Date.now());
        })
        .catch(
          (e) =>
            !cancelled &&
            setError(
              e instanceof Error ? e.message : "The server didn't respond",
            ),
        )
        .finally(() => !cancelled && setLoading(false));
    };
    setLoading(true);
    load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [range, queueId]);

  const trendX = useMemo(() => {
    const hour = (ms: number) =>
      new Date(ms).toLocaleTimeString([], { hour: "numeric" });
    if (range === "24h") return hour;
    if (range === "7d")
      return (ms: number) =>
        `${new Date(ms).toLocaleDateString([], { weekday: "short" })} ${hour(ms)}`;
    return (ms: number) =>
      new Date(ms).toLocaleDateString([], { month: "short", day: "numeric" });
  }, [range]);
  const volumeX = useMemo(() => {
    if (range === "24h")
      return (ms: number) =>
        new Date(ms).toLocaleTimeString([], { hour: "numeric" });
    return (ms: number) =>
      new Date(ms).toLocaleDateString([], { month: "short", day: "numeric" });
  }, [range]);

  const waitByHour = useMemo(
    () =>
      (data?.waitByHour ?? [])
        .filter((h) => h.count > 0)
        .map((h) => ({ hour: h.hour, avgWaitMin: toMinutes(h.avgWaitSec) })),
    [data],
  );
  const queueRows = useMemo(
    () =>
      [...(data?.perQueue ?? [])].sort(
        (a, b) => b.waiting - a.waiting || a.name.localeCompare(b.name),
      ),
    [data],
  );

  const s = data?.summary;
  const rangeInfo = RANGES.find((r) => r.key === range)!;
  const queueName =
    queueId === "all"
      ? "All queues"
      : (queues.find((q) => q.id === queueId)?.name ?? "This queue");
  const busiest =
    queueId === "all" && queueRows.length > 1 && queueRows[0].waiting > 0
      ? queueRows[0]
      : null;
  const slowestQueueWait = Math.max(
    1,
    ...queueRows.map((q) => q.avgWaitSec ?? 0),
  );

  const worstHour = waitByHour.reduce<(typeof waitByHour)[number] | null>(
    (best, h) => ((h.avgWaitMin ?? 0) > (best?.avgWaitMin ?? 0) ? h : best),
    null,
  );
  const commonWait = (data?.waitHistogram ?? []).reduce<{
    label: string;
    count: number;
  } | null>((best, b) => (b.count > (best?.count ?? 0) ? b : best), null);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">{queueName}</h1>
        <div className="flex flex-wrap gap-2">
          <select
            className="input w-auto cursor-pointer bg-surface pr-8 hover:border-line-strong"
            value={queueId}
            onChange={(e) => setQueueId(e.target.value)}
            aria-label="Queue"
          >
            <option value="all">All queues</option>
            {queues.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name}
              </option>
            ))}
          </select>
          <div
            className="inline-flex h-10 rounded-lg border border-line bg-surface p-0.5"
            role="group"
            aria-label="Time range"
          >
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                aria-pressed={range === r.key}
                className={`cursor-pointer rounded-md px-3 text-sm font-medium tabular-nums ${focusRing} ${
                  range === r.key
                    ? "bg-accent text-canvas"
                    : "text-muted hover:text-fg"
                }`}
              >
                {r.short}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
        >
          Couldn't load the dashboard: {error}.{" "}
          {data ? "Showing the last numbers we had. " : ""}Trying again in 30
          seconds.
        </p>
      )}

      {!data || !s ? (
        <div className="space-y-8" aria-busy="true">
          <div className="h-12 w-80 animate-pulse rounded-md bg-raised" />
          <div className="h-20 max-w-2xl animate-pulse rounded-md bg-raised" />
          <div className="h-80 animate-pulse rounded-xl bg-surface" />
        </div>
      ) : (
        <div
          className={`space-y-10 transition-opacity ${loading ? "opacity-60" : ""}`}
        >
          <div>
            <p className="text-5xl font-semibold tracking-tight tabular-nums">
              {s.currentlyWaiting === 0
                ? "No one is waiting"
                : `${plural(s.currentlyWaiting, "person", "people")} waiting`}
            </p>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted">
              <span>
                {s.currentlyServing.toLocaleString()} being served right now
              </span>
              {busiest && (
                <span>
                  Longest line is{" "}
                  <button
                    onClick={() => setQueueId(busiest.queueId)}
                    className={`cursor-pointer rounded font-medium text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent ${focusRing}`}
                  >
                    {busiest.name}
                  </button>{" "}
                  with {busiest.waiting}
                </span>
              )}
              {updatedAt && (
                <span className="inline-flex items-center gap-1.5 text-sm text-faint">
                  <span
                    className="size-1.5 rounded-full bg-accent motion-safe:animate-pulse"
                    aria-hidden
                  />
                  Updated{" "}
                  {new Date(updatedAt).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </p>
          </div>

          <div className="max-w-2xl border-l-2 border-accent pl-5">
            <h2 className="sr-only">Summary</h2>
            <p className="text-lg leading-relaxed text-fg/90">
              {describePeriod(s, rangeInfo.phrase)}
            </p>
          </div>

          <ChartCard
            title={
              worstHour
                ? `Waits are longest around ${hourLabel(worstHour.hour)}`
                : "Wait by time of day"
            }
            caption="Average wait for people who joined in each hour"
          >
            {waitByHour.length ? (
              <ColumnChart
                data={waitByHour}
                xKey="hour"
                xFormat={hourLabel}
                yFormat={minutesAxis}
                highlightMax
                height={280}
                series={[
                  {
                    key: "avgWaitMin",
                    name: "Average wait",
                    format: minutesTooltip,
                  },
                ]}
              />
            ) : (
              <p className="py-16 text-center text-sm text-muted">
                Nobody was served in this period.
              </p>
            )}
          </ChartCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title={`Up to ${plural(s.peakLength, "person", "people")} in line at once`}
              caption="How long the line was over time"
            >
              <TrendLineChart
                data={data.lengthTrend}
                xKey="start"
                xFormat={trendX}
                allowDecimals
                series={[
                  { key: "avg", name: "Average" },
                  {
                    key: "peak",
                    name: "Longest",
                    color: CHART_COLORS.stone,
                    dashed: true,
                  },
                ]}
              />
            </ChartCard>

            <ChartCard
              title={
                commonWait
                  ? `Most people waited ${commonWait.label}`
                  : "How long people waited"
              }
              caption="Number of people by how long they waited"
            >
              <ColumnChart
                data={data.waitHistogram}
                xKey="label"
                xFormat={(l: string) => l}
                highlightMax
                series={[{ key: "count", name: "People" }]}
              />
            </ChartCard>
          </div>

          <ChartCard
            title={`${s.joined.toLocaleString()} joined, ${s.served.toLocaleString()} served, ${s.cancelled.toLocaleString()} left`}
            caption={range === "24h" ? "Hour by hour" : "Day by day"}
          >
            <ColumnChart
              data={data.volume}
              xKey="start"
              xFormat={volumeX}
              series={[
                { key: "joined", name: "Joined", color: CHART_COLORS.stone },
                { key: "served", name: "Served", color: CHART_COLORS.sage },
                { key: "cancelled", name: "Left", color: CHART_COLORS.rose },
              ]}
            />
          </ChartCard>

          {queueId === "all" && queueRows.length > 1 && (
            <div className="overflow-hidden rounded-xl border border-line bg-surface">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-3.5">
                <h2 className="font-semibold">Each queue</h2>
                <p className="text-sm text-muted">
                  Pick one to see only its numbers
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted">
                    <tr>
                      <th className="px-5 py-2.5 font-medium">Queue</th>
                      <th className="px-5 py-2.5 text-right font-medium">
                        Waiting
                      </th>
                      <th className="px-5 py-2.5 text-right font-medium">
                        Joined
                      </th>
                      <th className="px-5 py-2.5 text-right font-medium">
                        Served
                      </th>
                      <th className="px-5 py-2.5 text-right font-medium">
                        Left
                      </th>
                      <th className="w-1/4 px-5 py-2.5 font-medium">
                        Average wait
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/70 tabular-nums">
                    {queueRows.map((q) => {
                      const wait = q.avgWaitSec ?? 0;
                      const slowest = wait > 0 && wait === slowestQueueWait;
                      return (
                        <tr key={q.queueId} className="hover:bg-raised/50">
                          <td className="px-5 py-3">
                            <button
                              onClick={() => setQueueId(q.queueId)}
                              className={`cursor-pointer rounded text-left font-medium hover:text-accent ${focusRing}`}
                            >
                              {q.name}
                            </button>
                          </td>
                          <td
                            className={`px-5 py-3 text-right ${q.waiting ? "font-semibold" : "text-faint"}`}
                          >
                            {q.waiting}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {q.joined.toLocaleString()}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {q.served.toLocaleString()}
                          </td>
                          <td
                            className={`px-5 py-3 text-right ${q.cancelled ? "" : "text-faint"}`}
                          >
                            {q.cancelled.toLocaleString()}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-14 shrink-0 text-right ${slowest ? "text-accent" : ""}`}
                              >
                                {formatDuration(q.avgWaitSec)}
                              </span>
                              <span
                                className="h-1.5 flex-1 rounded-full bg-canvas"
                                aria-hidden
                              >
                                <span
                                  className={`block h-full rounded-full ${slowest ? "bg-accent" : "bg-faint"}`}
                                  style={{
                                    width: `${(wait / slowestQueueWait) * 100}%`,
                                  }}
                                />
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
