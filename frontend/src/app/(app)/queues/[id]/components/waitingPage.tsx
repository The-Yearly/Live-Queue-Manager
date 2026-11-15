import { useState } from "react";
import { useRerenderEvery } from "../page";
import { Token } from "@/lib/api";
import {
  formatDuration,
  sinceLabel,
  timeOfDay,
  tokenLabel,
} from "@/lib/format";
import { ChevronDown, ChevronUp, XIcon } from "lucide-react";
import { peopleAhead } from "../page";
import {
  smallButton,
  iconButton,
  dangerButton,
  secondaryButton,
} from "./uiStyles";
export function WaitingList({
  waiting,
  someoneAtCounter,
  avgServiceSeconds,
  disabled,
  onMove,
  onRemove,
}: {
  waiting: Token[];
  someoneAtCounter: boolean;
  avgServiceSeconds: number | null;
  disabled: boolean;
  onMove: (t: Token, direction: "up" | "down") => void;
  onRemove: (t: Token) => Promise<unknown>;
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  useRerenderEvery(15_000);

  if (waiting.length === 0) {
    return (
      <p className="px-5 py-10 text-center text-sm text-[#a39e91]">
        The line is empty. Add people as they arrive.
      </p>
    );
  }

  async function remove(t: Token) {
    await onRemove(t);
    setConfirmingId(null);
  }

  return (
    <ol>
      {waiting.map((t, i) => {
        const isFirst = i === 0;
        const isLast = i === waiting.length - 1;
        const ahead = peopleAhead(i, someoneAtCounter);
        const estimate =
          avgServiceSeconds === null
            ? ""
            : `in ~${formatDuration(ahead * avgServiceSeconds)}`;

        return (
          <li
            key={t.id}
            className={`flex items-center gap-4 border-b border-[#3b3832]/70 px-5 py-3 last:border-b-0 ${
              isFirst ? "bg-[#2a2823] shadow-[inset_3px_0_0_#e3a542]" : ""
            }`}
          >
            <span className="w-16 shrink-0 text-lg font-semibold tabular-nums">
              {tokenLabel(t.number)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{t.personName}</p>
              <p className="text-xs text-[#a39e91]">
                Joined {timeOfDay(t.createdAt)}, waiting{" "}
                {sinceLabel(t.createdAt, Date.now())}
              </p>
            </div>

            {confirmingId === t.id ? (
              <div className="flex items-center gap-1.5">
                <span className="hidden text-sm text-[#a39e91] sm:inline">
                  Remove from line?
                </span>
                <button
                  className={`${dangerButton} ${smallButton}`}
                  onClick={() => remove(t)}
                  disabled={disabled}
                >
                  Remove
                </button>
                <button
                  className={`${secondaryButton} ${smallButton}`}
                  onClick={() => setConfirmingId(null)}
                >
                  Keep
                </button>
              </div>
            ) : (
              <>
                <span
                  className={`hidden w-24 text-right text-sm tabular-nums sm:block ${
                    isFirst ? "font-medium text-[#e3a542]" : "text-[#a39e91]"
                  }`}
                >
                  {isFirst ? "Next" : estimate}
                </span>
                <div className="flex items-center gap-0.5">
                  <button
                    className={iconButton}
                    onClick={() => onMove(t, "up")}
                    disabled={disabled || isFirst}
                    aria-label={`Move ${t.personName} up`}
                  >
                    <ChevronUp />
                  </button>
                  <button
                    className={iconButton}
                    onClick={() => onMove(t, "down")}
                    disabled={disabled || isLast}
                    aria-label={`Move ${t.personName} down`}
                  >
                    <ChevronDown />
                  </button>
                  <button
                    className={`${iconButton} hover:bg-red-500/15 hover:text-red-300`}
                    onClick={() => setConfirmingId(t.id)}
                    disabled={disabled}
                    aria-label={`Remove ${t.personName} from the line`}
                  >
                    <XIcon />
                  </button>
                </div>
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}
