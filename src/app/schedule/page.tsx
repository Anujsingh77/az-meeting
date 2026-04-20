"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Edit, Video, Copy, Share2, Check, Link } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/app";
import { Button, Input, Card, Badge } from "@/components/ui";
import { LANGUAGES } from "@/types";
import { generateMeetingCode } from "@/lib/utils";
import toast from "react-hot-toast";

interface MeetingForm {
  title: string;
  date: string;
  time: string;
  duration: string;
  participants: string;
  languages: string[];
}

interface ScheduledMeeting {
  id: string;
  title: string;
  time: string;
  date: string;
  langs: string[];
  participants: number;
  code: string;
  gradient: string;
  joinLink: string;
}

const GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-500",
  "from-green-500 to-emerald-500",
  "from-orange-500 to-amber-500",
  "from-pink-500 to-rose-500",
];

const today = new Date().toISOString().split("T")[0];

export default function SchedulePage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const [form, setForm] = useState<MeetingForm>({
    title: "", date: today, time: "10:00", duration: "60", participants: "", languages: ["en"],
  });
  const [loading, setLoading] = useState(false);
  const [scheduled, setScheduled] = useState<ScheduledMeeting[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newMeeting, setNewMeeting] = useState<ScheduledMeeting | null>(null);

  const appUrl = typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Meeting title is required"); return; }
    if (form.languages.length === 0) { toast.error("Select at least one language"); return; }
    setLoading(true);

    const code = generateMeetingCode();
    const joinLink = `${appUrl}/join/${code}`;

    try {
      try {
        const supabase = createClient();
        const db = supabase as any;
        await db.from("meetings").insert({
          title: form.title,
          host_id: user?.id ?? "anonymous",
          code,
          scheduled_at: `${form.date}T${form.time}:00`,
          duration_minutes: parseInt(form.duration),
          languages: form.languages,
          status: "scheduled",
        });
      } catch { /* DB optional */ }

      const meeting: ScheduledMeeting = {
        id: code,
        title: form.title,
        time: form.time,
        date: form.date,
        langs: form.languages.map((l) => l.toUpperCase()),
        participants: form.participants.split(",").filter(Boolean).length + 1,
        code,
        gradient: GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)],
        joinLink,
      };

      setScheduled((prev) => [meeting, ...prev]);
      setNewMeeting(meeting);
      setForm((f) => ({ ...f, title: "", participants: "" }));
      toast.success("Meeting scheduled!");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = (meeting: ScheduledMeeting) => {
    navigator.clipboard.writeText(meeting.joinLink);
    setCopiedId(meeting.id);
    toast.success("Join link copied! Share it with your friends.");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Code ${code} copied!`);
  };

  const deleteMeeting = (id: string) => {
    setScheduled((prev) => prev.filter((m) => m.id !== id));
    if (newMeeting?.id === id) setNewMeeting(null);
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
          Create a meeting and share the link or code with your friends
        </p>

        {/* New meeting created banner */}
        <AnimatePresence>
          {newMeeting && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 bg-green-500/10 border border-green-500/30 rounded-2xl p-5"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="font-bold text-green-600 dark:text-green-400 mb-1">
                    Meeting created!
                  </div>
                  <div className="text-sm text-foreground font-semibold">{newMeeting.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Share this with your friends so they can join:
                  </div>
                </div>
                <button
                  onClick={() => setNewMeeting(null)}
                  className="text-muted-foreground hover:text-foreground text-sm"
                >X</button>
              </div>

              <div className="mt-3 space-y-2">
                {/* Join link */}
                <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2.5">
                  <Link size={13} className="text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-foreground flex-1 truncate font-mono">{newMeeting.joinLink}</span>
                  <button
                    onClick={() => copyLink(newMeeting)}
                    className="flex items-center gap-1 text-xs font-semibold text-accent hover:opacity-80 flex-shrink-0"
                  >
                    {copiedId === newMeeting.id ? <Check size={13} /> : <Copy size={13} />}
                    {copiedId === newMeeting.id ? "Copied!" : "Copy link"}
                  </button>
                </div>

                {/* Meeting code */}
                <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2.5">
                  <span className="text-xs text-muted-foreground flex-shrink-0">Meeting code:</span>
                  <span className="text-sm font-black text-foreground font-mono tracking-widest flex-1">{newMeeting.code}</span>
                  <button
                    onClick={() => copyCode(newMeeting.code)}
                    className="flex items-center gap-1 text-xs font-semibold text-accent hover:opacity-80"
                  >
                    <Copy size={13} /> Copy
                  </button>
                </div>

                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={() => router.push(`/meeting?code=${newMeeting.code}`)}>
                    <Video size={13} /> Start now
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => copyLink(newMeeting)}>
                    <Share2 size={13} /> Share link
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Schedule form */}
        <Card className="p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <Input label="Meeting title" placeholder="e.g. Team catchup"
                value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Duration</label>
                <select className="input-base" value={form.duration}
                  onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">90 minutes</option>
                  <option value="120">2 hours</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Date</label>
                <input type="date" className="input-base" value={form.date} min={today}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Start time</label>
                <input type="time" className="input-base" value={form.time}
                  onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Input
                  label="Participant emails (optional — for your reference)"
                  placeholder="friend@gmail.com, colleague@company.com"
                  value={form.participants}
                  onChange={(e) => setForm((f) => ({ ...f, participants: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Note: Copy the meeting link after creating and share it manually via WhatsApp, email, or any messaging app.
                </p>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                Languages ({form.languages.length} selected)
              </label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.slice(0, 16).map((l) => (
                  <button key={l.code} type="button" onClick={() => toggleLanguage(l.code)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      form.languages.includes(l.code)
                        ? "bg-accent/10 border-accent/30 text-accent"
                        : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}>
                    {l.flag} {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={loading} size="lg">Create meeting →</Button>
            </div>
          </form>
        </Card>

        {/* Scheduled meetings */}
        {scheduled.length > 0 && (
          <>
            <h2 className="text-base font-bold text-foreground mb-4">Your meetings ({scheduled.length})</h2>
            <div className="space-y-3">
              {scheduled.map((m) => (
                <Card key={m.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 bg-gradient-to-br ${m.gradient} rounded-xl flex flex-col items-center justify-center text-white flex-shrink-0`}>
                      <div className="text-sm font-black leading-none">{m.time}</div>
                      <div className="text-[10px] opacity-80 mt-0.5">{m.date.split("-").slice(1).join("/")}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-foreground">{m.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground font-mono font-bold tracking-wider">{m.code}</span>
                        <button onClick={() => copyCode(m.code)} className="text-accent hover:opacity-70">
                          <Copy size={11} />
                        </button>
                      </div>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {m.langs.map((l) => (
                          <span key={l} className="text-[10px] bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20 font-bold">{l}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                      <Button size="sm" onClick={() => router.push(`/meeting?code=${m.code}`)}>
                        <Video size={13} /> Join
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => copyLink(m)}>
                        {copiedId === m.id ? <Check size={13} /> : <Copy size={13} />}
                        {copiedId === m.id ? "Copied!" : "Copy link"}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => deleteMeeting(m.id)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* How to invite friends */}
        <Card className="p-5 mt-6 border-accent/20 bg-accent/3">
          <div className="font-bold text-sm text-foreground mb-3">How to invite friends to your meeting</div>
          <div className="space-y-2">
            {[
              { step: "1", text: "Create a meeting using the form above" },
              { step: "2", text: "Copy the join link that appears after creating" },
              { step: "3", text: "Share the link via WhatsApp, email, or any messaging app" },
              { step: "4", text: "Your friend opens the link and joins — no account needed to join!" },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full accent-gradient flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {step}
                </div>
                <span className="text-sm text-muted-foreground">{text}</span>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
