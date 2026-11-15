export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const TOKEN_KEY = "qm_token";

export type TokenStatus = "WAITING" | "SERVING" | "SERVED" | "CANCELLED";

export interface Manager {
  id: string;
  email: string;
  name: string;
}
export interface QueueSummary {
  id: string;
  name: string;
  createdAt: string;
  waitingCount: number;
  servingCount: number;
}
export interface Token {
  id: string;
  queueId: string;
  number: number;
  personName: string;
  status: TokenStatus;
  position: number;
  createdAt: string;
  servedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
}
export interface HistoryItem {
  id: string;
  number: number;
  personName: string;
  status: "SERVED" | "CANCELLED";
  finishedAt: string;
}
export interface QueueDetail {
  queue: { id: string; name: string; createdAt: string };
  waiting: Token[];
  serving: Token[];
  history: HistoryItem[];
  avgServiceSeconds: number | null;
}
export type RangeKey = "24h" | "7d" | "30d";
export interface Analytics {
  range: RangeKey;
  from: number;
  to: number;
  summary: {
    joined: number;
    served: number;
    cancelled: number;
    cancelRate: number | null;
    currentlyWaiting: number;
    currentlyServing: number;
    avgWaitSec: number | null;
    medianWaitSec: number | null;
    p90WaitSec: number | null;
    maxWaitSec: number | null;
    avgServiceSec: number | null;
    peakLength: number;
  };
  lengthTrend: { start: number; avg: number; peak: number; end: number }[];
  volume: {
    start: number;
    joined: number;
    served: number;
    cancelled: number;
    avgWaitSec: number | null;
  }[];
  waitByHour: { hour: number; avgWaitSec: number | null; count: number }[];
  waitHistogram: { label: string; count: number }[];
  perQueue: {
    queueId: string;
    name: string;
    waiting: number;
    joined: number;
    served: number;
    cancelled: number;
    avgWaitSec: number | null;
  }[];
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const tokenStore = {
  get: () =>
    typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

export async function api<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: init.method ?? "GET",
      headers: {
        ...(init.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Is the API running?");
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.();
    const detail = data?.details?.[0]?.message;
    throw new ApiError(
      res.status,
      detail ?? data?.error ?? `Request failed (${res.status})`,
    );
  }
  return data as T;
}
