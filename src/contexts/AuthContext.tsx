import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { authClient, clearAuthTokens } from "@/lib/auth";

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();

    // Native OAuth comes back through the deep link; refresh the session then.
    const subscription = Linking.addEventListener("url", () => {
      fetchUser();
    });

    const intervalId = setInterval(fetchUser, 5 * 60 * 1000);

    return () => {
      subscription.remove();
      clearInterval(intervalId);
    };
  }, []);

  const fetchUser = async () => {
    try {
      // The bearer is stored by authClient's `onSuccess` hook (lib/auth.ts)
      // from the `set-auth-jwt` header this call brings back. Do NOT store
      // session.data.session.token: that is the session id and the
      // api-service's JWKS verifier rejects it.
      const session = await authClient.getSession();
      if (session?.data?.user) {
        setUser(session.data.user as User);
      } else {
        setUser(null);
        await clearAuthTokens();
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await authClient.signIn.email({ email, password });
    if (error) throw new Error(error.message || "Sign in failed");
    await fetchUser();
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    const { error } = await authClient.signUp.email({ email, password, name: name ?? "" });
    if (error) throw new Error(error.message || "Sign up failed");
    await fetchUser();
  };

  const signInWithSocial = async (provider: "apple" | "google") => {
    // Web: full-page redirect back to the app origin, session lands in the
    // cookie. Native: in-app browser, back through the deep link.
    const callbackURL =
      Platform.OS === "web" ? window.location.origin : "expobase://auth-callback";
    const { error } = await authClient.signIn.social({ provider, callbackURL });
    if (error) throw new Error(error.message || "Social sign in failed");
    await fetchUser();
  };

  const signInWithGoogle = () => signInWithSocial("google");

  const signInWithApple = () => signInWithSocial("apple");

  const signOut = async () => {
    try {
      await authClient.signOut();
    } catch (error) {
      console.error("Sign out failed (API):", error);
    } finally {
      setUser(null);
      await clearAuthTokens();
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signInWithEmail, signUpWithEmail, signInWithApple, signInWithGoogle, signOut, fetchUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
