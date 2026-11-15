import { Link } from "lucide-react";
import { focusRing } from "./uiStyles";
export function NotFound() {
  return (
    <div className="rounded-xl border border-dashed border-[#3b3832] px-6 py-16 text-center">
      <p className="text-lg font-medium">This queue doesn't exist</p>
      <p className="mt-1 text-[#a39e91]">It may have been deleted.</p>
      <Link
        href="/queues"
        className={`mt-5 inline-block rounded text-sm font-medium text-[#e3a542] underline decoration-[#e3a542]/40 underline-offset-4 hover:decoration-[#e3a542] ${focusRing}`}
      >
        See all queues
      </Link>
    </div>
  );
}

export function LoadingSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="h-8 w-56 animate-pulse rounded-md bg-[#2e2c26]" />
      <div className="h-48 animate-pulse rounded-xl bg-[#26241f]" />
      <div className="h-64 animate-pulse rounded-xl bg-[#26241f]" />
    </div>
  );
}
