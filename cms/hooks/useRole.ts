import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";

export type UserRole = "admin" | "staff" | "user";

export function useRole() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<UserRole>("user");
  // Initialize to true so we don't accidentally leak false before auth finishes
  const [isRoleLoading, setIsRoleLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadRole = async () => {
      // If auth is still loading, keep role loading true and wait
      if (authLoading) {
        if (isMounted) setIsRoleLoading(true);
        return;
      }

      // Auth finished loading, but no user is logged in
      if (!user) {
        if (isMounted) {
          setRole("user");
          setIsRoleLoading(false);
        }
        return;
      }

      // User is logged in, fetch the claims
      if (isMounted) setIsRoleLoading(true);
      try {
        const tokenResult = await user.getIdTokenResult();
        const claimRole = tokenResult.claims.role;

        if (isMounted) {
          if (claimRole === "admin" || claimRole === "staff" || claimRole === "user") {
            setRole(claimRole as UserRole);
          } else {
            setRole("user");
          }
        }
      } catch {
        if (isMounted) setRole("user");
      } finally {
        if (isMounted) setIsRoleLoading(false);
      }
    };

    loadRole();

    return () => {
      isMounted = false;
    };
  }, [user, authLoading]);

  // We return a combined loading state for convenience
  return { 
    role, 
    isRoleLoading, 
    user, 
    authLoading,
    // combined loading flag that is true if either auth or role is loading
    loading: authLoading || isRoleLoading 
  };
}
