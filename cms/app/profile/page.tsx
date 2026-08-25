"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { getToken, signOutUser } from "@/firebase/auth";
import { useRole } from "@/hooks/useRole";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const STAFF_PROFILE_ENDPOINT = "http://127.0.0.1:42069/api/staff/profile";

interface StaffProfile {
  staff: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    department: string;
    queue: string[];
  };
  stats: {
    open: number;
    in_progress: number;
    closed: number;
    total: number;
    queue_size: number;
  };
}

function formatDate(value?: string) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function InfoCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-neutral-800">
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd className="mt-2 break-all text-sm font-medium text-gray-900 dark:text-gray-100">
        {children}
      </dd>
    </div>
  );
}

function StatCard({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: number;
  colorClass: string;
}) {
  return (
    <div className={`rounded-lg p-4 text-center ${colorClass}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide opacity-80">
        {label}
      </p>
    </div>
  );
}

export default function ProfilePage() {
  const { user, role, loading } = useRole();
  const router = useRouter();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [staffProfileLoading, setStaffProfileLoading] = useState(false);

  useEffect(() => {
    if (loading) {
      return;
    }
    if (!user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  // Fetch staff profile when role is staff
  useEffect(() => {
    const fetchStaffProfile = async () => {
      if (!user || loading || role !== "staff") return;

      setStaffProfileLoading(true);
      try {
        const token = await getToken();
        if (!token) return;

        const res = await fetch(STAFF_PROFILE_ENDPOINT, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setStaffProfile(data as StaffProfile);
        }
      } catch {
        // Silently fail — we still have Firebase profile info
      } finally {
        setStaffProfileLoading(false);
      }
    };

    fetchStaffProfile();
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

  if (!user) {
    return null;
  }

  const displayName =
    role === "staff" && staffProfile
      ? `${staffProfile.staff.first_name} ${staffProfile.staff.last_name}`
      : user.displayName ?? "Unknown";

  return (
    <DashboardShell
      role={role}
      userEmail={user.email}
      isSigningOut={isSigningOut}
      onSignOut={handleSignOut}
      currentPath="/profile"
    >
      {/* Profile Header */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xl font-bold text-white">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {displayName}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {user.email ?? "No email"}
              <span className="ml-2 inline-flex rounded-full border border-gray-300 px-2 py-0.5 text-xs font-medium capitalize text-gray-600 dark:border-neutral-700 dark:text-gray-300">
                {role}
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* Staff-specific info */}
      {role === "staff" && staffProfile && (
        <>
          {/* Stats row */}
          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              label="Total Assigned"
              value={staffProfile.stats.total}
              colorClass="bg-gray-50 text-gray-900 dark:bg-neutral-900 dark:text-gray-100"
            />
            <StatCard
              label="Open"
              value={staffProfile.stats.open}
              colorClass="bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300"
            />
            <StatCard
              label="In Progress"
              value={staffProfile.stats.in_progress}
              colorClass="bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
            />
            <StatCard
              label="Closed"
              value={staffProfile.stats.closed}
              colorClass="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
            />
            <StatCard
              label="In Queue"
              value={staffProfile.stats.queue_size}
              colorClass="bg-violet-50 text-violet-800 dark:bg-violet-950/30 dark:text-violet-300"
            />
          </section>

          {/* Staff details card */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Staff Details
            </h3>
            <dl className="mt-4 grid gap-4 md:grid-cols-2">
              <InfoCard label="Department">{staffProfile.staff.department}</InfoCard>
              <InfoCard label="Staff ID">
                <span className="font-mono text-xs">{staffProfile.staff.id}</span>
              </InfoCard>
              <InfoCard label="Full Name">
                {staffProfile.staff.first_name} {staffProfile.staff.last_name}
              </InfoCard>
              <InfoCard label="Email">{staffProfile.staff.email}</InfoCard>
            </dl>
          </section>
        </>
      )}

      {/* Account info (all roles) */}
      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Account Details
        </h3>
        <dl className="mt-4 grid gap-4 md:grid-cols-2">
          <InfoCard label="Email">{user.email ?? "Not available"}</InfoCard>
          <InfoCard label="Role">
            <span className="capitalize">{role}</span>
          </InfoCard>
          <InfoCard label="User ID">{user.uid}</InfoCard>
          <InfoCard label="Email Status">
            <span className={user.emailVerified ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
              {user.emailVerified ? "✓ Verified" : "⚠ Not verified"}
            </span>
          </InfoCard>
          <InfoCard label="Created">{formatDate(user.metadata.creationTime)}</InfoCard>
          <InfoCard label="Last Sign In">{formatDate(user.metadata.lastSignInTime)}</InfoCard>
        </dl>
      </section>

      {staffProfileLoading && (
        <div className="mt-4 flex items-center justify-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-blue-500 border-t-transparent" />
        </div>
      )}
    </DashboardShell>
  );
}
