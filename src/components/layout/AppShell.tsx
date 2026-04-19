"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Video, Calendar, User, MessageSquare,
  Settings, LogOut, Moon, Sun, Globe, Menu, X, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/app";
import { getInitials, avatarColor } from "@/lib/utils";
import { useState } from "react";
import toast from "react-hot-toast";

const NAV = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/meeting", icon: Video, label: "Meeting" },
  { href: "/schedule", icon: Calendar, label: "Schedule" },
  { href: "/profile", icon: User, label: "Profile" },
  { href: "/feedback", icon: MessageSquare, label: "Feedback" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuth();
  const user = useAppStore((s) => s.user);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    router.push("/auth/login");
  };

  const isMeeting = pathname === "/meeting";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar — hidden on meeting screen on mobile */}
      {!isMeeting && (
        <>
          {/* Desktop sidebar */}
          <aside className="hidden md:flex w-[220px] flex-col border-r border-border bg-card flex-shrink-0">
            {/* Logo */}
            <div className="flex items-center gap-3 px-5 h-16 border-b border-border flex-shrink-0">
              <div className="w-8 h-8 rounded-xl accent-gradient flex items-center justify-center text-white font-black text-sm">
                AZ
              </div>
              <span className="font-bold text-base tracking-tight">
                <span className="accent-gradient-text">A-Z</span> Meeting
              </span>
            </div>

            {/* Nav */}
            <nav className="flex-1 py-4 px-3 overflow-y-auto">
              {NAV.map(({ href, icon: Icon, label }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-1 transition-all duration-150",
                      active
                        ? "bg-accent/10 text-accent border border-accent/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon size={17} />
                    {label}
                    {active && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="ml-auto w-1.5 h-1.5 rounded-full accent-gradient"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Bottom actions */}
            <div className="px-3 pb-4 border-t border-border pt-3 space-y-1">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-muted-foreground hover:text-red-500 hover:bg-red-500/8 transition-all"
              >
                <LogOut size={17} />
                Sign out
              </button>

              {/* User pill */}
              {user && (
                <Link
                  href="/profile"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-all mt-2"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold flex-shrink-0",
                      avatarColor(user.full_name || user.email)
                    )}
                  >
                    {getInitials(user.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-foreground truncate">
                      {user.full_name || "User"}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {user.plan === "pro" ? "★ Pro plan" : "Free plan"}
                    </div>
                  </div>
                </Link>
              )}
            </div>
          </aside>

          {/* Mobile topbar */}
          <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-card border-b border-border flex items-center justify-between px-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg accent-gradient flex items-center justify-center text-white font-black text-xs">
                AZ
              </div>
              <span className="font-bold text-sm">
                <span className="accent-gradient-text">A-Z</span> Meeting
              </span>
            </div>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-muted text-muted-foreground"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

          {/* Mobile nav drawer */}
          <AnimatePresence>
            {mobileOpen && (
              <motion.div
                initial={{ opacity: 0, x: -240 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -240 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="md:hidden fixed inset-y-0 left-0 w-60 bg-card border-r border-border z-40 pt-14 flex flex-col"
              >
                <nav className="flex-1 py-4 px-3">
                  {NAV.map(({ href, icon: Icon, label }) => {
                    const active = pathname === href;
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-1 transition-all",
                          active
                            ? "bg-accent/10 text-accent"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <Icon size={17} />
                        {label}
                      </Link>
                    );
                  })}
                </nav>
                <div className="px-3 pb-6 space-y-1 border-t border-border pt-3">
                  <button
                    onClick={() => { setTheme(theme === "dark" ? "light" : "dark"); setMobileOpen(false); }}
                    className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-muted-foreground hover:bg-muted"
                  >
                    {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
                    {theme === "dark" ? "Light mode" : "Dark mode"}
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-red-500 hover:bg-red-500/8"
                  >
                    <LogOut size={17} />
                    Sign out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {mobileOpen && (
            <div
              className="md:hidden fixed inset-0 z-30 bg-black/40"
              onClick={() => setMobileOpen(false)}
            />
          )}
        </>
      )}

      {/* Main content */}
      <main
        className={cn(
          "flex-1 overflow-auto",
          !isMeeting && "md:ml-0",
          !isMeeting && "mt-14 md:mt-0"
        )}
      >
        {children}
      </main>
    </div>
  );
}
