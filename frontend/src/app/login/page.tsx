"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

type Mode = "login" | "register";

const DEMO = { email: "admin@example.com", password: "password123" };

function Mark() {
  return (
    <span className="flex h-5 items-end gap-[3px]" aria-hidden>
      <span className="h-5 w-1.5 rounded-full bg-accent" />
      <span className="h-4 w-1.5 rounded-full bg-fg/70" />
      <span className="h-3 w-1.5 rounded-full bg-fg/40" />
    </span>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-faint">{hint}</span>}
    </label>
  );
}

function NowServingPanel() {
  return (
    <div className="hidden flex-col justify-between border-r border-line bg-surface p-10 lg:flex">
      <div className="flex items-center gap-2.5 font-semibold tracking-tight">
        <Mark />
        Queue Manager
      </div>

      <div aria-hidden>
        <p className="text-muted">Now serving</p>
        <p className="mt-2 text-[9rem] leading-none font-semibold tracking-tighter text-accent tabular-nums">
          A-014
        </p>
        <div className="mt-8 flex items-end gap-1.5">
          {Array.from({ length: 9 }, (_, i) => (
            <span
              key={i}
              className="h-8 w-2 rounded-full bg-fg/50"
              style={{ opacity: 1 - i * 0.09 }}
            />
          ))}
        </div>
        <p className="mt-3 text-sm text-faint">
          9 waiting, about 4 minutes each
        </p>
      </div>

      <p className="max-w-xs text-muted">
        Call the next person, see who's waiting and how long it's taking.
      </p>
    </div>
  );
}

export default function LoginPage() {
  const { manager, loading, login, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && manager) router.replace("/queues");
  }, [loading, manager, router]);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  function fillDemoAccount() {
    switchMode("login");
    setEmail(DEMO.email);
    setPassword(DEMO.password);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(name, email, password);
      router.replace("/queues");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "That didn't work. Check your details and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const isLogin = mode === "login";
  let submitLabel = isLogin ? "Sign in" : "Create account";
  if (busy) submitLabel = isLogin ? "Signing in…" : "Creating account…";

  return (
    <div className="grid min-h-screen bg-canvas text-fg lg:grid-cols-[1.1fr_1fr]">
      <NowServingPanel />

      <main className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2.5 font-semibold tracking-tight lg:hidden">
            <Mark />
            Queue Manager
          </div>

          <div
            className="grid grid-cols-2 rounded-lg border border-line bg-surface p-0.5"
            role="tablist"
          >
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => switchMode(m)}
                className={`h-9 cursor-pointer rounded-md text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
                  mode === m ? "bg-raised text-fg" : "text-muted hover:text-fg"
                }`}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <h1 className="mt-8 text-3xl font-semibold tracking-tight">
            {isLogin ? "Welcome back" : "Set up your counter"}
          </h1>
          <p className="mt-1.5 text-muted">
            {isLogin
              ? "Sign in to manage your queues."
              : "You can create your first queue right after."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {!isLogin && (
              <Field label="Your name">
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </Field>
            )}
            <Field label="Email">
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </Field>
            <Field
              label="Password"
              hint={isLogin ? undefined : "At least 8 characters"}
            >
              <div className="relative">
                <input
                  className="input pr-16"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={isLogin ? undefined : 8}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute top-1/2 right-1.5 h-7 -translate-y-1/2 cursor-pointer rounded-md px-2 text-xs font-medium text-muted hover:bg-raised hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </Field>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={busy}
            >
              {submitLabel}
            </button>
          </form>

          {isLogin && (
            <p className="mt-8 border-t border-line pt-5 text-sm text-faint">
              Just looking around?{" "}
              <button
                type="button"
                onClick={fillDemoAccount}
                className="cursor-pointer rounded font-medium text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Fill in the demo account
              </button>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
