import { signOut, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./config";
import { SignUpRequest } from "@/models/signup";

import { signInWithCustomToken } from "firebase/auth";

export async function loginUser(email: string, password: string) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error("Error during login:", error);
    throw error;
  }
}

// this sends http request to server at /signup endpoint to create a new user in the database and firebase authentication
// then signs in the user using the token received from the server with firebase
export async function signupUser(signUpRequest: SignUpRequest) {
  try {
    const response = await fetch("http://127.0.0.1:42069/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        first_name: signUpRequest.first_name,
        last_name: signUpRequest.last_name,
        email: signUpRequest.email,
        password: signUpRequest.password,
        dob: signUpRequest.dob,
        contact: signUpRequest.contact,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to create user");
    }

    // use token to authenticate with firebase

    const token = data.token;
    await signInWithCustomToken(auth, token);
  } catch (error) {
    console.error("Error during signup:", error);
    throw error;
  }
}

/**
 * Signs out the currently authenticated user and cleans up ALL state.
 * Cleanup order:
 * 1. Frontend global state (session tracker, listeners)
 * 2. Rust backend state (user data, login requests, etc.)
 * 3. Firebase authentication (triggers React state resets)
 */
export async function signOutUser() {
  try {
    await signOut(auth);
  } catch (error: unknown) {
    console.error("❌ Sign-out error:", error);
    throw error;
  }
}

/**
 * Gets the current authentication token for the user.
 * @returns True if a user is currently authenticated, false otherwise.
 */
export async function getToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) {
    console.warn("User is not authenticated");
    return null;
  }

  try {
    const token = await user.getIdToken();
    return token;
  } catch (error) {
    console.error("Error getting Firebase token:", error);
    return null;
  }
}
