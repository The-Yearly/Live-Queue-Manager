"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

export const CHART_COLORS = {
  amber: "#e3a542",
  sage: "#8fb592",
  rose: "#c9727a",
  stone: "#8a8477",
  dim: "#5f5a50",
} as const;

const DEFAULT_SERIES = [
  CHART_COLORS.amber,
  CHART_COLORS.sage,
  CHART_COLORS.rose,
];
const CANVAS = "#1d1c19";
const AXIS = {
  stroke: "#7d786c",
  fontSize: 12,
  tickLine: false,
  axisLine: false,
} as const;
const GRID = <CartesianGrid stroke="#33312b" vertical={false} />;
const MARGIN = { top: 8, right: 8, left: -12, bottom: 0 };

export interface SeriesDef {
  key: string;
  name: string;
  format?: (v: number) => string;
  color?: string;
  dashed?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFormat = (v: any) => string;

interface ChartProps {
  data: readonly object[];
  xKey: string;
  series: SeriesDef[];
  xFormat: AnyFormat;
  yFormat?: (v: number) => string;
  height?: number;
  allowDecimals?: boolean;
  connectGaps?: boolean;
  highlightMax?: boolean;
}

const colorOf = (s: SeriesDef, i: number) =>
  s.color ?? DEFAULT_SERIES[i % DEFAULT_SERIES.length];

const valueFormats = (series: SeriesDef[]) =>
  Object.fromEntries(
    series.map((s) => [s.key, s.format ?? ((v: number) => v.toLocaleString())]),
  );

function ChartTooltip({
  active,
  payload,
  label,
  labelFormat,
  valueFormat,
}: TooltipContentProps<number, string> & {
  labelFormat: AnyFormat;
  valueFormat: Record<string, (v: number) => string>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-raised px-3 py-2 text-xs text-fg shadow-lg shadow-black/30">
      <p className="mb-1 font-medium">{labelFormat(label)}</p>
      {payload.map((p) => (
        <p
          key={String(p.dataKey)}
          className="flex items-center gap-2 text-muted"
        >
          <span
            className="size-2 rounded-full"
            style={{ background: p.color }}
          />
          {p.name}
          <span className="ml-auto pl-4 font-medium text-fg tabular-nums">
            {p.value === null || p.value === undefined
              ? "None"
              : (valueFormat[String(p.dataKey)] ?? String)(Number(p.value))}
          </span>
        </p>
      ))}
    </div>
  );
}

function ChartLegend({ series }: { series: SeriesDef[] }) {
  if (series.length < 2) return null;
  return (
    <Legend
      itemSorter={null}
      iconType="circle"
      iconSize={8}
      wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
      formatter={(value) => <span className="text-muted">{value}</span>}
    />
  );
}

export function TrendLineChart({
  data,
  xKey,
  series,
  xFormat,
  yFormat,
  height = 260,
  allowDecimals = false,
  connectGaps = true,
}: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data as object[]} margin={MARGIN}>
        {GRID}
        <XAxis
          dataKey={xKey}
          tickFormatter={xFormat}
          minTickGap={28}
          {...AXIS}
        />
        <YAxis
          tickFormatter={yFormat}
          allowDecimals={allowDecimals}
          width={48}
          {...AXIS}
        />
        <Tooltip
          cursor={{ stroke: "#5a564c" }}
          content={(p) => (
            <ChartTooltip
              {...(p as TooltipContentProps<number, string>)}
              labelFormat={xFormat}
              valueFormat={valueFormats(series)}
            />
          )}
        />
        {ChartLegend({ series })}
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={colorOf(s, i)}
            strokeWidth={s.dashed ? 1.5 : 2.5}
            strokeDasharray={s.dashed ? "4 4" : undefined}
            dot={
              connectGaps
                ? false
                : { r: 3, strokeWidth: 0, fill: colorOf(s, i) }
            }
            activeDot={{ r: 5, strokeWidth: 2, stroke: CANVAS }}
            connectNulls={connectGaps}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ColumnChart({
  data,
  xKey,
  series,
  xFormat,
  yFormat,
  height = 260,
  highlightMax = false,
}: ChartProps) {
  const first = series[0];
  const values = data.map(
    (d) => Number((d as Record<string, unknown>)[first.key]) || 0,
  );
  const maxIndex = values.indexOf(Math.max(...values));
  const highlighting =
    highlightMax && series.length === 1 && values.some((v) => v > 0);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data as object[]}
        margin={MARGIN}
        barGap={2}
        barCategoryGap="20%"
      >
        {GRID}
        <XAxis
          dataKey={xKey}
          tickFormatter={xFormat}
          minTickGap={12}
          {...AXIS}
        />
        <YAxis
          tickFormatter={yFormat}
          allowDecimals={false}
          width={48}
          {...AXIS}
        />
        <Tooltip
          cursor={{ fill: "rgba(236, 231, 220, 0.05)" }}
          content={(p) => (
            <ChartTooltip
              {...(p as TooltipContentProps<number, string>)}
              labelFormat={xFormat}
              valueFormat={valueFormats(series)}
            />
          )}
        />
        {ChartLegend({ series })}
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            fill={highlighting ? CHART_COLORS.dim : colorOf(s, i)}
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
            isAnimationActive={false}
          >
            {highlighting &&
              values.map((_, j) => (
                <Cell
                  key={j}
                  fill={j === maxIndex ? CHART_COLORS.amber : CHART_COLORS.dim}
                />
              ))}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
