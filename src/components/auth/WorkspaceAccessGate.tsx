"use client";

import { createContext, FormEvent, ReactNode, useContext, useEffect, useState } from "react";
import { KeyRound, LockKeyhole } from "lucide-react";

export type WorkspaceRole = "editor" | "viewer";
const WorkspaceAccessContext = createContext({ role: "editor" as WorkspaceRole, protected: false });

export function useWorkspaceRole() {
  return useContext(WorkspaceAccessContext).role;
}

export function useWorkspaceProtected() {
  return useContext(WorkspaceAccessContext).protected;
}

export function WorkspaceAccessGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [role, setRole] = useState<WorkspaceRole>("editor");
  const [protectedWorkspace, setProtectedWorkspace] = useState(false);
  const [accessKey, setAccessKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Workspace access is not configured.");
        setAuthenticated(Boolean(result.authenticated));
        setRole(result.role === "viewer" ? "viewer" : "editor");
        setProtectedWorkspace(Boolean(result.protected));
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not check workspace access."))
      .finally(() => setReady(true));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessKey }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not sign in.");
      window.location.reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return <div className="grid min-h-screen place-items-center bg-[#FBF9F5] text-sm text-stone-500">Checking workspace access…</div>;
  }

  if (authenticated) {
    return <WorkspaceAccessContext.Provider value={{ role, protected: protectedWorkspace }}>{children}</WorkspaceAccessContext.Provider>;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#FBF9F5] px-5 py-10">
      <section className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-7 shadow-sm">
        <div className="mb-6 grid h-11 w-11 place-items-center rounded-xl bg-stone-100 text-stone-700">
          {error ? <LockKeyhole className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Meeting Mind</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">This workspace is private</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">Enter the workspace access key to open meeting notes and decisions.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-stone-800" htmlFor="workspace-access-key">Workspace access key</label>
          <input
            id="workspace-access-key"
            autoComplete="current-password"
            type="password"
            value={accessKey}
            onChange={(event) => setAccessKey(event.target.value)}
            required
            className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
          />
          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          <button
            type="submit"
            disabled={busy || !accessKey}
            className="w-full rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Checking…" : "Continue"}
          </button>
        </form>
      </section>
    </main>
  );
}
