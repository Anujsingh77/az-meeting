"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { SwitchRow, Card, Button } from "@/components/ui";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuth();
  const router = useRouter();

  const [appearance, setAppearance] = useState({ compact: false, animations: true });
  const [privacy, setPrivacy] = useState({ e2e: true, hideDirectory: false, analytics: true });
  const [notifications, setNotifications] = useState({ push: true, email: true, inapp: true });
  const [appLang, setAppLang] = useState("en");
  const [timezone, setTimezone] = useState("Asia/Kolkata");

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    router.push("/auth/login");
  };

  return (
    <div className="min-h-screen bg-background px-6 py-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-foreground mb-1">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account, preferences, and appearance</p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Appearance */}
          <Card className="p-5">
            <div className="font-bold text-sm text-foreground mb-4">🎨 Appearance</div>
            <SwitchRow
              label="Dark mode"
              checked={theme === "dark"}
              onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
            />
            <SwitchRow
              label="Compact UI"
              checked={appearance.compact}
              onCheckedChange={(v) => { setAppearance((a) => ({ ...a, compact: v })); toast.success(v ? "Compact UI on" : "Compact UI off"); }}
            />
            <SwitchRow
              label="Animations"
              checked={appearance.animations}
              onCheckedChange={(v) => setAppearance((a) => ({ ...a, animations: v }))}
            />
          </Card>

          {/* Privacy */}
          <Card className="p-5">
            <div className="font-bold text-sm text-foreground mb-4">🔒 Privacy & security</div>
            <SwitchRow
              label="End-to-end encryption"
              description="All meetings are encrypted"
              checked={privacy.e2e}
              onCheckedChange={(v) => setPrivacy((p) => ({ ...p, e2e: v }))}
            />
            <SwitchRow
              label="Hide from directory"
              checked={privacy.hideDirectory}
              onCheckedChange={(v) => setPrivacy((p) => ({ ...p, hideDirectory: v }))}
            />
            <SwitchRow
              label="Anonymous analytics"
              description="Help us improve A-Z Meeting"
              checked={privacy.analytics}
              onCheckedChange={(v) => setPrivacy((p) => ({ ...p, analytics: v }))}
            />
          </Card>

          {/* Language & region */}
          <Card className="p-5">
            <div className="font-bold text-sm text-foreground mb-4">🌐 Language & region</div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">App language</label>
                <select className="input-base" value={appLang} onChange={(e) => setAppLang(e.target.value)}>
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="ja">Japanese</option>
                  <option value="ar">Arabic</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Time zone</label>
                <select className="input-base" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="Europe/Berlin">Europe/Berlin (CET)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                  <option value="Asia/Shanghai">Asia/Shanghai (CST)</option>
                  <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Notifications */}
          <Card className="p-5">
            <div className="font-bold text-sm text-foreground mb-4">🔔 Notifications</div>
            <SwitchRow label="Push notifications" checked={notifications.push} onCheckedChange={(v) => setNotifications((n) => ({ ...n, push: v }))} />
            <SwitchRow label="Email digest" checked={notifications.email} onCheckedChange={(v) => setNotifications((n) => ({ ...n, email: v }))} />
            <SwitchRow label="In-app alerts" checked={notifications.inapp} onCheckedChange={(v) => setNotifications((n) => ({ ...n, inapp: v }))} />
          </Card>

          {/* Account */}
          <Card className="p-5 md:col-span-2">
            <div className="font-bold text-sm text-foreground mb-4">🗑️ Account actions</div>
            <div className="flex flex-wrap gap-3">
              <Button variant="ghost" size="sm" onClick={() => router.push("/profile")}>Edit profile info</Button>
              <Button variant="ghost" size="sm" onClick={() => router.push("/profile")}>Change password</Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const blob = new Blob(["Your account data export"], { type: "text/plain" });
                  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "data.txt"; a.click();
                  toast.success("Data downloaded");
                }}
              >
                Download my data
              </Button>
              <Button variant="danger" size="sm" onClick={handleSignOut}>Sign out</Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => router.push("/profile")}
              >
                Delete account
              </Button>
            </div>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => toast.success("Settings saved!")}>Save all settings</Button>
        </div>
      </motion.div>
    </div>
  );
}
