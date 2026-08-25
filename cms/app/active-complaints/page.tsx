"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { getToken, signOutUser } from "@/firebase/auth";
import { useRole } from "@/hooks/useRole";
import { Complaint } from "@/models/complaint";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
const USER_ACTIVE_COMPLAINTS_ENDPOINT =
  "http://127.0.0.1:42069/api/users/active_complaints";
const STAFF_ACTIVE_COMPLAINTS_ENDPOINT =
  "http://127.0.0.1:42069/api/staff/active_complaints";

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

export default function ActiveComplaintsPage() {
  const { user, role, loading } = useRole();
  const router = useRouter();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isActiveLoading, setIsActiveLoading] = useState(true);
  const [activeError, setActiveError] = useState("");
  const [complaints, setComplaints] = useState<Complaint[]>([]);

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
    const loadActiveComplaints = async () => {
      if (!user || loading || role === "admin") {
        setIsActiveLoading(false);
        return;
      }

      setIsActiveLoading(true);
      setActiveError("");

      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Unauthorized: please sign in again.");
        }

        const endpoint =
          role === "staff"
            ? STAFF_ACTIVE_COMPLAINTS_ENDPOINT
            : USER_ACTIVE_COMPLAINTS_ENDPOINT;

        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch active complaints");
        }

        setComplaints(Array.isArray(data.complaints) ? data.complaints : []);
      } catch (fetchError) {
        setActiveError((fetchError as Error).message);
      } finally {
        setIsActiveLoading(false);
      }
    };

    loadActiveComplaints();
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

  const openCount = complaints.filter((c) => c.status === "open").length;
  const inProgressCount = complaints.filter((c) => c.status === "in_progress").length;

  return (
    <DashboardShell
      role={role}
      userEmail={user.email}
      isSigningOut={isSigningOut}
      onSignOut={handleSignOut}
      currentPath="/active-complaints"
    >
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {isStaff ? "Assigned Active Complaints" : "Active Complaints"}
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {isStaff
                ? "Open or in-progress complaints assigned to your queue."
                : "Complaints with open or in-progress status."}
            </p>
          </div>

          {/* Quick stat pills */}
          {!isActiveLoading && !activeError && complaints.length > 0 && (
            <div className="flex gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                {openCount} Open
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {inProgressCount} In Progress
              </span>
            </div>
          )}
        </div>

        {isActiveLoading && (
          <div className="mt-6 flex items-center justify-center py-8">
            <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-blue-500 border-t-transparent" />
          </div>
        )}

        {activeError && (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {activeError}
          </div>
        )}

        {!isActiveLoading && !activeError && complaints.length === 0 && (
          <div className="mt-6 flex flex-col items-center gap-2 py-8">
            <div className="rounded-full bg-gray-100 p-3 dark:bg-neutral-800">
              <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isStaff ? "No assigned active complaints." : "No active complaints found."}
            </p>
          </div>
        )}

        {!isActiveLoading && !activeError && complaints.length > 0 && (
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
                    <td className="px-4 py-3">
                      <PriorityBadge priority={item.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
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
