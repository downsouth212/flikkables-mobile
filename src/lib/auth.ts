import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// The `auth` and `api` rows of `newly services list`. Here and not in app.json:
// anything under `expo.extra` is a native input and costs a full native build.
export const AUTH_URL: string = "https://auth-607304eb-c9a0-43e5-81da-53dd783f24f7-dev.api.newlyapp.com";
export const API_URL: string = "https://api-607304eb-c9a0-43e5-81da-53dd783f24f7-dev.api.newlyapp.com";

export const BEARER_TOKEN_KEY = "expobase_bearer_token";

// SecureStore can refuse to store anything at all: an iOS build installed
// without the keychain entitlement throws
// `KeyChainException: A required entitlement isn't present` on every write.
// Degrade to an in-memory store so sign-in keeps working instead of red-boxing.
// It holds the session for as long as the app is running.
const memoryStore = new Map<string, string>();

// Better Auth's expo client calls all four of getItem, getItemAsync, setItem
// and setItemAsync (its `ExpoClientStorage` type). Leave one out and sign-up
// throws "undefined is not a function".
const nativeStorage = {
  getItem: (key: string): string | null => {
    try {
      const value = SecureStore.getItem(key);
      if (value != null) return value;
    } catch {}
    return memoryStore.get(key) ?? null;
  },
  getItemAsync: async (key: string): Promise<string | null> => nativeStorage.getItem(key),
  setItem: (key: string, value: string): void => {
    try {
      SecureStore.setItem(key, value);
      memoryStore.delete(key);
    } catch {
      memoryStore.set(key, value);
    }
  },
  setItemAsync: async (key: string, value: string): Promise<void> => nativeStorage.setItem(key, value),
  deleteItem: async (key: string) => {
    memoryStore.delete(key);
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {}
  },
};

const webStorage = {
  getItem: (key: string): string | null => localStorage.getItem(key),
  getItemAsync: async (key: string): Promise<string | null> => localStorage.getItem(key),
  setItem: (key: string, value: string): void => localStorage.setItem(key, value),
  setItemAsync: async (key: string, value: string): Promise<void> => localStorage.setItem(key, value),
  deleteItem: async (key: string) => localStorage.removeItem(key),
};

// localStorage on web, keychain with in-memory fallback on native.
export const tokenStorage = Platform.OS === "web" ? webStorage : nativeStorage;

export const authClient = createAuthClient({
  baseURL: AUTH_URL,
  plugins: [
    expoClient({
      scheme: "expobase",
      storagePrefix: "expobase",
      storage: tokenStorage,
    }),
  ],
  fetchOptions: {
    // Better Auth's jwt() plugin attaches the JWT to every session-returning
    // response as `set-auth-jwt`. The api-service verifies that JWT via JWKS.
    // `session.data.session.token` is the opaque session id, not a JWT, and
    // storing it as the bearer 401s every api-service call.
    onSuccess: async (ctx: { response: Response }) => {
      const jwt = ctx.response.headers.get("set-auth-jwt");
      if (jwt) {
        await setBearerToken(jwt);
      }
    },
    ...(Platform.OS === "web" && {
      credentials: "include",
      auth: {
        type: "Bearer" as const,
        token: () => localStorage.getItem(BEARER_TOKEN_KEY) || "",
      },
    }),
  },
});

export async function setBearerToken(token: string) {
  tokenStorage.setItem(BEARER_TOKEN_KEY, token);
}

export async function clearAuthTokens() {
  await tokenStorage.deleteItem(BEARER_TOKEN_KEY);
}
