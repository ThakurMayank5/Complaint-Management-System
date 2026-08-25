"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { getToken, signOutUser } from "@/firebase/auth";
import { useRole } from "@/hooks/useRole";
import {
  CATEGORIES_BY_DEPARTMENT,
  DEPARTMENTS,
  PRIORITIES,
  STATUSES,
  type AdminComplaint,
} from "@/models/complaint";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";

const API_BASE = "http://127.0.0.1:42069";
const SEARCH_ENDPOINT = `${API_BASE}/api/admin/complaints/search`;

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

export default function AdminSearchPage() {
  const { user, role, loading } = useRole();
  const router = useRouter();

  const [isSigningOut, setIsSigningOut] = useState(false);

  // Search filters
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Results
  const [complaints, setComplaints] = useState<AdminComplaint[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Derived categories based on selected department
  const availableCategories = filterDepartment
    ? CATEGORIES_BY_DEPARTMENT[filterDepartment] ?? []
    : Object.values(CATEGORIES_BY_DEPARTMENT).flat();

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

  const performSearch = useCallback(
    async (pageNum: number) => {
      setIsSearching(true);
      setSearchError("");

      try {
        const token = await getToken();
        if (!token) throw new Error("Unauthorized");

        const params = new URLSearchParams();
        if (filterStatus) params.set("status", filterStatus);
        if (filterDepartment) params.set("department", filterDepartment);
        if (filterCategory) params.set("category", filterCategory);
        if (filterPriority) params.set("priority", filterPriority);
        if (searchQuery) params.set("q", searchQuery);
        if (fromDate) params.set("from_date", fromDate);
        if (toDate) params.set("to_date", toDate);
        params.set("page", String(pageNum));
        params.set("limit", "20");

        const res = await fetch(`${SEARCH_ENDPOINT}?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Search failed");
        }

        const data = await res.json();
        setComplaints(data.complaints ?? []);
        setTotal(data.total ?? 0);
        setPage(data.page ?? 1);
        setTotalPages(data.total_pages ?? 0);
      } catch (e) {
        setSearchError((e as Error).message);
      } finally {
        setIsSearching(false);
      }
    },
    [
      filterStatus,
      filterDepartment,
      filterCategory,
      filterPriority,
      searchQuery,
      fromDate,
      toDate,
    ],
  );

  // Auto-search on mount
  useEffect(() => {
    if (!loading && role === "admin" && user) {
      performSearch(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, role]);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    performSearch(1);
  };

  const handleClearFilters = () => {
    setFilterStatus("");
    setFilterDepartment("");
    setFilterCategory("");
    setFilterPriority("");
    setSearchQuery("");
    setFromDate("");
    setToDate("");
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

  const selectClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:border-neutral-700 dark:bg-neutral-950 dark:text-gray-100";

  return (
    <DashboardShell
      role={role}
      userEmail={user.email}
      isSigningOut={isSigningOut}
      onSignOut={handleSignOut}
      currentPath="/admin/search"
    >
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Search Complaints
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Filter and search all complaints in the system.
        </p>

        {/* ── Filter Form ──────────────────────────────────────────── */}
        <form
          onSubmit={handleSearchSubmit}
          className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {/* Text search */}
          <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
            <label
              htmlFor="search-query"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
            >
              Search (subject / description)
            </label>
            <input
              id="search-query"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type to search..."
              className={selectClass}
            />
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="filter-status"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
            >
              Status
            </label>
            <select
              id="filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={selectClass}
            >
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div>
            <label
              htmlFor="filter-department"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
            >
              Department
            </label>
            <select
              id="filter-department"
              value={filterDepartment}
              onChange={(e) => {
                setFilterDepartment(e.target.value);
                setFilterCategory("");
              }}
              className={selectClass}
            >
              <option value="">All</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label
              htmlFor="filter-category"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
            >
              Category
            </label>
            <select
              id="filter-category"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className={selectClass}
            >
              <option value="">All</option>
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label
              htmlFor="filter-priority"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
            >
              Priority
            </label>
            <select
              id="filter-priority"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className={selectClass}
            >
              <option value="">All</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div>
            <label
              htmlFor="from-date"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
            >
              From Date
            </label>
            <input
              id="from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className={selectClass}
            />
          </div>

          <div>
            <label
              htmlFor="to-date"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
            >
              To Date
            </label>
            <input
              id="to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className={selectClass}
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-end gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={isSearching}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
            >
              {isSearching ? "Searching..." : "Search"}
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-neutral-700 dark:text-gray-200 dark:hover:bg-neutral-800"
            >
              Clear Filters
            </button>
          </div>
        </form>

        {/* ── Error ──────────────────────────────────────────── */}
        {searchError && (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {searchError}
          </div>
        )}

        {/* ── Results Summary ──────────────────────────────────── */}
        {!isSearching && !searchError && (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
            {total} result{total !== 1 ? "s" : ""} found
            {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ""}
          </p>
        )}

        {/* ── Results Table ──────────────────────────────────────── */}
        {!isSearching && complaints.length > 0 && (
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
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                    Created
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-neutral-800 dark:bg-neutral-950">
                {complaints.map((c) => (
                  <tr
                    key={c.id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-neutral-900"
                  >
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                      {c.id}
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                      {c.subject}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                      {c.department}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                      {c.category}
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={c.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {c.created_at
                        ? new Date(c.created_at).toLocaleDateString()
                        : "—"}
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

        {/* ── Pagination ──────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || isSearching}
              onClick={() => {
                const p = page - 1;
                setPage(p);
                performSearch(p);
              }}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-40 dark:border-neutral-700 dark:text-gray-200 dark:hover:bg-neutral-800"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || isSearching}
              onClick={() => {
                const p = page + 1;
                setPage(p);
                performSearch(p);
              }}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-40 dark:border-neutral-700 dark:text-gray-200 dark:hover:bg-neutral-800"
            >
              Next
            </button>
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
