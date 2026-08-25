"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { getToken, signOutUser } from "@/firebase/auth";
import { useRole } from "@/hooks/useRole";
import { Complaint } from "@/models/complaint";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const USER_COMPLAINTS_ENDPOINT = "http://127.0.0.1:42069/api/users/complaints";
const STAFF_HISTORY_ENDPOINT = "http://127.0.0.1:42069/api/staff/history";
const STAFF_ALL_COMPLAINTS_ENDPOINT =
  "http://127.0.0.1:42069/api/staff/all_complaints";

interface StaffHistoryEntry {
  id: number;
  complaint_id: number;
  previous_status: string;
  new_status: string;
  changed_by: string;
  changed_by_role: string;
  changed_at: string;
  subject: string;
  department: string;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    in_progress:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    closed:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[status] ?? "bg-gray-100 text-gray-700"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    low: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    medium:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    critical:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[priority] ?? "bg-gray-100 text-gray-700"}`}
    >
      {priority}
    </span>
  );
}

export default function HistoryPage() {
  const { user, role, loading } = useRole();
  const router = useRouter();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  // User data
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  // Staff data
  const [staffHistory, setStaffHistory] = useState<StaffHistoryEntry[]>([]);
  const [staffComplaints, setStaffComplaints] = useState<Complaint[]>([]);
  const [staffTab, setStaffTab] = useState<"changes" | "all">("changes");

  useEffect(() => {
    if (loading) {
      return;
    }
    if (!user) {
      router.push("/login");
      return;
    }
    if (role === "admin") {
      router.push("/");
    }
  }, [loading, user, role, router]);

  useEffect(() => {
    const loadData = async () => {
      if (!user || loading || role === "admin") {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setHistoryError("");

      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Unauthorized: please sign in again.");
        }

        const headers = { Authorization: `Bearer ${token}` };

        if (role === "staff") {
          // Fetch both history and all complaints for staff
          const [histRes, compRes] = await Promise.all([
            fetch(STAFF_HISTORY_ENDPOINT, { headers }),
            fetch(STAFF_ALL_COMPLAINTS_ENDPOINT, { headers }),
          ]);

          if (!histRes.ok) {
            const d = await histRes.json();
            throw new Error(d.error || "Failed to fetch staff history");
          }
          if (!compRes.ok) {
            const d = await compRes.json();
            throw new Error(d.error || "Failed to fetch staff complaints");
          }

          const histData = await histRes.json();
          const compData = await compRes.json();

          setStaffHistory(Array.isArray(histData.history) ? histData.history : []);
          setStaffComplaints(
            Array.isArray(compData.complaints) ? compData.complaints : [],
          );
        } else {
          // User: fetch complaint history
          const response = await fetch(USER_COMPLAINTS_ENDPOINT, { headers });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || "Failed to fetch complaints");
          }
          setComplaints(
            Array.isArray(data.complaints) ? data.complaints : [],
          );
        }
      } catch (fetchError) {
        setHistoryError((fetchError as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, role]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOutUser();
    } finally {
      setIsSigningOut(false);
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

  if (!user || role === "admin") {
    return null;
  }

  const isStaff = role === "staff";
  const closedCount = isStaff
    ? staffComplaints.filter((c) => c.status === "closed").length
    : complaints.filter((c) => c.status === "closed").length;
  const totalCount = isStaff ? staffComplaints.length : complaints.length;

  return (
    <DashboardShell
      role={role}
      userEmail={user.email}
      isSigningOut={isSigningOut}
      onSignOut={handleSignOut}
      currentPath="/history"
    >
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {isStaff ? "Staff History" : "Complaint History"}
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {isStaff
                ? "Your status changes and all assigned complaints."
                : "All complaints submitted by your account."}
            </p>
          </div>

          {/* Quick stats */}
          {!isLoading && !historyError && totalCount > 0 && (
            <div className="flex gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-200">
                {totalCount} Total
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                {closedCount} Closed
              </span>
            </div>
          )}
        </div>

        {/* Staff tabs */}
        {isStaff && !isLoading && !historyError && (
          <div className="mt-4 flex border-b border-gray-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setStaffTab("changes")}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                staffTab === "changes"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              Status Changes ({staffHistory.length})
            </button>
            <button
              type="button"
              onClick={() => setStaffTab("all")}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                staffTab === "all"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              All Complaints ({staffComplaints.length})
            </button>
          </div>
        )}

        {isLoading && (
          <div className="mt-6 flex items-center justify-center py-8">
            <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-blue-500 border-t-transparent" />
          </div>
        )}

        {historyError && (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {historyError}
          </div>
        )}

        {/* ── Staff: Status Changes Tab ──────────────────────────── */}
        {isStaff && !isLoading && !historyError && staffTab === "changes" && (
          <>
            {staffHistory.length === 0 ? (
              <div className="mt-6 flex flex-col items-center gap-2 py-8">
                <div className="rounded-full bg-gray-100 p-3 dark:bg-neutral-800">
                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No status changes recorded yet.
                </p>
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-neutral-800">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-800">
                  <thead className="bg-gray-50 dark:bg-neutral-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                        Complaint
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                        From
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                        To
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                        Department
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                        When
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white dark:divide-neutral-800 dark:bg-neutral-950">
                    {staffHistory.map((entry) => (
                      <tr
                        key={entry.id}
                        className="transition-colors hover:bg-gray-50 dark:hover:bg-neutral-900"
                      >
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                          <span className="font-medium">#{entry.complaint_id}</span>{" "}
                          <span className="text-gray-500 dark:text-gray-400">
                            {entry.subject.length > 30
                              ? entry.subject.substring(0, 30) + "…"
                              : entry.subject}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={entry.previous_status || "—"} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={entry.new_status} />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                          {entry.department}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {entry.changed_at
                            ? new Date(entry.changed_at).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              router.push(`/complaint/${entry.complaint_id}`)
                            }
                            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── Staff: All Complaints Tab ────────────────────────── */}
        {isStaff && !isLoading && !historyError && staffTab === "all" && (
          <>
            {staffComplaints.length === 0 ? (
              <div className="mt-6 flex flex-col items-center gap-2 py-8">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No complaints have been assigned to you.
                </p>
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-neutral-800">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-800">
                  <thead className="bg-gray-50 dark:bg-neutral-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Subject</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Priority</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white dark:divide-neutral-800 dark:bg-neutral-950">
                    {staffComplaints.map((item) => (
                      <tr key={item.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-neutral-900">
                        <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200">{item.id}</td>
                        <td className="max-w-[200px] truncate px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{item.subject}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{item.department}</td>
                        <td className="px-4 py-3"><PriorityBadge priority={item.priority} /></td>
                        <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => router.push(`/complaint/${item.id}`)}
                            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── User: All Complaints ──────────────────────────────── */}
        {!isStaff && !isLoading && !historyError && complaints.length === 0 && (
          <div className="mt-6 flex flex-col items-center gap-2 py-8">
            <div className="rounded-full bg-gray-100 p-3 dark:bg-neutral-800">
              <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No complaints found. Create one from the Dashboard.
            </p>
          </div>
        )}

        {!isStaff && !isLoading && !historyError && complaints.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-neutral-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-800">
              <thead className="bg-gray-50 dark:bg-neutral-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-neutral-800 dark:bg-neutral-950">
                {complaints.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-neutral-900">
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200">{item.id}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{item.subject}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{item.department}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{item.category}</td>
                    <td className="px-4 py-3"><PriorityBadge priority={item.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => router.push(`/complaint/${item.id}`)}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
