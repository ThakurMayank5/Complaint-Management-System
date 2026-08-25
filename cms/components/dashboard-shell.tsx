"use client";

import {
  ClipboardList,
  Clock3,
  Database,
  History,
  LayoutDashboard,
  LogOut,
  Search,
  User,
  Shield,
  UserPlus,
  UserCircle,
  Users,
} from "lucide-react";
import Link from "next/link";
import React from "react";

type UserRole = "admin" | "staff" | "user";

interface DashboardShellProps {
  role: UserRole;
  userEmail?: string | null;
  isSigningOut: boolean;
  onSignOut: () => Promise<void>;
  currentPath?: string;
  children: React.ReactNode;
}

function getRoleLabel(role: UserRole) {
  if (role === "admin") {
    return "Admin";
  }

  if (role === "staff") {
    return "Staff";
  }

  return "User";
}

function getRoleIcon(role: UserRole) {
  if (role === "admin") {
    return <Shield size={16} />;
  }

  if (role === "staff") {
    return <Users size={16} />;
  }

  return <UserCircle size={16} />;
}

export function DashboardShell({
  role,
  userEmail,
  isSigningOut,
  onSignOut,
  currentPath,
  children,
}: DashboardShellProps) {
  const roleLabel = getRoleLabel(role);
  const isSuperAdmin = userEmail?.toLowerCase() === "mayank.singh5t@gmail.com";
  const isDashboardActive = currentPath === "/";
  const isHistoryActive = currentPath === "/history";
  const isActiveComplaintsActive = currentPath === "/active-complaints";
  const isProfileActive = currentPath === "/profile";
  const isAdminSearchActive = currentPath === "/admin/search";
  const isAdminStaffActive = currentPath === "/admin/staff";
  const isSuperAdminActive = currentPath === "/super-admin";
  const isSuperAdminOpsActive = currentPath === "/super-admin/operations";

  return (
    <main className="min-h-screen bg-gray-100 text-gray-900 dark:bg-neutral-950 dark:text-gray-100">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl md:grid-cols-[260px_1fr]">
        <aside className="hidden border-r border-gray-200 bg-white px-5 py-6 dark:border-neutral-800 dark:bg-neutral-900 md:block">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-600 p-2 text-white">
              <LayoutDashboard size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold">CMS Workspace</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Role based portal</p>
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            {role === "user" ? (
              <>
                <Link
                  href="/"
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isDashboardActive
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                      : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-neutral-800"
                  }`}
                >
                  <ClipboardList size={16} />
                  <span>Dashboard</span>
                </Link>

                <Link
                  href="/history"
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isHistoryActive
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                      : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-neutral-800"
                  }`}
                >
                  <History size={16} />
                  <span>History</span>
                </Link>

                <Link
                  href="/active-complaints"
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActiveComplaintsActive
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                      : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-neutral-800"
                  }`}
                >
                  <Clock3 size={16} />
                  <span>Active Complaints</span>
                </Link>
              </>
            ) : role === "staff" ? (
              <>
                <Link
                  href="/"
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isDashboardActive
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                      : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-neutral-800"
                  }`}
                >
                  <ClipboardList size={16} />
                  <span>Dashboard</span>
                </Link>

                <Link
                  href="/active-complaints"
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActiveComplaintsActive
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                      : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-neutral-800"
                  }`}
                >
                  <Clock3 size={16} />
                  <span>Active Complaints</span>
                </Link>

                <Link
                  href="/history"
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isHistoryActive
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                      : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-neutral-800"
                  }`}
                >
                  <History size={16} />
                  <span>History</span>
                </Link>

                <Link
                  href="/profile"
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isProfileActive
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                      : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-neutral-800"
                  }`}
                >
                  <User size={16} />
                  <span>Profile</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/"
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isDashboardActive
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                      : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-neutral-800"
                  }`}
                >
                  <LayoutDashboard size={16} />
                  <span>Dashboard</span>
                </Link>

                <Link
                  href="/admin/search"
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isAdminSearchActive
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                      : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-neutral-800"
                  }`}
                >
                  <Search size={16} />
                  <span>Search Complaints</span>
                </Link>

                <Link
                  href="/admin/staff"
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isAdminStaffActive
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                      : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-neutral-800"
                  }`}
                >
                  <Users size={16} />
                  <span>Staff</span>
                </Link>

                <Link
                  href="/profile"
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isProfileActive
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                      : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-neutral-800"
                  }`}
                >
                  <User size={16} />
                  <span>Profile</span>
                </Link>
              </>
            )}

            {isSuperAdmin && (
              <>
                <Link
                  href="/super-admin"
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isSuperAdminActive
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                      : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-neutral-800"
                  }`}
                >
                  <UserPlus size={16} />
                  <span>Manage Admin / Staff</span>
                </Link>

                <Link
                  href="/super-admin/operations"
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isSuperAdminOpsActive
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                      : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-neutral-800"
                  }`}
                >
                  <Database size={16} />
                  <span>Execute / Query</span>
                </Link>
              </>
            )}
          </nav>
        </aside>

        <section className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90 md:px-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-base font-semibold md:text-lg">Complaint Management System</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Signed in as {userEmail ?? "Unknown user"}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 dark:border-neutral-700 dark:text-gray-200">
                  {getRoleIcon(role)}
                  {roleLabel}
                </span>

                <button
                  type="button"
                  onClick={onSignOut}
                  disabled={isSigningOut}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LogOut size={16} />
                  <span>{isSigningOut ? "Signing out..." : "Sign Out"}</span>
                </button>
              </div>
            </div>
          </header>

          <div className="flex-1 px-4 py-6 md:px-6 md:py-8">{children}</div>
        </section>
      </div>
    </main>
  );
}
