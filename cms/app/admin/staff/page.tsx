"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { getToken, signOutUser } from "@/firebase/auth";
import { useRole } from "@/hooks/useRole";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const API_BASE = "http://127.0.0.1:42069";
const STAFF_LIST_ENDPOINT = `${API_BASE}/api/admin/staff`;

interface StaffListEntry {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  queue_size: number;
  open: number;
  in_progress: number;
  closed: number;
  total: number;
}

const DEPARTMENT_COLORS: Record<string, string> = {
  "Police Department":
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  "Municipal Corporation":
    "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  "Health Department":
    "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  "Electricity Department":
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "Transport Department":
    "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
};

export default function AdminStaffPage() {
  const { user, role, loading } = useRole();
  const router = useRouter();

  const [isSigningOut, setIsSigningOut] = useState(false);

  const [staffList, setStaffList] = useState<StaffListEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");

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

  useEffect(() => {
  useEffect(() => {
    const fetchStaff = async () => {
      if (!user || loading || role !== "admin") {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const token = await getToken();
        if (!token) throw new Error("Unauthorized");

        const res = await fetch(STAFF_LIST_ENDPOINT, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch staff list");
        }

        const data = await res.json();
        setStaffList(Array.isArray(data.staff) ? data.staff : []);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStaff();
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

  // Get unique departments for filtering
  const departments = [
    ...new Set(staffList.map((s) => s.department)),
  ].sort();

  const filteredStaff = filterDepartment
    ? staffList.filter((s) => s.department === filterDepartment)
    : staffList;

  const totalStaff = staffList.length;
  const totalComplaints = staffList.reduce((sum, s) => sum + s.total, 0);

  return (
    <DashboardShell
      role={role}
      userEmail={user.email}
      isSigningOut={isSigningOut}
      onSignOut={handleSignOut}
      currentPath="/admin/staff"
    >
      {/* Header + Stats */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Staff Directory
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              All registered staff members and their complaint workload.
            </p>
          </div>

          {!isLoading && !error && (
            <div className="flex gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-200">
                {totalStaff} Staff
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                {totalComplaints} Complaints
              </span>
            </div>
          )}
        </div>

        {/* Department filter */}
        {!isLoading && !error && departments.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilterDepartment("")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filterDepartment === ""
                  ? "bg-emerald-600 text-white"
                  : "border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-neutral-700 dark:text-gray-300 dark:hover:bg-neutral-800"
              }`}
            >
              All ({staffList.length})
            </button>
            {departments.map((dept) => {
              const count = staffList.filter(
                (s) => s.department === dept,
              ).length;
              return (
                <button
                  key={dept}
                  type="button"
                  onClick={() =>
                    setFilterDepartment(
                      filterDepartment === dept ? "" : dept,
                    )
                  }
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    filterDepartment === dept
                      ? "bg-emerald-600 text-white"
                      : "border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-neutral-700 dark:text-gray-300 dark:hover:bg-neutral-800"
                  }`}
                >
                  {dept} ({count})
                </button>
              );
            })}
          </div>
        )}

        {isLoading && (
          <div className="mt-6 flex items-center justify-center py-8">
            <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-emerald-500 border-t-transparent" />
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {!isLoading && !error && filteredStaff.length === 0 && (
          <div className="mt-6 flex flex-col items-center gap-2 py-8">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No staff members found.
            </p>
          </div>
        )}

        {/* Staff cards grid */}
        {!isLoading && !error && filteredStaff.length > 0 && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredStaff.map((staff) => (
              <div
                key={staff.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {staff.first_name} {staff.last_name}
                    </h3>
                    <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                      {staff.email}
                    </p>
                  </div>
                  <span
                    className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                      DEPARTMENT_COLORS[staff.department] ??
                      "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {staff.department.replace(" Department", "")}
                  </span>
                </div>

                {/* Stats grid */}
                <div className="mt-4 grid grid-cols-4 gap-2">
                  <div className="rounded-lg bg-gray-50 p-2 text-center dark:bg-neutral-900">
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {staff.total}
                    </p>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Total
                    </p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-2 text-center dark:bg-blue-950/20">
                    <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                      {staff.open}
                    </p>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400">
                      Open
                    </p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-2 text-center dark:bg-amber-950/20">
                    <p className="text-lg font-bold text-amber-700 dark:text-amber-300">
                      {staff.in_progress}
                    </p>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
                      Active
                    </p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2 text-center dark:bg-emerald-950/20">
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                      {staff.closed}
                    </p>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                      Closed
                    </p>
                  </div>
                </div>

                {/* Queue info */}
                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-neutral-800">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Queue size: <span className="font-semibold text-gray-700 dark:text-gray-200">{staff.queue_size}</span>
                  </span>
                  <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500">
                    {staff.id.substring(0, 12)}…
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
