"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Star, Lightbulb, Bug, Globe, MessageSquare, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/app";
import { Button, Card, Badge, StatCell } from "@/components/ui";
import toast from "react-hot-toast";

type FeedbackType = "feature" | "bug" | "translation" | "general";

const FEEDBACK_TYPES: { id: FeedbackType; label: string; icon: React.ReactNode }[] = [
  { id: "feature", label: "💡 Feature idea", icon: <Lightbulb size={14} /> },
  { id: "bug", label: "🐛 Bug report", icon: <Bug size={14} /> },
  { id: "translation", label: "🌐 Translation issue", icon: <Globe size={14} /> },
  { id: "general", label: "💬 General", icon: <MessageSquare size={14} /> },
];

const TAGS = ["Voice translation","Live captions","Video quality","Backgrounds","Filters","Chat","Scheduling","UI/UX","Performance"];

const STATUS_STYLES: Record<string, string> = {
  planned: "bg-accent/10 text-accent border-accent/20",
  resolved: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  reviewing: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  open: "bg-muted text-muted-foreground border-border",
};

const COMMUNITY_FEEDBACK = [
  { id: "1", type: "feature" as FeedbackType, rating: 5, status: "planned", text: '"Auto-summarize meeting notes and send them translated to each participant after the call."', author: "Arjun K.", date: "2 days ago", tags: ["Voice translation","Captions"] },
  { id: "2", type: "bug" as FeedbackType, rating: 3, status: "resolved", text: '"Background blur sometimes flickers when switching between speakers on 4K mode."', author: "Anonymous", date: "5 days ago", tags: ["Backgrounds","Video quality"] },
  { id: "3", type: "translation" as FeedbackType, rating: 4, status: "reviewing", text: '"Hindi to Arabic translation misses some idiomatic expressions — sounds unnatural."', author: "Maria R.", date: "1 week ago", tags: ["Voice translation"] },
  { id: "4", type: "general" as FeedbackType, rating: 5, status: "resolved", text: '"A-Z Meeting has completely transformed how our international team collaborates. We use 6 languages daily."', author: "Kenji T.", date: "2 weeks ago", tags: [] },
];

export default function FeedbackPage() {
  const supabase = createClient();
  const user = useAppStore((s) => s.user);

  const [modalOpen, setModalOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fbType, setFbType] = useState<FeedbackType>("feature");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [myFeedback, setMyFeedback] = useState(COMMUNITY_FEEDBACK);

  const handleSubmit = async () => {
    if (!message.trim()) { toast.error("Please describe your feedback"); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("feedback").insert({
        user_id: anonymous ? null : user?.id ?? null,
        type: fbType,
        rating: rating || null,
        message: message.trim(),
        tags: selectedTags,
        anonymous,
      });
      if (error) throw error;
      setSubmitted(true);
      setMyFeedback((prev) => [{
        id: Date.now().toString(),
        type: fbType,
        rating,
        status: "open",
        text: `"${message.trim()}"`,
        author: anonymous ? "Anonymous" : user?.full_name ?? "You",
        date: "Just now",
        tags: selectedTags,
      }, ...prev]);
    } catch {
      toast.error("Submission failed — try again");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setFbType("feature");
    setRating(0);
    setMessage("");
    setSelectedTags([]);
    setAnonymous(false);
  };

  const closeModal = () => {
    setModalOpen(false);
    setTimeout(resetForm, 300);
  };

  const typeIcon: Record<FeedbackType, React.ReactNode> = {
    feature: <span className="text-xl">💡</span>,
    bug: <span className="text-xl">🐛</span>,
    translation: <span className="text-xl">🌐</span>,
    general: <span className="text-xl">💬</span>,
  };

  return (
    <div className="min-h-screen bg-background px-6 py-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-foreground mb-1">Feedback & suggestions</h1>
            <p className="text-sm text-muted-foreground">Track your submissions and see what the community is saying</p>
          </div>
          <Button onClick={() => setModalOpen(true)} className="gap-2">
            <Plus size={15} /> Share feedback
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCell value={142} label="Total submissions" />
          <StatCell value={38} label="Features shipped" />
          <StatCell value="4.7" label="Avg. rating" />
          <StatCell value="94%" label="Response rate" />
        </div>

        {/* Feedback list */}
        <h2 className="text-base font-bold text-foreground mb-4">Community feedback</h2>
        <div className="space-y-3">
          {myFeedback.map((item) => (
            <Card key={item.id} className="p-5 flex gap-4 hover:border-accent/25 transition-colors">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                item.type === "feature" ? "bg-accent/10" :
                item.type === "bug" ? "bg-red-500/10" :
                item.type === "translation" ? "bg-green-500/10" : "bg-cyan-500/10"
              }`}>
                {typeIcon[item.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {item.type.replace("_", " ")}
                  </span>
                  {item.rating > 0 && (
                    <span className="text-amber-500 text-xs">{"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)}</span>
                  )}
                  <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[item.status]}`}>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </span>
                </div>
                <p className="text-sm text-foreground leading-relaxed mb-2">{item.text}</p>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>{item.author} · {item.date}</span>
                  {item.tags.map((tag) => (
                    <span key={tag} className="bg-muted px-2 py-0.5 rounded-full border border-border">{tag}</span>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Feedback Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && closeModal()}>
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              className="bg-card border border-border rounded-2xl p-7 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-foreground">Share your feedback</h2>
                <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors">✕</button>
              </div>

              {submitted ? (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mb-4">
                    <CheckCircle size={28} className="text-green-500" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Thank you!</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                    Your feedback helps us improve A-Z Meeting for everyone worldwide. We review every submission.
                  </p>
                  <div className="flex gap-3 mt-6">
                    <Button onClick={closeModal}>Done</Button>
                    <Button variant="ghost" onClick={resetForm}>Submit another</Button>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-5">
                  {/* Type */}
                  <div>
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Feedback type</div>
                    <div className="flex flex-wrap gap-2">
                      {FEEDBACK_TYPES.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setFbType(t.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                            fbType === t.id ? "bg-accent/10 border-accent/30 text-accent" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stars */}
                  <div>
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Overall rating</div>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onMouseEnter={() => setHoverRating(n)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRating(n)}
                          className={`text-3xl leading-none transition-all hover:scale-110 ${(hoverRating || rating) >= n ? "text-amber-400" : "text-border"}`}
                        >★</button>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {["","Poor","Fair","Good","Great","Excellent"][hoverRating || rating] || "Click to rate"}
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Tell us more</div>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe your experience, idea, or issue..."
                      className="input-base min-h-[80px] resize-y"
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Related features</div>
                    <div className="flex flex-wrap gap-1.5">
                      {TAGS.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => setSelectedTags((t) => t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag])}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            selectedTags.includes(tag) ? "bg-accent/10 border-accent/30 text-accent" : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 flex-wrap gap-3">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                      <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="accent-accent w-3.5 h-3.5" />
                      Submit anonymously
                    </label>
                    <Button onClick={handleSubmit} loading={submitting}>Submit →</Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
