"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { getToken, signOutUser } from "@/firebase/auth";
import { useRole, type UserRole } from "@/hooks/useRole";
import {
  CATEGORIES_BY_DEPARTMENT,
  DEPARTMENTS,
  PRIORITIES,
  type AdminComplaint,
  type DashboardStats,
  type StaffStatEntry,
} from "@/models/complaint";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const API_BASE = "http://127.0.0.1:42069";
const USER_COMPLAINTS_ENDPOINT = `${API_BASE}/api/users/new_complaint`;
const ADMIN_STATS_ENDPOINT = `${API_BASE}/api/admin/dashboard/stats`;
const ADMIN_STAFF_STATS_ENDPOINT = `${API_BASE}/api/admin/dashboard/staff_stats`;
const ADMIN_RECENT_ENDPOINT = `${API_BASE}/api/admin/complaints`;

const STATUS_COLORS: Record<string, string> = {
  open: "#3b82f6",
  in_progress: "#f59e0b",
  closed: "#10b981",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "#6ee7b7",
  medium: "#fbbf24",
  high: "#f97316",
  critical: "#ef4444",
};

const DEPARTMENT_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
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

// ─── Admin Dashboard Component ───────────────────────────────────────────────

function AdminDashboard({
  role,
  user,
  isSigningOut,
  onSignOut,
}: {
  role: UserRole;
  user: { email: string | null; uid: string };
  isSigningOut: boolean;
  onSignOut: () => Promise<void>;
}) {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [staffStats, setStaffStats] = useState<StaffStatEntry[]>([]);
  const [recentComplaints, setRecentComplaints] = useState<AdminComplaint[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      setError("");
      try {
        const token = await getToken();
        if (!token) throw new Error("Unauthorized");

        const headers = { Authorization: `Bearer ${token}` };

        const [statsRes, staffRes, recentRes] = await Promise.all([
          fetch(ADMIN_STATS_ENDPOINT, { headers }),
          fetch(ADMIN_STAFF_STATS_ENDPOINT, { headers }),
          fetch(`${ADMIN_RECENT_ENDPOINT}?limit=10`, { headers }),
        ]);

        if (!statsRes.ok) throw new Error("Failed to fetch dashboard stats");
        if (!staffRes.ok) throw new Error("Failed to fetch staff stats");
        if (!recentRes.ok)
          throw new Error("Failed to fetch recent complaints");

        const statsData = (await statsRes.json()) as DashboardStats;
        const staffData = (await staffRes.json()) as {
          staff_stats: StaffStatEntry[];
        };
        const recentData = (await recentRes.json()) as {
          complaints: AdminComplaint[];
        };

        setStats(statsData);
        setStaffStats(staffData.staff_stats ?? []);
        setRecentComplaints(recentData.complaints ?? []);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAll();
  }, []);

  const statusPieData =
    stats?.status_counts?.map((sc) => ({
      name: sc.status.replace("_", " "),
      value: sc.count,
      fill: STATUS_COLORS[sc.status] ?? "#94a3b8",
    })) ?? [];

  const departmentBarData =
    stats?.department_counts?.map((dc) => ({
      name:
        dc.department.length > 15
          ? dc.department.substring(0, 12) + "…"
          : dc.department,
      fullName: dc.department,
      count: dc.count,
    })) ?? [];

  const staffBarData = staffStats.map((s) => ({
    name: `${s.first_name} ${s.last_name.charAt(0)}.`,
    open: s.open,
    in_progress: s.in_progress,
    closed: s.closed,
  }));

  const openCount =
    stats?.status_counts?.find((s) => s.status === "open")?.count ?? 0;
  const inProgressCount =
    stats?.status_counts?.find((s) => s.status === "in_progress")?.count ?? 0;
  const closedCount =
    stats?.status_counts?.find((s) => s.status === "closed")?.count ?? 0;

  return (
    <DashboardShell
      role={role}
      userEmail={user.email}
      isSigningOut={isSigningOut}
      onSignOut={onSignOut}
      currentPath="/"
    >
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {!isLoading && !error && stats && (
        <>
          {/* ── Stat Cards ──────────────────────────────────────────── */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Total Complaints
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.total}
              </p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                Open
              </p>
              <p className="mt-2 text-3xl font-bold text-blue-700 dark:text-blue-300">
                {openCount}
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                In Progress
              </p>
              <p className="mt-2 text-3xl font-bold text-amber-700 dark:text-amber-300">
                {inProgressCount}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                Closed
              </p>
              <p className="mt-2 text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                {closedCount}
              </p>
            </div>
          </section>

          {/* ── Charts Row: Pie + Department Bar ────────────────────── */}
          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Status Pie Chart */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Complaints by Status
              </h3>
              {statusPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`status-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="mt-4 text-sm text-gray-500">No data available</p>
              )}
            </div>

            {/* Department Bar Chart */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Complaints by Department
              </h3>
              {departmentBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={departmentBarData}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis allowDecimals={false} />
                    <Tooltip
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.fullName ?? ""
                      }
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {departmentBarData.map((_, index) => (
                        <Cell
                          key={`dept-${index}`}
                          fill={DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="mt-4 text-sm text-gray-500">No data available</p>
              )}
            </div>
          </section>

          {/* ── Staff Performance Chart ──────────────────────────────── */}
          {staffBarData.length > 0 && (
            <section className="mt-6">
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Staff Complaint Load
                </h3>
                <ResponsiveContainer width="100%" height={Math.max(200, staffBarData.length * 48)}>
                  <BarChart
                    data={staffBarData}
                    layout="vertical"
                    margin={{ left: 20 }}
                  >
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fontSize: 12 }}
                      width={100}
                    />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="open"
                      stackId="a"
                      fill={STATUS_COLORS.open}
                      name="Open"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="in_progress"
                      stackId="a"
                      fill={STATUS_COLORS.in_progress}
                      name="In Progress"
                    />
                    <Bar
                      dataKey="closed"
                      stackId="a"
                      fill={STATUS_COLORS.closed}
                      name="Closed"
                      radius={[0, 6, 6, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* ── Recent Complaints Table ──────────────────────────────── */}
          <section className="mt-6">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Recent Complaints
                </h3>
                <button
                  type="button"
                  onClick={() => router.push("/admin/search")}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                >
                  View all →
                </button>
              </div>

              {recentComplaints.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">
                  No complaints found.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-neutral-800">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-800">
                    <thead className="bg-gray-50 dark:bg-neutral-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                          ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                          Subject
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                          Department
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                          Priority
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                          Status
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white dark:divide-neutral-800 dark:bg-neutral-950">
                      {recentComplaints.map((c) => (
                        <tr
                          key={c.id}
                          className="transition-colors hover:bg-gray-50 dark:hover:bg-neutral-900"
                        >
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                            {c.id}
                          </td>
                          <td className="max-w-[200px] truncate px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                            {c.subject}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                            {c.department}
                          </td>
                          <td className="px-4 py-3">
                            <PriorityBadge priority={c.priority} />
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={c.status} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                router.push(`/admin/complaint/${c.id}`)
                              }
                              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
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
            </div>
          </section>
        </>
      )}
    </DashboardShell>
  );
}

// ─── Main Page Component ───────────────────────────────────────────────────

export default function Home() {
  const { user, role, loading } = useRole();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showCreateComplaint, setShowCreateComplaint] = useState(false);
  const [isCreatingComplaint, setIsCreatingComplaint] = useState(false);
  const [complaintError, setComplaintError] = useState("");
  const [complaintSuccess, setComplaintSuccess] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState<(typeof DEPARTMENTS)[number]>(
    DEPARTMENTS[0],
  );
  const [category, setCategory] = useState(CATEGORIES_BY_DEPARTMENT[DEPARTMENTS[0]][0]);
  const [location, setLocation] = useState("");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>("medium");

  const router = useRouter();

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOutUser();
    } finally {
      setIsSigningOut(false);
    }
  };

  const resetComplaintForm = () => {
    setSubject("");
    setDescription("");
    setDepartment(DEPARTMENTS[0]);
    setCategory(CATEGORIES_BY_DEPARTMENT[DEPARTMENTS[0]][0]);
    setLocation("");
    setPriority("medium");
  };

  const handleDepartmentChange = (value: (typeof DEPARTMENTS)[number]) => {
    setDepartment(value);
    setCategory(CATEGORIES_BY_DEPARTMENT[value][0]);
  };

  const handleCreateComplaint = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setComplaintError("");
    setComplaintSuccess("");
    setIsCreatingComplaint(true);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Unauthorized: please sign in again.");
      }

      const response = await fetch(USER_COMPLAINTS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject,
          description,
          category,
          department,
          location,
          priority,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create complaint");
      }

      setComplaintSuccess(data.message || "Complaint created successfully.");
      resetComplaintForm();
      setShowCreateComplaint(false);
    } catch (createError) {
      setComplaintError((createError as Error).message);
    } finally {
      setIsCreatingComplaint(false);
    }
  };

  useEffect(() => {
    if (loading) {
      return;
    }
    if (!user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-xl rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-sm text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  // ── Admin gets their own dashboard ──
  if (role === "admin") {
    return (
      <AdminDashboard
        role="admin"
        user={{ email: user.email, uid: user.uid }}
        isSigningOut={isSigningOut}
        onSignOut={handleSignOut}
      />
    );
  }

  // ── User / Staff dashboard (unchanged) ──
  return (
    <DashboardShell
      role={role ?? "user"}
      userEmail={user.email}
      isSigningOut={isSigningOut}
      onSignOut={handleSignOut}
      currentPath="/"
    >
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-lg font-semibold">Welcome</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            This is your main workspace shell. Share your detailed modules and I will plug
            them into this layout.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-lg font-semibold">Role Status</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {loading
              ? "Loading role..."
              : `Current role: ${(role ?? "user").charAt(0).toUpperCase()}${(role ?? "user").slice(1)}`}
          </p>
        </div>
      </section>

      {!loading && role === "staff" && (
        <section className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Staff View</h3>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-200">
            Staff tools and assigned workflow access are active.
          </p>
        </section>
      )}

      {!loading && role === "user" && (
        <section className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-5 dark:border-sky-900/60 dark:bg-sky-950/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-sky-800 dark:text-sky-300">User View</h3>
              <p className="mt-1 text-sm text-sky-700 dark:text-sky-200">
                Create and submit complaints from your dashboard.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setComplaintError("");
                setComplaintSuccess("");
                setShowCreateComplaint((prev) => !prev);
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              {showCreateComplaint ? "Close" : "Create Complaint"}
            </button>
          </div>

          {complaintError && (
            <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {complaintError}
            </div>
          )}

          {complaintSuccess && (
            <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              {complaintSuccess}
            </div>
          )}

          {showCreateComplaint && (
            <form onSubmit={handleCreateComplaint} className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-sky-900 dark:text-sky-200" htmlFor="subject">
                  Subject
                </label>
                <input
                  id="subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  disabled={isCreatingComplaint}
                  className="w-full rounded-lg border border-sky-300 bg-white px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60 dark:border-sky-900 dark:bg-neutral-900 dark:text-gray-100"
                />
              </div>

              <div className="md:col-span-2">
                <label
                  className="mb-2 block text-sm font-medium text-sky-900 dark:text-sky-200"
                  htmlFor="description"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  disabled={isCreatingComplaint}
                  rows={4}
                  className="w-full rounded-lg border border-sky-300 bg-white px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60 dark:border-sky-900 dark:bg-neutral-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-sky-900 dark:text-sky-200" htmlFor="department">
                  Department
                </label>
                <select
                  id="department"
                  value={department}
                  onChange={(e) => handleDepartmentChange(e.target.value as (typeof DEPARTMENTS)[number])}
                  disabled={isCreatingComplaint}
                  className="w-full rounded-lg border border-sky-300 bg-white px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60 dark:border-sky-900 dark:bg-neutral-900 dark:text-gray-100"
                >
                  {DEPARTMENTS.map((dep) => (
                    <option key={dep} value={dep}>
                      {dep}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-sky-900 dark:text-sky-200" htmlFor="category">
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isCreatingComplaint}
                  className="w-full rounded-lg border border-sky-300 bg-white px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60 dark:border-sky-900 dark:bg-neutral-900 dark:text-gray-100"
                >
                  {CATEGORIES_BY_DEPARTMENT[department].map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-sky-900 dark:text-sky-200" htmlFor="location">
                  Location
                </label>
                <input
                  id="location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                  disabled={isCreatingComplaint}
                  className="w-full rounded-lg border border-sky-300 bg-white px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60 dark:border-sky-900 dark:bg-neutral-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-sky-900 dark:text-sky-200" htmlFor="priority">
                  Priority
                </label>
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as (typeof PRIORITIES)[number])}
                  disabled={isCreatingComplaint}
                  className="w-full rounded-lg border border-sky-300 bg-white px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60 dark:border-sky-900 dark:bg-neutral-900 dark:text-gray-100"
                >
                  {PRIORITIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={isCreatingComplaint}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreatingComplaint ? "Submitting complaint..." : "Submit Complaint"}
                </button>
              </div>
            </form>
          )}
        </section>
      )}
    </DashboardShell>
  );
}
