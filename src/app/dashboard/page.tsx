"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Video, Calendar, Users, Globe, ArrowRight, Plus, Clock, TrendingUp } from "lucide-react";
import { Button, Card, StatCell } from "@/components/ui";
import { useAppStore } from "@/store/app";
import { generateMeetingCode } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

const UPCOMING = [
  { id: "1", title: "Q2 Global Review", time: "10:00", date: "Apr 22", langs: ["EN","ES","JA","AR"], participants: 4, code: "X7K-2P9" },
  { id: "2", title: "Design Sprint Kickoff", time: "14:30", date: "Apr 24", langs: ["EN","FR","DE"], participants: 6, code: "B3M-5T1" },
  { id: "3", title: "Investor Call — APAC", time: "09:00", date: "Apr 28", langs: ["EN","ZH","KO","JA"], participants: 8, code: "Q9R-7K4" },
];

const FEATURES = [
  { icon: Globe, title: "AI voice dubbing", desc: "Everyone hears you in their language in real time.", color: "from-violet-500 to-purple-600" },
  { icon: Clock, title: "Live captions", desc: "97% accurate subtitles auto-translated as you speak.", color: "from-blue-500 to-cyan-500" },
  { icon: Users, title: "End-to-end encrypted", desc: "Zero data retention. Your conversations stay private.", color: "from-green-500 to-emerald-500" },
];

export default function DashboardPage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const setActiveMeeting = useAppStore((s) => s.setActiveMeeting);
  const [startingMeeting, setStartingMeeting] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const startInstantMeeting = async () => {
    setStartingMeeting(true);
    try {
      const code = generateMeetingCode();
      // Try to save to DB but don't block if it fails
      try {
        const supabase = createClient();
        const db = supabase as any;
        const { data } = await db.from("meetings").insert({
          title: "Instant meeting",
          host_id: user?.id ?? "anonymous",
          code,
          status: "active",
          languages: [user?.native_language ?? "en"],
        }).select().single();
        if (data) setActiveMeeting(data.id, code);
      } catch {
        // DB save failed but we can still join with just the code
        setActiveMeeting(null, code);
      }
      router.push(`/meeting?code=${code}`);
    } catch (e: any) {
      toast.error("Failed to create meeting: " + (e.message ?? "unknown error"));
    } finally {
      setStartingMeeting(false);
    }
  };

  const joinMeeting = (code: string) => {
    if (!code.trim()) { toast.error("Please enter a meeting code"); return; }
    router.push(`/join/${code.trim().toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <section className="relative px-6 pt-12 pb-10 overflow-hidden border-b border-border">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/6 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        </div>
        <div className="max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="inline-flex items-center gap-2 bg-accent/8 border border-accent/20 rounded-full px-4 py-1.5 text-xs font-semibold text-accent mb-4">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse2" />
              AI translation active — 50+ languages
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground mb-3 leading-tight">
              Good {getGreeting()},{" "}
              <span className="accent-gradient-text">{user?.full_name?.split(" ")[0] ?? "there"}</span>
            </h1>
            <p className="text-base text-muted-foreground mb-8 max-w-lg leading-relaxed">
              Start a multilingual meeting or join with a code.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
            className="flex flex-wrap gap-3 items-center">
            <Button size="lg" loading={startingMeeting} onClick={startInstantMeeting} className="gap-2">
              <Video size={17} /> Start instant meeting
            </Button>
            <div className="flex items-center gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && joinMeeting(joinCode)}
                placeholder="Enter code e.g. X7K-2P9"
                className="input-base w-48 h-11"
                maxLength={12}
              />
              <Button variant="ghost" size="lg" onClick={() => joinMeeting(joinCode)}>Join</Button>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="px-6 py-8 max-w-5xl space-y-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCell value={user?.total_meetings ?? 0} label="Meetings" />
          <StatCell value={user?.languages?.length ?? 1} label="Languages" />
          <StatCell value={formatMinutes(user?.total_minutes ?? 0)} label="Hours spent" />
          <StatCell value={formatWords(user?.total_words_translated ?? 0)} label="Words translated" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-foreground">Upcoming meetings</h2>
            <Button variant="ghost" size="sm" onClick={() => router.push("/schedule")} className="gap-1.5">
              View all <ArrowRight size={13} />
            </Button>
          </div>
          <div className="space-y-3">
            {UPCOMING.map((m) => (
              <Card key={m.id} hover className="p-4 flex items-center gap-4" onClick={() => joinMeeting(m.code)}>
                <div className="w-14 h-14 accent-gradient rounded-xl flex flex-col items-center justify-center text-white flex-shrink-0">
                  <div className="text-base font-black leading-none">{m.time}</div>
                  <div className="text-[10px] opacity-80 mt-0.5">{m.date}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-foreground">{m.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{m.participants} participants · Code: {m.code}</div>
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {m.langs.map((l) => (
                      <span key={l} className="text-[10px] bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20 font-bold">{l}</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" onClick={(e) => { e.stopPropagation(); joinMeeting(m.code); }}>Join</Button>
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); router.push("/schedule"); }}>Edit</Button>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <h2 className="text-base font-bold text-foreground mb-4">Why A-Z Meeting</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc, color }) => (
              <Card key={title} className="p-5">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4`}>
                  <Icon size={18} className="text-white" />
                </div>
                <div className="font-semibold text-sm text-foreground mb-1.5">{title}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">{desc}</div>
              </Card>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="text-base font-bold text-foreground mb-4">Quick actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Plus, label: "New meeting", action: startInstantMeeting, accent: true },
              { icon: Calendar, label: "Schedule", action: () => router.push("/schedule") },
              { icon: Users, label: "Invite team", action: () => { navigator.clipboard.writeText(window.location.origin); toast.success("Copied invite link!"); } },
              { icon: TrendingUp, label: "Analytics", action: () => router.push("/profile") },
            ].map(({ icon: Icon, label, action, accent }) => (
              <button key={label} onClick={action}
                className={`flex flex-col items-center gap-2.5 p-5 rounded-xl border transition-all hover:-translate-y-0.5 ${accent ? "border-accent/25 bg-accent/8 hover:bg-accent/12" : "border-border bg-card hover:bg-muted"}`}>
                <Icon size={20} className={accent ? "text-accent" : "text-muted-foreground"} />
                <span className={`text-xs font-semibold ${accent ? "text-accent" : "text-foreground"}`}>{label}</span>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
function formatMinutes(mins: number) { return `${Math.round(mins / 60)}h`; }
function formatWords(words: number) { return words >= 1000 ? `${(words / 1000).toFixed(0)}k` : String(words); }
