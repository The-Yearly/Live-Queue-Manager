import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { formatDuration } from "@/lib/format";
import { focusRing, textInput } from "../components/uiStyles";
export function QueueHeader({
  name,
  waitingCount,
  avgServiceSeconds,
  disabled,
  onRename,
}: {
  name: string;
  waitingCount: number;
  avgServiceSeconds: number | null;
  disabled: boolean;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);

  function save(newName: string) {
    setEditing(false);
    const trimmed = newName.trim();
    if (trimmed && trimmed !== name) onRename(trimmed);
  }

  return (
    <div>
      <Link
        href="/queues"
        className={`inline-flex items-center gap-1 rounded text-sm text-[#a39e91] hover:text-[#ece7dc] ${focusRing}`}
      >
        <ArrowLeft width={15} height={15} /> Queues
      </Link>

      {editing ? (
        <input
          autoFocus
          defaultValue={name}
          maxLength={100}
          aria-label="Queue name"
          className={`${textInput} mt-2 h-auto max-w-md py-1 text-2xl font-semibold tracking-tight`}
          onBlur={(e) => save(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") e.currentTarget.value = name;
            if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
          }}
        />
      ) : (
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          <button
            onClick={() => setEditing(true)}
            disabled={disabled}
            title="Rename"
            className={`cursor-text rounded text-left decoration-[#5a564c] decoration-dashed underline-offset-8 hover:underline ${focusRing}`}
          >
            {name}
          </button>
        </h1>
      )}

      <p className="mt-1.5 text-[#a39e91]">
        {waitingCount === 0 ? "Nobody in line" : `${waitingCount} in line`}
        {avgServiceSeconds !== null &&
          `, about ${formatDuration(avgServiceSeconds)} per person`}
      </p>
    </div>
  );
}
