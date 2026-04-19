"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, Clock, Users, Plus, Trash2, Edit, Video } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/app";
import { Button, Input, Card } from "@/components/ui";
import { LANGUAGES } from "@/types";
import { generateMeetingCode } from "@/lib/utils";
import { format } from "date-fns";
import toast from "react-hot-toast";

interface MeetingForm {
  title: string;
  date: string;
  time: string;
  duration: string;
  participants: string;
  languages: string[];
  quality: string;
}

const UPCOMING = [
  { id: "1", title: "Q2 Global Review", time: "10:00", date: "2026-04-22", langs: ["EN","ES","JA","AR"], participants: 4, code: "X7K-2P9", gradient: "from-violet-500 to-purple-600" },
  { id: "2", title: "Design Sprint Kickoff", time: "14:30", date: "2026-04-24", langs: ["EN","FR","DE"], participants: 6, code: "B3M-5T1", gradient: "from-blue-500 to-cyan-500" },
  { id: "3", title: "Investor Call — APAC", time: "09:00", date: "2026-04-28", langs: ["EN","ZH","KO","JA"], participants: 8, code: "Q9R-7K4", gradient: "from-green-500 to-emerald-500" },
];

export default function SchedulePage() {
  const router = useRouter();
  const supabase = createClient();
  const user = useAppStore((s) => s.user);

  const [form, setForm] = useState<MeetingForm>({
    title: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "10:00",
    duration: "60",
    participants: "",
    languages: ["en"],
    quality: "1080p",
  });
  const [loading, setLoading] = useState(false);
  const [scheduled, setScheduled] = useState(UPCOMING);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Meeting title is required"); return; }
    setLoading(true);
    try {
      const code = generateMeetingCode();
      const db = supabase as any;
      const { error } = await db.from("meetings").insert({
        title: form.title,
        host_id: user?.id ?? "anon",
        code,
        scheduled_at: `${form.date}T${form.time}:00`,
        duration_minutes: parseInt(form.duration),
        languages: form.languages,
        status: "scheduled",
      });
      if (error) throw error;

      setScheduled((prev) => [
        {
          id: code,
          title: form.title,
          time: form.time,
          date: form.date,
          langs: form.languages.map((l) => l.toUpperCase()),
          participants: form.participants.split(",").filter(Boolean).length + 1,
          code,
          gradient: "from-violet-500 to-purple-600",
        },
        ...prev,
      ]);
      toast.success("Meeting scheduled! Invites sent.");
      setForm((f) => ({ ...f, title: "", participants: "" }));
    } catch {
      toast.error("Failed to schedule meeting");
    } finally {
      setLoading(false);
    }
  };

  const deleteMeeting = (id: string) => {
    setScheduled((prev) => prev.filter((m) => m.id !== id));
    toast.success("Meeting deleted");
  };

  const toggleLanguage = (code: string) => {
    setForm((f) => ({
      ...f,
      languages: f.languages.includes(code)
        ? f.languages.filter((l) => l !== code)
        : [...f.languages, code],
    }));
  };

  return (
    <div className="min-h-screen bg-background px-6 py-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black text-foreground mb-1">Schedule a meeting</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Set up a multilingual meeting — each participant picks their own language
        </p>

        {/* Form */}
        <Card className="p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Meeting title"
                placeholder="e.g. Global team sync"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Duration</label>
                <select className="input-base" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">90 minutes</option>
                  <option value="120">2 hours</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Date</label>
                <input type="date" className="input-base" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Start time</label>
                <input type="time" className="input-base" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Input
                  label="Invite participants (email, comma-separated)"
                  placeholder="maria@acme.com, kenji@corp.jp"
                  value={form.participants}
                  onChange={(e) => setForm((f) => ({ ...f, participants: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Languages (select all that apply)</label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.slice(0, 14).map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => toggleLanguage(l.code)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      form.languages.includes(l.code)
                        ? "bg-accent/10 border-accent/30 text-accent"
                        : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {l.flag} {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={loading} size="lg">
                Schedule & invite →
              </Button>
              <Button type="button" variant="ghost" size="lg" onClick={() => toast.success("Saved as draft")}>
                Save as draft
              </Button>
            </div>
          </form>
        </Card>

        {/* Upcoming meetings */}
        <h2 className="text-base font-bold text-foreground mb-4">Upcoming meetings ({scheduled.length})</h2>
        <div className="space-y-3">
          {scheduled.map((m) => (
            <Card key={m.id} className="p-4 flex items-center gap-4">
              <div className={`w-14 h-14 bg-gradient-to-br ${m.gradient} rounded-xl flex flex-col items-center justify-center text-white flex-shrink-0`}>
                <div className="text-sm font-black leading-none">{m.time}</div>
                <div className="text-[10px] opacity-80 mt-0.5">{m.date.split("-").slice(1).join("/")}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-foreground">{m.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {m.participants} participants · Code: {m.code}
                </div>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {m.langs.map((l) => (
                    <span key={l} className="text-[10px] bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20 font-bold">{l}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" onClick={() => router.push(`/meeting?code=${m.code}`)}>
                  <Video size={13} /> Join
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toast.success("Edit coming soon!")}>
                  <Edit size={13} />
                </Button>
                <Button size="sm" variant="danger" onClick={() => deleteMeeting(m.id)}>
                  <Trash2 size={13} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
