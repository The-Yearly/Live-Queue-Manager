"use client";
import { QueueHeader } from "./components/queueHeader";
import { Counter } from "./components/counter";
import { AddPerson } from "./components/addPerson";
import { useCallback, useEffect, useState } from "react";
import { History } from "./components/history";
import { NotFound, LoadingSkeleton } from "./components/misc";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError, type QueueDetail, type Token } from "@/lib/api";
import { formatDuration } from "@/lib/format";
import { WaitingList } from "./components/waitingPage";
import { errorBox, panel, focusRing } from "./components/uiStyles";
export type Action =
  "add" | "serve" | "complete" | "cancel" | "move" | "rename" | "delete";
export function useQueue(id: string) {
  const [data, setData] = useState<QueueDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Action | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api<QueueDetail>(`/queues/${id}`));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setNotFound(true);
      else
        setError(e instanceof Error ? e.message : "The server didn't respond");
    }
  }, [id]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 10_000);
    return () => clearInterval(timer);
  }, [load]);

  async function run<T>(
    action: Action,
    request: () => Promise<T>,
  ): Promise<T | null> {
    setBusy(action);
    setError(null);
    try {
      const result = await request();
      await load();
      return result;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "That didn't go through. Try again.",
      );
      return null;
    } finally {
      setBusy(null);
    }
  }

  return {
    data,
    notFound,
    error,
    busy,
    addPerson: (personName: string) =>
      run("add", async () => {
        const r = await api<{ token: Token }>(`/queues/${id}/tokens`, {
          method: "POST",
          body: { personName },
        });
        return r.token;
      }),
    serveNext: () =>
      run("serve", () => api(`/queues/${id}/serve-next`, { method: "POST" })),
    complete: (t: Token) =>
      run("complete", () =>
        api(`/tokens/${t.id}/complete`, { method: "POST" }),
      ),
    cancel: (t: Token) =>
      run("cancel", () => api(`/tokens/${t.id}/cancel`, { method: "POST" })),
    move: (t: Token, direction: "up" | "down") =>
      run("move", () =>
        api(`/tokens/${t.id}/move`, { method: "POST", body: { direction } }),
      ),
    rename: (name: string) =>
      run("rename", () =>
        api(`/queues/${id}`, { method: "PATCH", body: { name } }),
      ),
    deleteQueue: () =>
      run("delete", async () => {
        await api(`/queues/${id}`, { method: "DELETE" });
        return true;
      }),
  };
}

export function useRerenderEvery(ms: number) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), ms);
    return () => clearInterval(timer);
  }, [ms]);
}

export function peopleAhead(position: number, someoneAtCounter: boolean) {
  return position + (someoneAtCounter ? 1 : 0);
}

export function describeWait(ahead: number, avgServiceSeconds: number | null) {
  if (ahead === 0) return "They're next.";
  const estimate =
    avgServiceSeconds === null
      ? ""
      : `, about ${formatDuration(ahead * avgServiceSeconds)} to wait`;
  return `${ahead} ahead of them${estimate}.`;
}

export function secondsBetween(from: string, to: string) {
  return (new Date(to).getTime() - new Date(from).getTime()) / 1000;
}

export default function QueuePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queue = useQueue(id);
  const { data, error, busy } = queue;

  if (queue.notFound) return <NotFound />;
  if (!data) {
    if (error)
      return (
        <p role="alert" className={errorBox}>
          Couldn't load this queue: {error}. Trying again in 10 seconds.
        </p>
      );
    return <LoadingSkeleton />;
  }

  const current = data.serving[0] ?? null;
  const someoneAtCounter = current !== null;
  const queueName = data.queue.name;

  async function handleDelete() {
    if (
      !window.confirm(
        `Delete "${queueName}" and everyone in it? This can't be undone.`,
      )
    )
      return;
    if (await queue.deleteQueue()) router.replace("/queues");
  }

  return (
    <div className="space-y-6">
      <QueueHeader
        name={data.queue.name}
        waitingCount={data.waiting.length}
        avgServiceSeconds={data.avgServiceSeconds}
        disabled={busy !== null}
        onRename={queue.rename}
      />

      {error && (
        <p role="alert" className={errorBox}>
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Counter
            current={current}
            nextUp={data.waiting[0] ?? null}
            busy={busy}
            onServeNext={queue.serveNext}
            onComplete={queue.complete}
            onNoShow={queue.cancel}
          />

          <div className={panel}>
            <div className="border-b border-[#3b3832] p-5">
              <h2 className="font-semibold">
                In line{" "}
                <span className="font-normal text-[#7d786c] tabular-nums">
                  {data.waiting.length}
                </span>
              </h2>
              <AddPerson
                waiting={data.waiting}
                someoneAtCounter={someoneAtCounter}
                avgServiceSeconds={data.avgServiceSeconds}
                busy={busy}
                onAdd={queue.addPerson}
              />
            </div>
            <WaitingList
              waiting={data.waiting}
              someoneAtCounter={someoneAtCounter}
              avgServiceSeconds={data.avgServiceSeconds}
              disabled={busy !== null}
              onMove={queue.move}
              onRemove={queue.cancel}
            />
          </div>
        </div>

        <aside className="space-y-4">
          <History history={data.history} />
          <button
            onClick={handleDelete}
            disabled={busy !== null}
            className={`cursor-pointer rounded px-1 text-sm text-[#7d786c] hover:text-red-300 disabled:opacity-40 ${focusRing}`}
          >
            Delete this queue
          </button>
        </aside>
      </div>
    </div>
  );
}
