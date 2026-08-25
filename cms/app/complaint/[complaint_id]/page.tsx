"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { getToken, signOutUser } from "@/firebase/auth";
import { useRole } from "@/hooks/useRole";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

type ComplaintStatus = "open" | "in_progress" | "closed";

const COMPLAINT_STATUS_OPTIONS: { label: string; value: ComplaintStatus }[] = [
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Closed", value: "closed" },
];

interface ComplaintDetails {
  complaint: {
    id: number;
    subject: string;
    description: string;
    category: string;
    department: string;
    location: string;
    priority: string;
    status: string;
  };
  staff?: {
    id?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    department?: string;
    queue?: string[];
  };
}

const USER_COMPLAINT_DETAILS_ENDPOINT =
  "http://127.0.0.1:42069/api/users/get_complaint_details";
const STAFF_COMPLAINT_DETAILS_ENDPOINT =
  "http://127.0.0.1:42069/api/staff/get_complaint_details";
const STAFF_UPDATE_COMPLAINT_STATUS_ENDPOINT =
  "http://127.0.0.1:42069/api/staff/update_complaint_status";

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

export default function ComplaintDetailsPage() {
  const { user, role, loading } = useRole();
  const router = useRouter();
  const params = useParams<{ complaint_id: string }>();
  const complaintId = Array.isArray(params.complaint_id)
    ? params.complaint_id[0]
    : params.complaint_id;

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus>("open");
  const [details, setDetails] = useState<ComplaintDetails | null>(null);

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
    const loadDetails = async () => {
      if (!user || loading || role === "admin") {
        setIsDataLoading(false);
        return;
      }

      setIsDataLoading(true);
      setError("");

      try {
        if (!complaintId) {
          throw new Error("Invalid complaint id.");
        }

        const token = await getToken();
        if (!token) {
          throw new Error("Unauthorized: please sign in again.");
        }

        const endpoint =
          role === "staff"
            ? STAFF_COMPLAINT_DETAILS_ENDPOINT
            : USER_COMPLAINT_DETAILS_ENDPOINT;

        const response = await fetch(`${endpoint}/${complaintId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch complaint details");
        }

        setDetails(data as ComplaintDetails);
        if (data.complaint?.status) {
          setSelectedStatus(data.complaint.status as ComplaintStatus);
        }
      } catch (fetchError) {
        setError((fetchError as Error).message);
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
      if (!complaintId) {
        throw new Error("Invalid complaint id.");
      }

      const token = await getToken();
      if (!token) {
        throw new Error("Unauthorized: please sign in again.");
      }

      const response = await fetch(
        `${STAFF_UPDATE_COMPLAINT_STATUS_ENDPOINT}/${complaintId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: selectedStatus }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update complaint status");
      }

      setDetails((currentDetails) =>
        currentDetails
          ? {
              ...currentDetails,
              complaint: {
                ...currentDetails.complaint,
                status: selectedStatus,
              },
            }
          : currentDetails,
      );
      setStatusMessage(data.message || "Complaint status updated successfully.");
    } catch (updateError) {
      setError((updateError as Error).message);
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
          <p className="text-sm text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </main>
    );
  }

  if (!user || role === "admin") {
    return null;
  }

  const isStaff = role === "staff";

  return (
    <DashboardShell
      role={role}
      userEmail={user.email}
      isSigningOut={isSigningOut}
      onSignOut={handleSignOut}
      currentPath={isStaff ? "/active-complaints" : "/history"}
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Complaint #{complaintId}
        </h2>
        <button
          type="button"
          onClick={() => router.push(isStaff ? "/active-complaints" : "/history")}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-neutral-700 dark:text-gray-200 dark:hover:bg-neutral-800"
        >
          ← {isStaff ? "Back to Active" : "Back to History"}
        </button>
      </div>

      {isDataLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {!isDataLoading && !error && details && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Left: Complaint Details ────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Complaint Details
              </h3>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <InfoField label="Subject">{details.complaint.subject}</InfoField>
                <InfoField label="ID">{details.complaint.id}</InfoField>
                <div className="sm:col-span-2">
                  <InfoField label="Description">
                    <p className="whitespace-pre-wrap text-sm font-normal text-gray-700 dark:text-gray-300">
                      {details.complaint.description}
                    </p>
                  </InfoField>
                </div>
                <InfoField label="Department">{details.complaint.department}</InfoField>
                <InfoField label="Category">{details.complaint.category}</InfoField>
                <InfoField label="Location">{details.complaint.location}</InfoField>
                <InfoField label="Priority">
                  <PriorityBadge priority={details.complaint.priority} />
                </InfoField>
                <InfoField label="Status">
                  <StatusBadge status={details.complaint.status} />
                </InfoField>
              </dl>
            </section>

            {/* Assigned Staff info (visible for users) */}
            {!isStaff && (
              <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Assigned Staff
                </h3>
                {details.staff?.id ? (
                  <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    <InfoField label="Name">
                      {details.staff.first_name} {details.staff.last_name}
                    </InfoField>
                    <InfoField label="Email">{details.staff.email}</InfoField>
                    <InfoField label="Department">{details.staff.department}</InfoField>
                  </dl>
                ) : (
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    No staff assigned to this complaint.
                  </p>
                )}
              </section>
            )}
          </div>

          {/* ── Right: Status Update (staff only) ────────────── */}
          <div className="space-y-6">
            {isStaff && (
              <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Update Status
                </h3>
                <form onSubmit={handleUpdateStatus} className="mt-4 space-y-3">
                  <div>
                    <label
                      className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                      htmlFor="complaint-status"
                    >
                      New Status
                    </label>
                    <select
                      id="complaint-status"
                      value={selectedStatus}
                      onChange={(event) =>
                        setSelectedStatus(event.target.value as ComplaintStatus)
                      }
                      disabled={isUpdatingStatus}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-950 dark:text-gray-100"
                    >
                      {COMPLAINT_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isUpdatingStatus || selectedStatus === details.complaint.status}
                    className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isUpdatingStatus ? "Updating status..." : "Update Status"}
                  </button>
                </form>

                {statusMessage && (
                  <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                    {statusMessage}
                  </div>
                )}
              </section>
            )}

            {/* Quick info card for users */}
            {!isStaff && (
              <section className="rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/40 dark:bg-blue-950/20">
                <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                  Complaint Status
                </h3>
                <div className="mt-3 flex items-center gap-3">
                  <StatusBadge status={details.complaint.status} />
                  <span className="text-sm text-blue-700 dark:text-blue-200">
                    {details.complaint.status === "open" && "Your complaint is being reviewed."}
                    {details.complaint.status === "in_progress" && "A staff member is working on this."}
                    {details.complaint.status === "closed" && "This complaint has been resolved."}
                  </span>
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
