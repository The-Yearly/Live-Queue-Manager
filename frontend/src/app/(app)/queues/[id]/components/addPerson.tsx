import { useState, useRef } from "react";
import { Token } from "@/lib/api";
import { tokenLabel } from "@/lib/format";
import { Plus } from "lucide-react";
import { Action, peopleAhead, describeWait } from "../page";
import { textInput, primaryButton } from "./uiStyles";
export function AddPerson({
  waiting,
  someoneAtCounter,
  avgServiceSeconds,
  busy,
  onAdd,
}: {
  waiting: Token[];
  someoneAtCounter: boolean;
  avgServiceSeconds: number | null;
  busy: Action | null;
  onAdd: (personName: string) => Promise<Token | null>;
}) {
  const [name, setName] = useState("");
  const [lastAdded, setLastAdded] = useState<Token | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const token = await onAdd(name.trim());
    if (!token) return;
    setLastAdded(token);
    setName("");
    inputRef.current?.focus();
  }

  const position = lastAdded
    ? waiting.findIndex((t) => t.id === lastAdded.id)
    : -1;

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="mt-3 flex flex-col gap-2 sm:flex-row"
      >
        <input
          ref={inputRef}
          className={textInput}
          placeholder="Name of the person who just arrived"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          aria-label="Name"
        />
        <button
          className={primaryButton}
          disabled={busy !== null || !name.trim()}
        >
          <Plus width={16} height={16} />{" "}
          {busy === "add" ? "Adding…" : "Add to line"}
        </button>
      </form>

      {lastAdded && (
        <p className="mt-3 text-sm text-[#a39e91]" aria-live="polite">
          Give {lastAdded.personName} token{" "}
          <span className="font-semibold text-[#e3a542] tabular-nums">
            {tokenLabel(lastAdded.number)}
          </span>
          .{" "}
          {position >= 0 &&
            describeWait(
              peopleAhead(position, someoneAtCounter),
              avgServiceSeconds,
            )}
        </p>
      )}
    </>
  );
}
