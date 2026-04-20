"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Video, Globe, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui";
import { LANGUAGES } from "@/types";
import toast from "react-hot-toast";

export default function JoinPage() {
  const router = useRouter();
  const params = useParams();
  const code = (params.code as string ?? "").toUpperCase();

  const [name, setName] = useState("");
  const [language, setLanguage] = useState("en");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsLoggedIn(true);
        setName(session.user.user_metadata?.full_name ?? "");
      }
      setLoading(false);
    });
  }, []);

  const handleJoin = async () => {
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    setJoining(true);
    // Go to meeting with the code
    router.push(`/meeting?code=${code}&name=${encodeURIComponent(name)}&lang=${language}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-accent/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-500/8 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-3xl p-8 w-full max-w-[440px] shadow-xl relative z-10"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-6">
          <div className="w-10 h-10 rounded-2xl accent-gradient flex items-center justify-center text-white font-black text-sm">AZ</div>
          <span className="font-black text-xl tracking-tight">
            <span className="accent-gradient-text">A-Z</span> Meeting
          </span>
        </div>

        {/* Meeting info */}
        <div className="bg-accent/6 border border-accent/20 rounded-2xl p-4 mb-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Video size={16} className="text-accent" />
            <span className="text-sm font-bold text-foreground">You have been invited to a meeting</span>
          </div>
          <div className="text-2xl font-black text-foreground tracking-widest font-mono">{code}</div>
          <div className="flex items-center justify-center gap-1 mt-2 text-xs text-muted-foreground">
            <Globe size={11} /> AI translation · 50+ languages
          </div>
        </div>

        <div className="space-y-4">
          <Input
            label="Your name"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            autoFocus
          />

          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
              I want to hear the meeting in
            </label>
            <select
              className="input-base"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
              ))}
            </select>
          </div>

          <Button size="lg" loading={joining} onClick={handleJoin} className="w-full">
            <Video size={16} /> Join meeting now
          </Button>

          {!isLoggedIn && (
            <p className="text-xs text-muted-foreground text-center">
              No account needed to join.{" "}
              <button onClick={() => router.push("/auth/login")} className="text-accent hover:underline">
                Sign up free
              </button>{" "}
              to host your own meetings.
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1"><Users size={11} /> Free to join</div>
          <div className="flex items-center gap-1"><Globe size={11} /> 50+ languages</div>
        </div>
      </motion.div>
    </div>
  );
}
