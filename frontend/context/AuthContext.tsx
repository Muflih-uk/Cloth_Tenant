"use client";

import {
  AuthUser,
  LoginResponse,
  Business,
  PermissionFlags,
} from "@/types/auth";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import Cookies from "js-cookie";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api/axios";
import { authApi } from "@/lib/api/auth";

type AuthContextType = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  role: string | null;
  business: Business | null;
  isSuperuser: boolean;
  permissions: PermissionFlags;
  isAuthenticated: boolean;

  login: (data: LoginResponse) => void;
  logout: () => void;
  /** Merge freshly edited profile fields into the signed-in user and its cookie. */
  updateUser: (data: Partial<AuthUser>) => void;
};

const ALL_PERMISSIONS: PermissionFlags = {
  orders_view: true,
  orders_edit: true,
  orders_delete: true,
  items_view: true,
  items_edit: true,
  items_delete: true,
  agents_view: true,
};

function flagsFromUser(user: AuthUser | null, role: string | null) {
  if (role === "ADMIN") return ALL_PERMISSIONS;
  return {
    orders_view: user?.orders_view ?? false,
    orders_edit: user?.orders_edit ?? false,
    orders_delete: user?.orders_delete ?? false,
    items_view: user?.items_view ?? false,
    items_edit: user?.items_edit ?? false,
    items_delete: user?.items_delete ?? false,
    agents_view: user?.agents_view ?? false,
  };
}

const AuthContext = createContext<AuthContextType | null>(null);

const COOKIE_KEYS = {
  user: "auth_user",
  access: "token",
  refresh: "auth_refresh",
  role: "role",
  business: "business",
  isSuperuser: "is_superuser",
};

function initializeAuth() {
  const storedUser = Cookies.get(COOKIE_KEYS.user);
  const storedAccess = Cookies.get(COOKIE_KEYS.access);
  const storedRefresh = Cookies.get(COOKIE_KEYS.refresh);
  const storedRole = Cookies.get(COOKIE_KEYS.role);
  const storedBusiness = Cookies.get(COOKIE_KEYS.business);
  const storedSuperuser = Cookies.get(COOKIE_KEYS.isSuperuser);

  return {
    user: storedUser ? (JSON.parse(storedUser) as AuthUser) : null,
    access: storedAccess || null,
    refresh: storedRefresh || null,
    role: storedRole || null,
    business: (storedBusiness as Business) || null,
    isSuperuser: storedSuperuser === "true",
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const initialAuth = initializeAuth();
  const [user, setUser] = useState<AuthUser | null>(initialAuth.user);
  const [accessToken, setAccessToken] = useState<string | null>(
    initialAuth.access,
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(
    initialAuth.refresh,
  );
  const [role, setRole] = useState<string | null>(initialAuth.role);
  const [business, setBusiness] = useState<Business | null>(
    initialAuth.business,
  );
  const [isSuperuser, setIsSuperuser] = useState(initialAuth.isSuperuser);
  const [isReady, setIsReady] = useState(false);

  const pathname = usePathname();
  const permissions = useMemo(
    () => flagsFromUser(user, role),
    [user, role],
  );

  useEffect(() => {
    // eslint-disable-next-line
    setIsReady(true);
  }, []);

  const login = (data: LoginResponse) => {
    const authUser: AuthUser = {
      id: data.user_id,
      role: data.role,
      username: data.username,
      email: data.email,
      business: data.business || null,
      is_superuser: data.is_superuser,
      orders_view: data.orders_view,
      orders_edit: data.orders_edit,
      orders_delete: data.orders_delete,
      items_view: data.items_view,
      items_edit: data.items_edit,
      items_delete: data.items_delete,
      agents_view: data.agents_view,
    };

    setUser(authUser);
    setAccessToken(data.access);
    setRefreshToken(data.refresh);
    setRole(data.role);
    setBusiness(data.business || null);
    setIsSuperuser(data.is_superuser);

    Cookies.set(COOKIE_KEYS.user, JSON.stringify(authUser));
    Cookies.set(COOKIE_KEYS.access, data.access);
    Cookies.set(COOKIE_KEYS.refresh, data.refresh);
    Cookies.set(COOKIE_KEYS.role, data.role);
    if (data.business) {
      Cookies.set(COOKIE_KEYS.business, data.business);
    }
    Cookies.set(COOKIE_KEYS.isSuperuser, String(data.is_superuser));
  };

  const updateUser = (data: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...data };
      // The cookie is what the rest of the app (and a reload) reads, so it has to
      // move with the state or the page comes back showing the old name.
      Cookies.set(COOKIE_KEYS.user, JSON.stringify(next));
      return next;
    });
  };

  // The JWT must not carry permission switches, so the browser refreshes them
  // from the profile endpoint. Doing it on mount and when the tab is focused
  // means an admin's change shows up without signing the sub-admin out.
  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;

    const refreshProfile = () => {
      authApi
        .getProfile()
        .then((profile) => {
          if (cancelled) return;
          const nextFlags = {
            orders_view: profile.orders_view,
            orders_edit: profile.orders_edit,
            orders_delete: profile.orders_delete,
            items_view: profile.items_view,
            items_edit: profile.items_edit,
            items_delete: profile.items_delete,
            agents_view: profile.agents_view,
          };
          setRole(profile.role);
          Cookies.set(COOKIE_KEYS.role, profile.role);
          setUser((prev) => {
            const next: AuthUser = {
              ...(prev ?? { id: profile.id, is_superuser: profile.is_superuser }),
              id: profile.id,
              role: profile.role,
              username: profile.username,
              email: profile.email,
              display_name: profile.display_name,
              is_superuser: profile.is_superuser,
              ...nextFlags,
            };
            Cookies.set(COOKIE_KEYS.user, JSON.stringify(next));
            return next;
          });
        })
        .catch(() => {
          // A 401 is handled by the axios interceptor; anything else leaves the
          // last known flags in place until the next request.
        });
    };

    refreshProfile();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshProfile();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [accessToken]);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setRole(null);
    setBusiness(null);
    setIsSuperuser(false);

    Cookies.remove(COOKIE_KEYS.user);
    Cookies.remove(COOKIE_KEYS.access);
    Cookies.remove(COOKIE_KEYS.refresh);
    Cookies.remove(COOKIE_KEYS.role);
    Cookies.remove(COOKIE_KEYS.business);
    Cookies.remove(COOKIE_KEYS.isSuperuser);

    router.push("/");
  }, [router]);

  useEffect(() => {
    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          logout();
        }
        return Promise.reject(error);
      },
    );

    return () => {
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [logout]);

  useEffect(() => {
    if (!isReady) return;

    const publicRoutes = ["/", "/forgot-password", "/reset-password"];

    const isPublicRoute = publicRoutes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    );

    // Not logged in
    if (!accessToken) {
      if (!isPublicRoute) {
        router.replace("/");
      }
      return;
    }

    // Logged in
    if (pathname === "/") {
      if (role === "ADMIN" || role === "SUBADMIN") {
        router.replace("/admin");
      } else {
        router.replace("/agent");
      }
      return;
    }

    const isAdminArea = role === "ADMIN" || role === "SUBADMIN";

    // Prevent agents from entering the admin area.
    if (pathname.startsWith("/admin") && !isAdminArea) {
      router.replace("/agent");
      return;
    }

    if (role !== "SUBADMIN") return;

    const adminOnly =
      pathname.startsWith("/admin/settings") ||
      pathname.startsWith("/admin/profile/settings") ||
      pathname.startsWith("/admin/analytics") ||
      pathname.startsWith("/admin/summary") ||
      pathname.startsWith("/admin/bulk-import") ||
      pathname.startsWith("/admin/users/admins") ||
      pathname.startsWith("/admin/users/subadmins") ||
      pathname.startsWith("/admin/users/customers/new") ||
      pathname.startsWith("/admin/users/agents/new") ||
      pathname.startsWith("/admin/order/new");

    const fallback = permissions.orders_view
      ? "/admin"
      : permissions.items_view
        ? "/admin/items"
        : permissions.agents_view
          ? "/admin/users"
          : "/admin/profile";

    if (adminOnly) {
      if (pathname !== fallback) router.replace(fallback);
      return;
    }

    const blocked =
      (!permissions.orders_view &&
        (pathname === "/admin" ||
          pathname.startsWith("/admin/order") ||
          pathname.startsWith("/admin/packing"))) ||
      (!permissions.items_view && pathname.startsWith("/admin/items")) ||
      (!permissions.agents_view && pathname.startsWith("/admin/users"));

    if (blocked && pathname !== fallback) {
      router.replace(fallback);
    }
  }, [accessToken, role, router, isReady, pathname, permissions]);
  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
        role,
        business,
        isSuperuser,
        permissions,
        isAuthenticated: !!accessToken,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
