import { QueueDetail } from "@/lib/api";
import { tokenLabel } from "@/lib/format";
import { panel } from "./uiStyles";
export function History({ history }: { history: QueueDetail["history"] }) {
  return (
    <div className={panel}>
      <h2 className="border-b border-[#3b3832] px-5 py-3.5 font-semibold">
        Recently finished
      </h2>
      {history.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-[#a39e91]">
          People you serve or remove show up here.
        </p>
      ) : (
        <ul className="py-1">
          {history.map((h) => {
            const served = h.status === "SERVED";
            return (
              <li
                key={h.id}
                className="flex items-baseline gap-3 px-5 py-2 text-sm"
              >
                <span className="w-12 shrink-0 text-[#a39e91] tabular-nums">
                  {tokenLabel(h.number)}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate ${served ? "" : "text-[#7d786c] line-through"}`}
                >
                  {h.personName}
                </span>
                <span
                  className={`text-xs ${served ? "text-emerald-400/80" : "text-[#7d786c]"}`}
                >
                  {served ? "Served" : "Removed"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
