"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, type QueueSummary } from "@/lib/api";
import { Plus } from "lucide-react";

const MAX_MARKS = 24;

function LineMarks({ count }: { count: number }) {
  if (count === 0) return <span className="text-sm text-[#7d786c]">Empty</span>;
  const shown = Math.min(count, MAX_MARKS);
  return (
    <div className="flex items-center gap-1" aria-hidden>
      {Array.from({ length: shown }, (_, i) => (
        <span
          key={i}
          className={`h-5 w-1.5 rounded-full ${i === 0 ? "bg-[#e3a542]" : "bg-[#ece7dc]/55"}`}
        />
      ))}
      {count > shown && (
        <span className="ml-1.5 text-sm text-[#a39e91] tabular-nums">
          +{count - shown}
        </span>
      )}
    </div>
  );
}

export default function QueuesPage() {
  const [queues, setQueues] = useState<QueueSummary[] | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<{ queues: QueueSummary[] }>("/queues");
      setQueues(r.queues);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The server didn't respond");
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, [load]);

  async function createQueue(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    setCreating(true);
    try {
      await api("/queues", { method: "POST", body: { name: trimmed } });
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The queue wasn't created");
    } finally {
      setCreating(false);
    }
  }

  const totalWaiting = queues?.reduce((n, q) => n + q.waitingCount, 0) ?? 0;
  const unattended =
    queues?.filter((q) => q.waitingCount > 0 && q.servingCount === 0).length ??
    0;

  return (
    <div className="-m-px min-h-full rounded-2xl bg-[#1d1c19] p-5 text-[#ece7dc] sm:p-8">
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Queues</h1>
            {queues && queues.length > 0 && (
              <p className="mt-1.5 text-[#a39e91]">
                {totalWaiting === 0
                  ? "Nobody is waiting anywhere."
                  : `${totalWaiting} ${totalWaiting === 1 ? "person" : "people"} waiting across ${queues.length} ${
                      queues.length === 1 ? "queue" : "queues"
                    }.`}
                {unattended > 0 && (
                  <span className="text-[#e3a542]">
                    {" "}
                    {unattended === 1 ? "One has" : `${unattended} have`} nobody
                    at the counter.
                  </span>
                )}
              </p>
            )}
          </div>
          <form onSubmit={createQueue} className="flex w-full gap-2 sm:w-auto">
            <input
              ref={nameInput}
              className="h-10 w-full rounded-lg border border-[#3b3832] bg-[#26241f] px-3 text-sm text-[#ece7dc] placeholder:text-[#7d786c] focus:border-[#e3a542] focus:outline-none sm:w-60"
              placeholder="New queue, like Billing"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              aria-label="New queue name"
            />
            <button
              className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-[#e3a542] px-4 text-sm font-semibold text-[#1d1c19] hover:bg-[#eab55e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3a542] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={creating || !name.trim()}
            >
              <Plus width={16} height={16} />{" "}
              {creating ? "Creating…" : "Create"}
            </button>
          </form>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300"
          >
            {queues
              ? `Couldn't refresh: ${error}. Showing the last update.`
              : `Couldn't load queues: ${error}.`}{" "}
            Trying again in 10 seconds.
          </p>
        )}

        {queues === null ? (
          <div
            className="divide-y divide-[#3b3832] rounded-xl border border-[#3b3832]"
            aria-busy="true"
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between px-5 py-5"
              >
                <div className="h-5 w-40 animate-pulse rounded bg-[#2e2c26]" />
                <div className="h-8 w-10 animate-pulse rounded bg-[#2e2c26]" />
              </div>
            ))}
          </div>
        ) : queues.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#3b3832] px-6 py-16 text-center">
            <p className="text-lg font-medium">No queues yet</p>
            <p className="mx-auto mt-1 max-w-sm text-[#a39e91]">
              Make one for each counter or service, like Billing or Pharmacy.
            </p>
            <button
              onClick={() => nameInput.current?.focus()}
              className="mt-5 cursor-pointer text-sm font-medium text-[#e3a542] underline decoration-[#e3a542]/40 underline-offset-4 hover:decoration-[#e3a542]"
            >
              Name your first queue
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-[#3b3832] overflow-hidden rounded-xl border border-[#3b3832]">
            {queues.map((q) => {
              const unattendedQueue =
                q.waitingCount > 0 && q.servingCount === 0;
              return (
                <li key={q.id}>
                  <Link
                    href={`/queues/${q.id}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 px-5 py-4 hover:bg-[#26241f] focus-visible:bg-[#26241f] focus-visible:outline-none sm:grid-cols-[minmax(0,15rem)_1fr_auto]"
                  >
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-medium">{q.name}</h2>
                      <p
                        className={`text-sm ${unattendedQueue ? "text-[#e3a542]" : "text-[#a39e91]"}`}
                      >
                        {q.servingCount > 0
                          ? "Serving now"
                          : unattendedQueue
                            ? "Nobody at the counter"
                            : "Quiet"}
                      </p>
                    </div>
                    <div className="hidden min-w-0 overflow-hidden sm:block">
                      <LineMarks count={q.waitingCount} />
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-semibold tracking-tight tabular-nums">
                        {q.waitingCount}
                      </span>
                      <span className="block text-xs text-[#a39e91]">
                        waiting
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
