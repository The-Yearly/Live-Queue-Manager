export const tokenLabel = (n: number) => `#${String(n).padStart(3, "0")}`;

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—";
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return s % 60 && m < 10 ? `${m}m ${s % 60}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
}

export function sinceLabel(iso: string, now: number): string {
  return formatDuration((now - new Date(iso).getTime()) / 1000);
}

export const timeOfDay = (iso: string | number) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
