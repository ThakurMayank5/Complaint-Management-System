"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { getToken, signOutUser } from "@/firebase/auth";
import { useRole } from "@/hooks/useRole";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type ManagedRole = "admin" | "staff";

const SUPER_ADMIN_EMAIL = "mayank.singh5t@gmail.com";
const CREATE_USER_ENDPOINT = "http://127.0.0.1:42069/super_admin/create";
const DEPARTMENTS = [
	"Police Department",
	"Municipal Corporation",
	"Health Department",
	"Electricity Department",
	"Transport Department",
] as const;

export default function SuperAdminPage() {
	const { user, role, loading } = useRole();
	const router = useRouter();
	const [isSigningOut, setIsSigningOut] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [department, setDepartment] = useState("");
	const [managedRole, setManagedRole] = useState<ManagedRole>("staff");



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

	const resetForm = () => {
		setFirstName("");
		setLastName("");
		setEmail("");
		setPassword("");
		setDepartment("");
		setManagedRole("staff");
	};

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError("");
		setSuccess("");

		if (managedRole === "staff" && !department.trim()) {
			setError("Department is required for staff role.");
			return;
		}

		setIsSubmitting(true);
		try {
			const token = await getToken();
			if (!token) {
				throw new Error("Unauthorized: please sign in again.");
			}

			const response = await fetch(CREATE_USER_ENDPOINT, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					email,
					password,
					first_name: firstName,
					last_name: lastName,
					department: managedRole === "staff" ? department : "",
					role: managedRole,
				}),
			});

			const data = await response.json();
			if (!response.ok) {
				throw new Error(data.error || "Failed to create user");
			}

			setSuccess(data.message || "User created successfully.");
			resetForm();
		} catch (submitError) {
			setError((submitError as Error).message);
		} finally {
			setIsSubmitting(false);
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
			currentPath="/super-admin"
		>
			<section className="mx-auto w-full max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
				<h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
					Super Admin - Create Admin or Staff
				</h2>
				<p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
					Create privileged users from here. Only super admin can access this page.
				</p>

				<form onSubmit={handleSubmit} className="mt-6 space-y-5">
					{error && (
						<div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
							{error}
						</div>
					)}

					{success && (
						<div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
							{success}
						</div>
					)}

					<div className="grid gap-5 md:grid-cols-2">
						<div>
							<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="firstName">
								First Name
							</label>
							<input
								id="firstName"
								type="text"
								value={firstName}
								onChange={(e) => setFirstName(e.target.value)}
								required
								disabled={isSubmitting}
								className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
							/>
						</div>

						<div>
							<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="lastName">
								Last Name
							</label>
							<input
								id="lastName"
								type="text"
								value={lastName}
								onChange={(e) => setLastName(e.target.value)}
								required
								disabled={isSubmitting}
								className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
							/>
						</div>
					</div>

					<div>
						<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="email">
							Email
						</label>
						<input
							id="email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							disabled={isSubmitting}
							className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
						/>
					</div>

					<div>
						<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="password">
							Password
						</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							disabled={isSubmitting}
							className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
						/>
					</div>

					<div>
						<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="role">
							Role
						</label>
						<select
							id="role"
							value={managedRole}
							onChange={(e) => setManagedRole(e.target.value as ManagedRole)}
							disabled={isSubmitting}
							className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
						>
							<option value="staff">Staff</option>
							<option value="admin">Admin</option>
						</select>
					</div>

					{managedRole === "staff" && (
						<div>
							<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="department">
								Department
							</label>
							<select
								id="department"
								value={department}
								onChange={(e) => setDepartment(e.target.value)}
								required={managedRole === "staff"}
								disabled={isSubmitting}
								className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
							>
								<option value="">Select department</option>
								{DEPARTMENTS.map((dep) => (
									<option key={dep} value={dep}>
										{dep}
									</option>
								))}
							</select>
						</div>
					)}

					<button
						type="submit"
						disabled={isSubmitting}
						className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{isSubmitting ? "Creating user..." : "Create User"}
					</button>
				</form>
			</section>
		</DashboardShell>
	);
}

