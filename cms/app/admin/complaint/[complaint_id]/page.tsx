"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { getToken, signOutUser } from "@/firebase/auth";
import { useRole } from "@/hooks/useRole";
import type {
  ComplaintDetailResponse,
  ComplaintHistoryEntry,
} from "@/models/complaint";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

type ComplaintStatus = "open" | "in_progress" | "closed";

const API_BASE = "http://127.0.0.1:42069";

const STATUS_OPTIONS: { label: string; value: ComplaintStatus }[] = [
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Closed", value: "closed" },
];

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

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    admin:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    staff:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    user: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[role] ?? "bg-gray-100 text-gray-700"}`}
    >
      {role}
    </span>
  );
}

function InfoField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
        {children}
      </dd>
    </div>
  );
}

function HistoryTimeline({ history }: { history: ComplaintHistoryEntry[] }) {
  if (!history || history.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No status changes recorded yet.
      </p>
    );
  }

  return (
    <div className="relative space-y-0">
      {history.map((entry, index) => (
        <div key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
          {/* Vertical line */}
          {index < history.length - 1 && (
            <div className="absolute left-[9px] top-5 h-full w-0.5 bg-gray-200 dark:bg-neutral-700" />
          )}

          {/* Dot */}
          <div className="relative z-10 mt-1 h-[18px] w-[18px] flex-shrink-0 rounded-full border-2 border-emerald-500 bg-white dark:bg-neutral-900" />

          {/* Content */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={entry.previous_status || "—"} />
              <span className="text-xs text-gray-400">→</span>
              <StatusBadge status={entry.new_status} />
              <RoleBadge role={entry.changed_by_role} />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {entry.changed_at
                ? new Date(entry.changed_at).toLocaleString()
                : "Unknown time"}
              {" · "}
              <span className="font-mono text-[10px]">{entry.changed_by.substring(0, 12)}…</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminComplaintDetailPage() {
  const { user, role, loading } = useRole();
  const router = useRouter();
  const params = useParams<{ complaint_id: string }>();
  const complaintId = Array.isArray(params.complaint_id)
    ? params.complaint_id[0]
    : params.complaint_id;

  const [isSigningOut, setIsSigningOut] = useState(false);

  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState("");
  const [details, setDetails] = useState<ComplaintDetailResponse | null>(null);

  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus>("open");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (role !== "admin") {
      router.push("/");
    }
  }, [loading, user, role, router]);

    const loadDetails = async () => {
      if (!user || loading || role !== "admin") {
        setIsDataLoading(false);
        return;
      }

      setIsDataLoading(true);
      setError("");

      try {
        if (!complaintId) throw new Error("Invalid complaint id.");

        const token = await getToken();
        if (!token) throw new Error("Unauthorized: please sign in again.");

        const res = await fetch(
          `${API_BASE}/api/admin/complaints/${complaintId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error || "Failed to fetch complaint details");

        setDetails(data as ComplaintDetailResponse);
        if (data.complaint?.status) {
          setSelectedStatus(data.complaint.status as ComplaintStatus);
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setIsDataLoading(false);
      }
    };

    loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, role, complaintId]);

  const handleUpdateStatus = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setStatusMessage("");
    setIsUpdatingStatus(true);

    try {
      if (!complaintId) throw new Error("Invalid complaint id.");

      const token = await getToken();
      if (!token) throw new Error("Unauthorized: please sign in again.");

      const res = await fetch(
        `${API_BASE}/api/admin/complaints/${complaintId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: selectedStatus }),
        },
      );

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to update complaint status");

      // Update local state
      setDetails((prev) =>
        prev
          ? {
              ...prev,
              complaint: { ...prev.complaint, status: selectedStatus },
            }
          : prev,
      );
      setStatusMessage(
        data.message || "Complaint status updated successfully.",
      );

      // Reload details to refresh history
      const reloadToken = await getToken();
      if (reloadToken) {
        const refreshRes = await fetch(
          `${API_BASE}/api/admin/complaints/${complaintId}`,
          { headers: { Authorization: `Bearer ${reloadToken}` } },
        );
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          setDetails(refreshData as ComplaintDetailResponse);
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

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
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Loading...
          </p>
        </div>
      </main>
    );
  }

  if (!user || role !== "admin") {
    return null;
  }

  return (
    <DashboardShell
      role={role}
      userEmail={user.email}
      isSigningOut={isSigningOut}
      onSignOut={handleSignOut}
      currentPath="/admin/search"
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Complaint #{complaintId}
        </h2>
        <button
          type="button"
          onClick={() => router.push("/admin/search")}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-neutral-700 dark:text-gray-200 dark:hover:bg-neutral-800"
        >
          ← Back to Search
        </button>
      </div>

      {isDataLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {!isDataLoading && !error && details && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Left: Complaint Details ──────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Complaint info card */}
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Complaint Details
              </h3>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <InfoField label="Subject">
                  {details.complaint.subject}
                </InfoField>
                <InfoField label="ID">{details.complaint.id}</InfoField>
                <div className="sm:col-span-2">
                  <InfoField label="Description">
                    <p className="whitespace-pre-wrap text-sm font-normal text-gray-700 dark:text-gray-300">
                      {details.complaint.description}
                    </p>
                  </InfoField>
                </div>
                <InfoField label="Department">
                  {details.complaint.department}
                </InfoField>
                <InfoField label="Category">
                  {details.complaint.category}
                </InfoField>
                <InfoField label="Location">
                  {details.complaint.location}
                </InfoField>
                <InfoField label="Priority">
                  <PriorityBadge priority={details.complaint.priority} />
                </InfoField>
                <InfoField label="Status">
                  <StatusBadge status={details.complaint.status} />
                </InfoField>
                <InfoField label="Created">
                  {details.complaint.created_at
                    ? new Date(details.complaint.created_at).toLocaleString()
                    : "—"}
                </InfoField>
              </dl>
            </section>

            {/* Filed by user card */}
            {details.filed_by_user && (
              <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Filed By
                </h3>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  <InfoField label="Name">
                    {details.filed_by_user.first_name}{" "}
                    {details.filed_by_user.last_name}
                  </InfoField>
                  <InfoField label="Email">
                    {details.filed_by_user.email}
                  </InfoField>
                  <InfoField label="User ID">
                    <span className="font-mono text-xs">
                      {details.filed_by_user.uid}
                    </span>
                  </InfoField>
                </dl>
              </section>
            )}

            {/* Assigned staff card */}
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Assigned Staff
              </h3>
              {details.assigned_staff ? (
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  <InfoField label="Name">
                    {details.assigned_staff.first_name}{" "}
                    {details.assigned_staff.last_name}
                  </InfoField>
                  <InfoField label="Email">
                    {details.assigned_staff.email}
                  </InfoField>
                  <InfoField label="Department">
                    {details.assigned_staff.department}
                  </InfoField>
                  <InfoField label="Staff ID">
                    <span className="font-mono text-xs">
                      {details.assigned_staff.id}
                    </span>
                  </InfoField>
                </dl>
              ) : (
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  No staff assigned to this complaint.
                </p>
              )}
            </section>
          </div>

          {/* ── Right: Status Update + History ──────────────────────── */}
          <div className="space-y-6">
            {/* Status update form */}
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Update Status
              </h3>
              <form onSubmit={handleUpdateStatus} className="mt-4 space-y-3">
                <div>
                  <label
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                    htmlFor="admin-complaint-status"
                  >
                    New Status
                  </label>
                  <select
                    id="admin-complaint-status"
                    value={selectedStatus}
                    onChange={(e) =>
                      setSelectedStatus(e.target.value as ComplaintStatus)
                    }
                    disabled={isUpdatingStatus}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-950 dark:text-gray-100"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={
                    isUpdatingStatus ||
                    selectedStatus === details.complaint.status
                  }
                  className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUpdatingStatus
                    ? "Updating status..."
                    : "Update Status"}
                </button>
              </form>

              {statusMessage && (
                <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                  {statusMessage}
                </div>
              )}
            </section>

            {/* History timeline */}
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                Status History
              </h3>
              <HistoryTimeline history={details.history} />
            </section>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
