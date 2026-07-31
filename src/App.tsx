import { useEffect } from "react";
import { AuthProvider, useAuth, User } from "./auth/AuthContext";
import { DataProvider, useData } from "./data/store";
import { ToastProvider } from "./components/Toast";
import { AusMarketProvider, useAusMarket } from "./contexts/AusMarketContext";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import { useState } from "react";
import type { UserRole } from "./auth/AuthContext";
import CustomerDashboard from "./pages/dashboards/CustomerDashboard";
import TravelerDashboard from "./pages/dashboards/TravelerDashboard";
import ResellerDashboard from "./pages/dashboards/ResellerDashboard";
import AdminDashboard from "./pages/dashboards/AdminDashboard";
import AusMarket from "./pages/AusMarket";

function DashboardRouter({ user }: { user: User }) {
  const { ensureUser } = useData();
  const { open, setOpen } = useAusMarket();

  useEffect(() => {
    ensureUser(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (open) return <AusMarket onBack={() => setOpen(false)} />;

  switch (user.role) {
    case "admin":     return <AdminDashboard />;
    case "traveler":  return <TravelerDashboard />;
    case "reseller":  return <ResellerDashboard />;
    case "customer":
    default:          return <CustomerDashboard />;
  }
}

function Router() {
  const { user } = useAuth();
  const [view, setView] = useState<"landing" | "auth">("landing");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authRole, setAuthRole] = useState<UserRole | null>(null);

  if (user) return <DashboardRouter user={user} />;

  if (view === "auth") {
    return <AuthPage initialMode={authMode} initialRole={authRole} onBack={() => setView("landing")} />;
  }

  return (
    <LandingPage
      onAuth={(mode, role) => {
        setAuthMode(mode);
        setAuthRole(role ?? null);
        setView("auth");
      }}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <ToastProvider>
          <AusMarketProvider>
            <Router />
          </AusMarketProvider>
        </ToastProvider>
      </DataProvider>
    </AuthProvider>
  );
}
