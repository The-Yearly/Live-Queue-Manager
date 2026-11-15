import { Token } from "@/lib/api";
import { Action } from "../page";
import { timeOfDay, tokenLabel, formatDuration } from "@/lib/format";
import { secondsBetween } from "../page";
import {
  secondaryButton,
  panel,
  primaryButton,
  dangerButton,
} from "./uiStyles";
import { Bell, Check } from "lucide-react";
export function Counter({
  current,
  nextUp,
  busy,
  onServeNext,
  onComplete,
  onNoShow,
}: {
  current: Token | null;
  nextUp: Token | null;
  busy: Action | null;
  onServeNext: () => void;
  onComplete: (t: Token) => void;
  onNoShow: (t: Token) => void;
}) {
  const disabled = busy !== null;

  let callLabel = "Call next";
  if (busy === "serve") callLabel = "Calling…";
  else if (nextUp)
    callLabel = `${current ? "Finish and call" : "Call"} ${tokenLabel(nextUp.number)}`;

  return (
    <div className={`${panel} overflow-hidden`}>
      <div className="p-5 sm:p-6">
        <h2 className="text-sm text-[#a39e91]">At the counter</h2>

        {current ? (
          <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <div className="flex min-w-0 items-end gap-4">
              <span className="text-6xl leading-none font-semibold tracking-tight text-[#e3a542] tabular-nums">
                {tokenLabel(current.number)}
              </span>
              <div className="min-w-0 pb-0.5">
                <p className="truncate text-xl font-medium">
                  {current.personName}
                </p>
                {current.servedAt && (
                  <p className="text-sm text-[#a39e91]">
                    Called {timeOfDay(current.servedAt)} after{" "}
                    {formatDuration(
                      secondsBetween(current.createdAt, current.servedAt),
                    )}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                className={secondaryButton}
                onClick={() => onComplete(current)}
                disabled={disabled}
              >
                <Check width={16} height={16} /> Done
              </button>
              <button
                className={dangerButton}
                onClick={() => onNoShow(current)}
                disabled={disabled}
              >
                Didn't show up
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xl text-[#7d786c]">
            {nextUp ? "Free. Call the next person." : "Free"}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#3b3832] bg-[#211f1b] px-5 py-4 sm:px-6">
        <p className="min-w-0 text-sm text-[#a39e91]">
          {nextUp ? (
            <>
              Next is{" "}
              <span className="font-semibold text-[#ece7dc] tabular-nums">
                {tokenLabel(nextUp.number)}
              </span>
              , {nextUp.personName}
            </>
          ) : (
            "Nobody is waiting."
          )}
        </p>
        <button
          className={`${primaryButton} px-5`}
          onClick={onServeNext}
          disabled={disabled || !nextUp}
        >
          <Bell width={16} height={16} /> {callLabel}
        </button>
      </div>
    </div>
  );
}
