import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  authApi,
  clearTokens,
  storeTokens,
  setOnUnauthorized,
} from "@/lib/api";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  companyId: string;
  trackingMode: string;
  company?: { id: string; name: string } | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "patrol_auth_access_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    await clearTokens();
    setUser(null);
  }, []);

  // Callback fuer automatisches Logout bei 401
  useEffect(() => {
    setOnUnauthorized(() => {
      setUser(null);
    });
  }, []);

  // Beim App-Start pruefen ob ein Token vorhanden ist
  useEffect(() => {
    async function checkAuth() {
      try {
        let token: string | null = null;
        if (Platform.OS === "web") {
          token = localStorage.getItem(TOKEN_KEY);
        } else {
          token = await SecureStore.getItemAsync(TOKEN_KEY);
        }

        if (!token) {
          setIsLoading(false);
          return;
        }

        // Token validieren indem wir /api/auth/me aufrufen
        const userData = await authApi.me();
        setUser(userData);
      } catch {
        // Token ungueltig oder abgelaufen
        await clearTokens();
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const userData = await authApi.login(email, password);
    setUser(userData);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
