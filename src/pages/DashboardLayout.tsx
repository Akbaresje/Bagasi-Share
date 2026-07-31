import { ReactNode, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, LogOut, Menu, X, LucideIcon, Store } from "lucide-react";
import { useAuth, roleLabels, UserRole } from "../auth/AuthContext";
import { useAusMarket } from "../contexts/AusMarketContext";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface Props {
  navItems: NavItem[];
  activeNav: string;
  onNavChange: (id: string) => void;
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const roleTag: Record<UserRole, string> = {
  admin: "OPS",
  customer: "CUST",
  traveler: "TRVL",
  reseller: "MRCH",
};

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)] pulse-dot" />
      <span className="font-display text-[20px] tracking-[.02em] text-[var(--ink)]">BagasiShare</span>
    </div>
  );
}

export default function DashboardLayout({ navItems, activeNav, onNavChange, children, title, subtitle }: Props) {
  const { user, logout } = useAuth();
  const { setOpen: openAusMarket } = useAusMarket();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;

  const Sidebar = (
    <aside className="flex h-full w-full flex-col border-r border-[var(--line)] bg-[var(--paper)] lg:w-[264px]">
      {/* Brand */}
      <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-5">
        <Logo />
        <button className="lg:hidden text-[var(--ink-mute)]" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
      </div>

      {/* User */}
      <div className="border-b border-[var(--line)] px-6 py-6">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center bg-[var(--ink)] font-display text-[18px] text-[var(--cream)]">
            {user.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[15px] tracking-[.01em] text-[var(--ink)]">{user.name}</p>
            <p className="mono-xs mt-1 truncate text-[var(--ink-mute)]">{roleTag[user.role]} · {roleLabels[user.role]}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        <p className="mono-xs px-6 pb-3 pt-2 text-[var(--ink-faint)]">Navigasi</p>
        {navItems.map((item, i) => {
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { onNavChange(item.id); setSidebarOpen(false); }}
              className={`group relative flex w-full items-center gap-3 border-l-[3px] px-6 py-3 text-left transition ${
                isActive
                  ? "border-l-[var(--accent)] bg-[var(--paper-2)] text-[var(--ink)]"
                  : "border-l-transparent text-[var(--ink-soft)] hover:bg-[var(--paper-2)] hover:text-[var(--ink)]"
              }`}
            >
              <span className="mono-xs w-6 shrink-0 text-[var(--ink-faint)]">{String(i + 1).padStart(2, "0")}</span>
              <item.icon size={16} strokeWidth={isActive ? 2 : 1.5} />
              <span className={`text-[14px] ${isActive ? "font-bold" : "font-semibold"}`}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* AusMarket entry */}
      <div className="border-t border-[var(--line)] p-4">
        <button
          onClick={() => { setSidebarOpen(false); openAusMarket(true); }}
          className="mb-3 flex w-full items-center gap-2.5 border-2 border-dashed border-[var(--accent)] px-4 py-3 transition hover:bg-[var(--accent)] hover:border-[var(--accent)]"
        >
          <span className="h-2 w-2 rounded-full bg-[var(--accent)] pulse-dot" />
          <span className="flex-1 text-left font-display text-[15px] text-[var(--ink)]">AusMarket</span>
          <Store size={14} className="text-[var(--accent)]" />
        </button>
        {/* Logout */}
        <button onClick={logout} className="btn-outline w-full !py-3">
          <LogOut size={14} /> Keluar
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <div className="flex min-h-screen">
        <div className="hidden lg:block">{Sidebar}</div>

        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex lg:hidden"
            >
              <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: "tween", duration: .25 }} className="w-[280px]">
                {Sidebar}
              </motion.div>
              <div className="flex-1 bg-[var(--ink)]/40" onClick={() => setSidebarOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--cream)]/95 backdrop-blur">
            <div className="flex items-center justify-between px-5 py-4 lg:px-10 lg:py-5">
              <div className="flex items-center gap-3">
                <button className="text-[var(--ink)] lg:hidden" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
                <div>
                  <p className="mono-xs text-[var(--ink-mute)]">{roleTag[user.role]} · Dashboard</p>
                  <h1 className="mt-1 font-display text-[22px] tracking-[.01em] text-[var(--ink)] sm:text-[26px]">{title}</h1>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {subtitle && <p className="hidden text-[12px] text-[var(--ink-mute)] xl:block">{subtitle}</p>}
                <button className="relative grid h-10 w-10 place-items-center border border-[var(--line-strong)] bg-[var(--paper)] text-[var(--ink)] transition hover:border-[var(--ink)]">
                  <Bell size={15} strokeWidth={1.75} />
                  <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                </button>
              </div>
            </div>
          </header>
          <main className="flex-1 p-5 lg:p-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
