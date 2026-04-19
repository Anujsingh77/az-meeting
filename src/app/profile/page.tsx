"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import NextImage from "next/image";
import { Edit, Plus, Download, Key, Trash2, Star, Globe, Bell, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/app";
import { Button, Card, Input, StatCell, SwitchRow, Badge } from "@/components/ui";
import { getInitials, avatarColor } from "@/lib/utils";
import { LANGUAGES } from "@/types";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const supabase = createClient();
  const { user, setUser } = useAppStore();

  const [editOpen, setEditOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState({ full_name: user?.full_name ?? "", email: user?.email ?? "", job_title: user?.job_title ?? "" });
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Notifications state
  const [notifs, setNotifs] = useState({ reminders: true, translation: true, chat: true, recording: false, digest: true });
  // Preferences state
  const [prefs, setPrefs] = useState({ autoJoinDubbing: true, joinCameraOff: false, hdDefault: true, bgBlur: false, aiSummary: true });

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: form.full_name, job_title: form.job_title })
        .eq("id", user.id);
      if (error) throw error;
      setUser({ ...user, full_name: form.full_name, job_title: form.job_title });
      toast.success("Profile updated!");
      setEditOpen(false);
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!pwForm.newPw || pwForm.newPw.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (pwForm.newPw !== pwForm.confirm) { toast.error("Passwords don't match"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.newPw });
      if (error) throw error;
      toast.success("Password changed!");
      setPwOpen(false);
      setPwForm({ current: "", newPw: "", confirm: "" });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { toast.error("Upload failed"); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
    setUser({ ...user, avatar_url: data.publicUrl });
    toast.success("Avatar updated!");
  };

  const downloadData = async () => {
    const blob = new Blob([JSON.stringify({ user, exported_at: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "az-meeting-data.json"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Data downloaded!");
  };

  const deleteAccount = async () => {
    if (deleteConfirm !== "DELETE") { toast.error('Type "DELETE" to confirm'); return; }
    try {
      if (user) await supabase.from("profiles").delete().eq("id", user.id);
      await supabase.auth.signOut();
      window.location.href = "/auth/login";
    } catch {
      toast.error("Failed to delete account");
    }
  };

  const initials = getInitials(user?.full_name);
  const color = avatarColor(user?.full_name || user?.email || "user");

  return (
    <div className="min-h-screen bg-background px-6 py-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

        {/* Header card */}
        <Card className="p-6 flex flex-wrap items-center gap-5">
          <div className="relative flex-shrink-0">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) uploadAvatar(e.target.files[0]); }} />
            {user?.avatar_url ? (
              <NextImage src={user.avatar_url} alt="avatar" width={80} height={80} className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className={cn("w-20 h-20 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-2xl font-black", color)}>
                {initials}
              </div>
            )}
            <button onClick={() => fileRef.current?.click()} className="absolute bottom-0 right-0 w-7 h-7 rounded-full accent-gradient border-2 border-card flex items-center justify-center text-white text-xs hover:opacity-90 transition-opacity">
              <Edit size={11} />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xl font-black text-foreground">{user?.full_name ?? "Your Name"}</div>
            <div className="text-sm text-muted-foreground mt-0.5">{user?.email}</div>
            {user?.job_title && <div className="text-xs text-muted-foreground mt-0.5">{user.job_title}</div>}
            <div className="mt-2">
              <Badge variant="accent"><Star size={9} /> {user?.plan === "pro" ? "Pro plan" : "Free plan"}</Badge>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
              <Edit size={13} /> Edit profile
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPwOpen(true)}>
              <Key size={13} /> Change password
            </Button>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCell value={user?.total_meetings ?? 0} label="Meetings" />
          <StatCell value={user?.languages?.length ?? 1} label="Languages" />
          <StatCell value={`${Math.round((user?.total_minutes ?? 0) / 60)}h`} label="Hours" />
          <StatCell value={`${((user?.total_words_translated ?? 0) / 1000).toFixed(0)}k`} label="Words translated" />
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Language preferences */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Globe size={15} className="text-accent" />
              <span className="font-bold text-sm text-foreground">Language preferences</span>
            </div>
            <div className="space-y-2">
              {(user?.languages ?? ["en"]).map((lang) => {
                const l = LANGUAGES.find((x) => x.code === lang);
                return (
                  <div key={lang} className="flex items-center gap-3 px-3 py-2.5 bg-muted rounded-xl border border-border">
                    <span className="text-base">{l?.flag ?? "🌐"}</span>
                    <span className="flex-1 text-sm text-foreground">{l?.label ?? lang}</span>
                    <Badge variant="green">Active</Badge>
                  </div>
                );
              })}
              <button className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-accent hover:text-accent transition-all">
                <Plus size={14} /> Add language
              </button>
            </div>
          </Card>

          {/* Notifications */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bell size={15} className="text-accent" />
              <span className="font-bold text-sm text-foreground">Notifications</span>
            </div>
            <div className="space-y-0.5">
              <SwitchRow label="Meeting reminders" checked={notifs.reminders} onCheckedChange={(v) => setNotifs((n) => ({ ...n, reminders: v }))} />
              <SwitchRow label="Translation updates" checked={notifs.translation} onCheckedChange={(v) => setNotifs((n) => ({ ...n, translation: v }))} />
              <SwitchRow label="Chat messages" checked={notifs.chat} onCheckedChange={(v) => setNotifs((n) => ({ ...n, chat: v }))} />
              <SwitchRow label="Recording ready" checked={notifs.recording} onCheckedChange={(v) => setNotifs((n) => ({ ...n, recording: v }))} />
              <SwitchRow label="Weekly digest" checked={notifs.digest} onCheckedChange={(v) => setNotifs((n) => ({ ...n, digest: v }))} />
            </div>
          </Card>

          {/* Preferences */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Settings size={15} className="text-accent" />
              <span className="font-bold text-sm text-foreground">Preferences</span>
            </div>
            <div className="space-y-0.5">
              <SwitchRow label="AI dubbing on join" checked={prefs.autoJoinDubbing} onCheckedChange={(v) => setPrefs((p) => ({ ...p, autoJoinDubbing: v }))} />
              <SwitchRow label="Join with camera off" checked={prefs.joinCameraOff} onCheckedChange={(v) => setPrefs((p) => ({ ...p, joinCameraOff: v }))} />
              <SwitchRow label="HD video default" checked={prefs.hdDefault} onCheckedChange={(v) => setPrefs((p) => ({ ...p, hdDefault: v }))} />
              <SwitchRow label="Background blur on join" checked={prefs.bgBlur} onCheckedChange={(v) => setPrefs((p) => ({ ...p, bgBlur: v }))} />
              <SwitchRow label="AI meeting summary" checked={prefs.aiSummary} onCheckedChange={(v) => setPrefs((p) => ({ ...p, aiSummary: v }))} />
            </div>
          </Card>

          {/* Account actions */}
          <Card className="p-5">
            <div className="font-bold text-sm text-foreground mb-4">Account</div>
            <div className="space-y-2">
              <Button variant="ghost" className="w-full justify-start gap-2" onClick={downloadData}>
                <Download size={14} /> Download my data
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => setPwOpen(true)}>
                <Key size={14} /> Change password
              </Button>
              <Button variant="danger" className="w-full justify-start gap-2 mt-4" onClick={() => setDeleteOpen(true)}>
                <Trash2 size={14} /> Delete account
              </Button>
            </div>
          </Card>
        </div>
      </motion.div>

      {/* Edit profile modal */}
      {editOpen && (
        <Modal title="Edit profile" onClose={() => setEditOpen(false)}>
          <div className="space-y-4">
            <Input label="Full name" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
            <Input label="Email" value={form.email} disabled className="opacity-60 cursor-not-allowed" />
            <Input label="Job title" placeholder="e.g. Product Lead" value={form.job_title} onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))} />
            <div className="flex gap-3 pt-2">
              <Button onClick={saveProfile} loading={saving}>Save changes</Button>
              <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Change password modal */}
      {pwOpen && (
        <Modal title="Change password" onClose={() => setPwOpen(false)}>
          <div className="space-y-4">
            <Input label="New password" type="password" placeholder="Min 6 characters" value={pwForm.newPw} onChange={(e) => setPwForm((f) => ({ ...f, newPw: e.target.value }))} />
            <Input label="Confirm new password" type="password" placeholder="Repeat new password" value={pwForm.confirm} onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))} />
            <div className="flex gap-3 pt-2">
              <Button onClick={changePassword} loading={saving}>Update password</Button>
              <Button variant="ghost" onClick={() => setPwOpen(false)}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete account modal */}
      {deleteOpen && (
        <Modal title="Delete account" onClose={() => setDeleteOpen(false)}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              This will permanently delete your account and all data. This action <strong>cannot be undone</strong>.
            </p>
            <Input
              label='Type "DELETE" to confirm'
              placeholder="DELETE"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
            />
            <div className="flex gap-3 pt-2">
              <Button variant="danger" onClick={deleteAccount} className="gap-2">
                <Trash2 size={14} /> Permanently delete
              </Button>
              <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors text-sm">✕</button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}
