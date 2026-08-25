"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { getToken, signOutUser } from "@/firebase/auth";
import { useRole } from "@/hooks/useRole";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type UserRole = "admin" | "staff" | "user";

const SUPER_ADMIN_EMAIL = "mayank.singh5t@gmail.com";
const EXEC_ENDPOINT = "http://127.0.0.1:42069/super_admin/exec";
const QUERY_ENDPOINT = "http://127.0.0.1:42069/super_admin/query";

export default function SuperAdminOperationsPage() {
  const { user, role, loading } = useRole();
  const router = useRouter();

  const [isSigningOut, setIsSigningOut] = useState(false);

  const [execSql, setExecSql] = useState("");
  const [querySql, setQuerySql] = useState("");
  const [isExecLoading, setIsExecLoading] = useState(false);
  const [isQueryLoading, setIsQueryLoading] = useState(false);

  const [execMessage, setExecMessage] = useState("");
  const [execError, setExecError] = useState("");
  const [queryError, setQueryError] = useState("");
  const [queryResults, setQueryResults] = useState<Record<string, unknown>[]>([]);



  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    if (user.email?.toLowerCase() !== SUPER_ADMIN_EMAIL) {
      router.push("/");
    }
  }, [loading, user, router]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOutUser();
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleExec = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setExecError("");
    setExecMessage("");

    if (!execSql.trim()) {
      setExecError("Query is required.");
      return;
    }

    setIsExecLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Unauthorized: please sign in again.");
      }

      const response = await fetch(EXEC_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: execSql }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to execute SQL");
      }

      const rowsAffected = data.rowsAffected ?? 0;
      setExecMessage(`SQL executed successfully. Rows affected: ${rowsAffected}`);
    } catch (error) {
      setExecError((error as Error).message);
    } finally {
      setIsExecLoading(false);
    }
  };

  const handleQuery = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setQueryError("");
    setQueryResults([]);

    if (!querySql.trim()) {
      setQueryError("Query is required.");
      return;
    }

    setIsQueryLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Unauthorized: please sign in again.");
      }

      const response = await fetch(QUERY_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: querySql }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to run SQL query");
      }

      setQueryResults(Array.isArray(data.results) ? data.results : []);
    } catch (error) {
      setQueryError((error as Error).message);
    } finally {
      setIsQueryLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-xl rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-sm text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </main>
    );
  }

  if (!user || user.email?.toLowerCase() !== SUPER_ADMIN_EMAIL) {
    return null;
  }

  return (
    <DashboardShell
      role={role}
      userEmail={user.email}
      isSigningOut={isSigningOut}
      onSignOut={handleSignOut}
      currentPath="/super-admin/operations"
    >
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Execute SQL</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Executes SQL using super admin endpoint.
          </p>

          <form onSubmit={handleExec} className="mt-4 space-y-4">
            {execError && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {execError}
              </div>
            )}

            {execMessage && (
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                {execMessage}
              </div>
            )}

            <textarea
              value={execSql}
              onChange={(e) => setExecSql(e.target.value)}
              rows={8}
              placeholder="UPDATE complaints SET status='closed' WHERE id=1;"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 font-mono text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
              disabled={isExecLoading}
              required
            />

            <button
              type="submit"
              disabled={isExecLoading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isExecLoading ? "Executing..." : "Execute"}
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Query SQL</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Runs SQL query and returns result rows.
          </p>

          <form onSubmit={handleQuery} className="mt-4 space-y-4">
            {queryError && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {queryError}
              </div>
            )}

            <textarea
              value={querySql}
              onChange={(e) => setQuerySql(e.target.value)}
              rows={8}
              placeholder="SELECT id, subject, status FROM complaints ORDER BY id DESC LIMIT 10;"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 font-mono text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
              disabled={isQueryLoading}
              required
            />

            <button
              type="submit"
              disabled={isQueryLoading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isQueryLoading ? "Running..." : "Query"}
            </button>
          </form>

          {queryResults.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-neutral-800">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-800">
                <thead className="bg-gray-50 dark:bg-neutral-900">
                  <tr>
                    {Object.keys(queryResults[0]).map((col) => (
                      <th
                        key={col}
                        className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-neutral-800 dark:bg-neutral-950">
                  {queryResults.map((row, idx) => (
                    <tr key={idx}>
                      {Object.keys(queryResults[0]).map((col) => (
                        <td key={`${idx}-${col}`} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">
                          {String(row[col] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
