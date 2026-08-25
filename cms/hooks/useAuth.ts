import { auth } from "../firebase/config";
import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useState } from "react";

/**
 * Custom hook to manage authentication state.
 * @returns An object containing the current user and loading state.
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);
  return { user, loading };
}