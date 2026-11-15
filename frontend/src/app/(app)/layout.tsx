"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { ChartColumn, ListIcon } from "lucide-react";

const NAV = [
  { href: "/queues", label: "Queues", icon: ListIcon },
  { href: "/dashboard", label: "Dashboard", icon: ChartColumn },
];

function Mark() {
  return (
    <span className="flex h-5 items-end gap-[3px]" aria-hidden>
      <span className="h-5 w-1.5 rounded-full bg-[#e3a542]" />
      <span className="h-4 w-1.5 rounded-full bg-[#ece7dc]/70" />
      <span className="h-3 w-1.5 rounded-full bg-[#ece7dc]/40" />
    </span>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { manager, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !manager) router.replace("/login");
  }, [loading, manager, router]);

  if (loading || !manager) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[#1d1c19] text-sm text-[#7d786c]"
        style={{ colorScheme: "dark" }}
      >
        Loading…
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#1d1c19] text-[#ece7dc]"
      style={{ colorScheme: "dark" }}
    >
      <header className="sticky top-0 z-10 border-b border-[#3b3832] bg-[#1d1c19]/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-stretch gap-8 px-4 sm:px-6">
          <Link
            href="/queues"
            className="flex items-center gap-2.5 font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e3a542]"
          >
            <Mark />
            <span className="hidden sm:inline">Queue Manager</span>
          </Link>
          <nav className="flex items-stretch gap-5">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`-mb-px flex items-center gap-1.5 border-b-2 text-sm font-medium focus-visible:outline-none focus-visible:text-[#ece7dc] ${
                    active
                      ? "border-[#e3a542] text-[#ece7dc]"
                      : "border-transparent text-[#a39e91] hover:text-[#ece7dc]"
                  }`}
                >
                  <Icon width={16} height={16} />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-4 text-sm">
            <span className="hidden text-[#a39e91] md:inline">
              {manager.name}
            </span>
            <button
              onClick={logout}
              className="cursor-pointer rounded-lg border border-[#3b3832] px-3 py-1.5 whitespace-nowrap text-[#ece7dc] hover:border-[#5a564c] hover:bg-[#26241f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3a542]"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
