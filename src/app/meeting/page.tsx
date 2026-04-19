"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  Globe, Hand, MoreHorizontal, X, MessageSquare,
  Users, Settings2, ChevronRight, Copy, Share2,
} from "lucide-react";
import { useAppStore } from "@/store/app";
import { Button, Badge, Avatar, SwitchRow } from "@/components/ui";
import { cn, flagForCode } from "@/lib/utils";
import { LANGUAGES } from "@/types";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────
interface MockParticipant {
  id: string;
  name: string;
  language: string;
  isSpeaking: boolean;
  isMuted: boolean;
  initials: string;
  color: string;
  bubble?: string;
}

const MOCK_PARTICIPANTS: MockParticipant[] = [
  { id: "1", name: "Maria R.", language: "es", isSpeaking: false, isMuted: true, initials: "MR", color: "from-green-500 to-emerald-500", bubble: '🌐 "Sí, estoy lista para el informe..."' },
  { id: "2", name: "Kenji T.", language: "ja", isSpeaking: false, isMuted: false, initials: "KT", color: "from-amber-500 to-orange-500", bubble: "🌐 '第一点を説明します...'" },
  { id: "3", name: "Fatima L.", language: "ar", isSpeaking: false, isMuted: true, initials: "FL", color: "from-red-500 to-pink-500", bubble: "🌐 'نعم، هذا رائع جداً...'" },
];

const CAPTIONS = [
  { speaker: "Arjun K.", text: 'Everyone ready to kick off the Q2 review?', orig: 'Original (HI): "चलिए Q2 समीक्षा शुरू करते हैं?"' },
  { speaker: "Maria R.", text: "Design metrics improved by 18% this quarter.", orig: 'Original (ES): "Las métricas mejoraron un 18%."' },
  { speaker: "Kenji T.", text: "Slide 3 covers key user research findings.", orig: 'Original (JA): "スライド3はユーザー調査の結果です。"' },
  { speaker: "Fatima L.", text: "Can we schedule a follow-up next week?", orig: 'Original (AR): "هل يمكننا جدولة مكالمة متابعة؟"' },
];

// ─── Main page ────────────────────────────────────────────────────────────────
function MeetingPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const code = params.get("code") ?? "X7K-2P9";

  const {
    micEnabled, cameraEnabled, toggleMic, toggleCamera,
    isHandRaised, setHandRaised, isScreenSharing, setScreenSharing, isRecording, setRecording,
    speakLanguage, hearLanguage, setSpeakLanguage, setHearLanguage,
    aiDubbingEnabled, setAiDubbingEnabled, captionsEnabled, setCaptionsEnabled,
    showOriginal, setShowOriginal, autoDetect, setAutoDetect, noiseCancellation, setNoiseCancellation,
    translationEngine, setTranslationEngine,
    videoQuality, setVideoQuality, virtualBackground, setVirtualBackground,
    cameraFilter, setCameraFilter, skinTouchup, setSkinTouchup, autoLighting, setAutoLighting, hdRecording, setHdRecording,
    rightPanelTab, setRightPanelTab,
    chatMessages, addChatMessage,
    user,
  } = useAppStore();

  const [capIdx, setCapIdx] = useState(0);
  const [speakingIdx, setSpeakingIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);

  // Rotate captions
  useEffect(() => {
    const t = setInterval(() => {
      setCapIdx((i) => (i + 1) % CAPTIONS.length);
      setSpeakingIdx((i) => (i + 1) % (MOCK_PARTICIPANTS.length + 1));
    }, 3800);
    return () => clearInterval(t);
  }, []);

  // Meeting timer
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const ss = (s % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
  };

  const cap = CAPTIONS[capIdx];

  const sendChat = () => {
    if (!chatInput.trim()) return;
    addChatMessage({
      id: Date.now().toString(),
      sender_id: user?.id ?? "me",
      sender_name: user?.full_name ?? "You",
      text: chatInput.trim(),
      original_language: speakLanguage,
      timestamp: new Date(),
    });
    setChatInput("");
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    setTimeout(() => {
      addChatMessage({
        id: (Date.now() + 1).toString(),
        sender_id: "maria",
        sender_name: "Maria R.",
        text: "Got it, thanks!",
        translated_text: "🌐 ES: ¡Entendido, gracias!",
        original_language: "es",
        timestamp: new Date(),
      });
    }, 1500);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    toast.success("Meeting code copied!");
  };

  const leaveMeeting = () => {
    router.push("/dashboard");
    toast("Left meeting", { icon: "👋" });
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        await navigator.mediaDevices.getDisplayMedia({ video: true });
        setScreenSharing(true);
        toast.success("Screen sharing started");
      } catch {
        toast.error("Screen share cancelled");
      }
    } else {
      setScreenSharing(false);
      toast("Screen share stopped");
    }
  };

  return (
    <div className="flex h-screen bg-[hsl(var(--background))] overflow-hidden flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-card border-b border-border flex-shrink-0 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg accent-gradient flex items-center justify-center text-white font-black text-xs">AZ</div>
          <div>
            <div className="text-xs font-bold text-foreground leading-none">A-Z Meeting</div>
            <button onClick={copyCode} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-accent transition-colors mt-0.5">
              {code} <Copy size={9} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse2" />
            {formatTime(elapsed)}
          </div>
          {isRecording && (
            <Badge variant="red" className="gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse2" />
              REC
            </Badge>
          )}
          <Badge variant="accent">🌐 {MOCK_PARTICIPANTS.length + 1} langs active</Badge>
          <button onClick={() => setPanelOpen((v) => !v)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight size={15} className={cn("transition-transform", !panelOpen && "rotate-180")} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Video grid */}
        <div className="flex-1 flex flex-col gap-2 p-3 min-w-0 overflow-hidden">
          <div className={cn("grid gap-2 flex-1 min-h-0", MOCK_PARTICIPANTS.length + 1 <= 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-2")}>
            {/* Self tile */}
            <VideoTile
              name={user?.full_name ?? "You"}
              initials={(user?.full_name ?? "AK").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
              language={speakLanguage}
              isSpeaking={speakingIdx === 0}
              isMuted={!micEnabled}
              cameraOn={cameraEnabled}
              isYou
              bubble={speakingIdx === 0 ? `🌐 "${cap.text}"` : undefined}
              bgFilter={virtualBackground !== "none" ? virtualBackground : undefined}
            />
            {MOCK_PARTICIPANTS.map((p, i) => (
              <VideoTile
                key={p.id}
                name={p.name}
                initials={p.initials}
                language={p.language}
                isSpeaking={speakingIdx === i + 1}
                isMuted={p.isMuted}
                cameraOn
                color={p.color}
                bubble={speakingIdx === i + 1 ? p.bubble : undefined}
              />
            ))}
          </div>

          {/* Captions bar */}
          {captionsEnabled && (
            <motion.div
              key={capIdx}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-xl px-4 py-3 flex-shrink-0"
            >
              <div className="flex items-start gap-3">
                <span className="text-[10px] font-bold bg-accent/10 text-accent px-2 py-0.5 rounded-full border border-accent/20 mt-0.5 flex-shrink-0">🌐 LIVE</span>
                <div>
                  <p className="text-sm text-foreground leading-relaxed">
                    <span className="font-semibold text-accent">{cap.speaker}</span> {cap.text}
                  </p>
                  {showOriginal && <p className="text-xs text-muted-foreground mt-0.5">{cap.orig}</p>}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right panel */}
        <AnimatePresence>
          {panelOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 272, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="bg-card border-l border-border flex flex-col overflow-hidden flex-shrink-0 hidden md:flex"
            >
              {/* Tabs */}
              <div className="flex border-b border-border flex-shrink-0">
                {(["translate", "video", "chat", "people"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setRightPanelTab(t)}
                    className={cn(
                      "flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2",
                      rightPanelTab === t
                        ? "text-accent border-accent"
                        : "text-muted-foreground border-transparent hover:text-foreground"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {/* ── Translate tab ── */}
                {rightPanelTab === "translate" && (
                  <>
                    <div className="flex items-center gap-2 bg-accent/6 border border-accent/15 rounded-lg px-3 py-2">
                      <Globe size={13} className="text-accent flex-shrink-0" />
                      <span className="text-xs font-semibold text-accent">AI translation active · {MOCK_PARTICIPANTS.length + 1} langs</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">You speak</label>
                        <select value={speakLanguage} onChange={(e) => setSpeakLanguage(e.target.value)} className="input-base text-xs py-2">
                          {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">You hear in</label>
                        <select value={hearLanguage} onChange={(e) => setHearLanguage(e.target.value)} className="input-base text-xs py-2">
                          {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <SwitchRow label="AI voice dubbing" checked={aiDubbingEnabled} onCheckedChange={setAiDubbingEnabled} />
                      <SwitchRow label="Live captions" checked={captionsEnabled} onCheckedChange={setCaptionsEnabled} />
                      <SwitchRow label="Show original text" checked={showOriginal} onCheckedChange={setShowOriginal} />
                      <SwitchRow label="Auto-detect language" checked={autoDetect} onCheckedChange={setAutoDetect} />
                      <SwitchRow label="Noise cancellation" checked={noiseCancellation} onCheckedChange={setNoiseCancellation} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Engine</label>
                      <select value={translationEngine} onChange={(e) => setTranslationEngine(e.target.value)} className="input-base text-xs py-2">
                        <option value="az-ai">A-Z AI (recommended)</option>
                        <option value="deepl">DeepL Neural</option>
                        <option value="google">Google Neural MT</option>
                        <option value="azure">Azure Translator</option>
                      </select>
                    </div>
                  </>
                )}

                {/* ── Video tab ── */}
                {rightPanelTab === "video" && (
                  <>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Quality</label>
                      <div className="flex gap-1.5 flex-wrap">
                        {["Auto", "720p", "1080p", "4K"].map((q) => (
                          <button
                            key={q}
                            onClick={() => setVideoQuality(q)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                              videoQuality === q
                                ? "bg-accent/10 border-accent/30 text-accent"
                                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                          >{q}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Virtual background</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {BG_OPTIONS.map((bg) => (
                          <button
                            key={bg.id}
                            onClick={() => setVirtualBackground(bg.id)}
                            className={cn(
                              "h-12 rounded-lg text-xs font-semibold text-white flex items-center justify-center border-2 transition-all",
                              virtualBackground === bg.id ? "border-accent scale-105" : "border-transparent",
                              bg.id === "none" ? "bg-muted text-muted-foreground" : bg.style
                            )}
                          >{bg.label}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Camera filter</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {FILTER_OPTIONS.map((f) => (
                          <button
                            key={f.id}
                            onClick={() => setCameraFilter(f.id)}
                            className={cn(
                              "py-2 rounded-lg text-xs font-medium border transition-all",
                              cameraFilter === f.id
                                ? "bg-accent/10 border-accent/30 text-accent"
                                : "border-border text-muted-foreground hover:bg-muted"
                            )}
                          >{f.label}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <SwitchRow label="AI skin touch-up" checked={skinTouchup} onCheckedChange={setSkinTouchup} />
                      <SwitchRow label="Auto lighting" checked={autoLighting} onCheckedChange={setAutoLighting} />
                      <SwitchRow label="HD recording" checked={hdRecording} onCheckedChange={setHdRecording} />
                    </div>
                  </>
                )}

                {/* ── Chat tab ── */}
                {rightPanelTab === "chat" && (
                  <div className="flex flex-col h-full min-h-0 gap-3" style={{ height: "calc(100vh - 240px)" }}>
                    <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                      {chatMessages.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">No messages yet. Messages are auto-translated.</p>
                      )}
                      {chatMessages.map((msg) => (
                        <div key={msg.id} className="bg-muted rounded-xl p-3 border border-border">
                          <div className={cn("text-[10px] font-bold mb-1", msg.sender_id === user?.id ? "text-green-500" : "text-accent")}>
                            {msg.sender_id === user?.id ? "You" : msg.sender_name}
                          </div>
                          <div className="text-xs text-foreground leading-relaxed">{msg.text}</div>
                          {msg.translated_text && (
                            <div className="text-[10px] text-muted-foreground mt-1">{msg.translated_text}</div>
                          )}
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendChat()}
                        placeholder="Message (auto-translated)…"
                        className="input-base flex-1 text-xs py-2"
                      />
                      <button onClick={sendChat} className="accent-gradient text-white px-3 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity">
                        Send
                      </button>
                    </div>
                  </div>
                )}

                {/* ── People tab ── */}
                {rightPanelTab === "people" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-muted rounded-xl p-3 text-center border border-border">
                        <div className="text-lg font-black text-foreground">{MOCK_PARTICIPANTS.length + 1}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Participants</div>
                      </div>
                      <div className="bg-muted rounded-xl p-3 text-center border border-border">
                        <div className="text-lg font-black text-foreground">{MOCK_PARTICIPANTS.length + 1}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Languages</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">In meeting</div>
                      <div className={cn("flex items-center gap-2.5 bg-muted rounded-xl px-3 py-2.5 border border-border", speakingIdx === 0 && "border-green-500/40")}>
                        <Avatar name={user?.full_name ?? "You"} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-foreground truncate">{user?.full_name ?? "You"}</div>
                        </div>
                        <span className="text-[9px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                          {speakLanguage.toUpperCase()}
                        </span>
                      </div>
                      {MOCK_PARTICIPANTS.map((p) => (
                        <div key={p.id} className="flex items-center gap-2.5 bg-muted rounded-xl px-3 py-2.5 border border-border">
                          <div className={cn("w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold", p.color)}>
                            {p.initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-foreground truncate">{p.name}</div>
                          </div>
                          <span className="text-[9px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                            {p.language.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="bg-accent/5 border border-accent/15 rounded-xl p-3 space-y-1.5">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">AI Stats</div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Translation latency</span>
                        <span className="font-semibold text-green-500">98ms</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Accuracy</span>
                        <span className="font-semibold text-foreground">97%</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Words translated</span>
                        <span className="font-semibold text-foreground">{Math.floor(elapsed * 2).toLocaleString()}</span>
                      </div>
                    </div>

                    <Button variant="ghost" size="sm" className="w-full gap-2" onClick={copyCode}>
                      <Copy size={13} /> Copy invite code
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control bar */}
      <div className="bg-card border-t border-border px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <CtrlBtn active={!micEnabled} onClick={toggleMic} activeColor="red" label="Mic" title={micEnabled ? "Mute" : "Unmute"}>
            {micEnabled ? <Mic size={18} /> : <MicOff size={18} />}
          </CtrlBtn>
          <CtrlBtn active={!cameraEnabled} onClick={toggleCamera} activeColor="red" label="Camera" title={cameraEnabled ? "Stop video" : "Start video"}>
            {cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
          </CtrlBtn>
          <CtrlBtn active={isScreenSharing} onClick={toggleScreenShare} activeColor="accent" label="Share">
            {isScreenSharing ? <MonitorOff size={18} /> : <Monitor size={18} />}
          </CtrlBtn>
          <CtrlBtn active={false} onClick={() => setRightPanelTab("translate")} label="Translate">
            <Globe size={18} className="text-accent" />
          </CtrlBtn>
        </div>

        <div className="text-center flex-1 hidden md:block">
          <div className="text-xs font-semibold text-foreground">a-zmeet.io / {code}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{formatTime(elapsed)} elapsed</div>
        </div>

        <div className="flex items-center gap-2">
          <CtrlBtn
            active={isHandRaised}
            onClick={() => { setHandRaised(!isHandRaised); if (!isHandRaised) toast.success("Hand raised"); }}
            activeColor="amber"
            label="Hand"
          >
            <Hand size={18} />
          </CtrlBtn>
          <CtrlBtn active={false} onClick={() => { setRightPanelTab("chat"); setPanelOpen(true); }} label="Chat">
            <MessageSquare size={18} />
          </CtrlBtn>
          <CtrlBtn active={false} onClick={() => { setRightPanelTab("people"); setPanelOpen(true); }} label="People">
            <Users size={18} />
          </CtrlBtn>
          <div className="relative">
            <CtrlBtn active={moreOpen} onClick={() => setMoreOpen((v) => !v)} label="More">
              <MoreHorizontal size={18} />
            </CtrlBtn>
            <AnimatePresence>
              {moreOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 8 }}
                  className="absolute bottom-14 right-0 bg-card border border-border rounded-xl shadow-xl py-1.5 w-48 z-50"
                >
                  {[
                    { label: isRecording ? "Stop recording" : "Start recording", action: () => { setRecording(!isRecording); toast.success(isRecording ? "Recording stopped" : "Recording started"); setMoreOpen(false); } },
                    { label: "Copy meeting link", action: () => { copyCode(); setMoreOpen(false); } },
                    { label: "Meeting settings", action: () => { setRightPanelTab("video"); setPanelOpen(true); setMoreOpen(false); } },
                    { label: "Report a problem", action: () => { toast("Thanks for the report"); setMoreOpen(false); } },
                  ].map(({ label, action }) => (
                    <button key={label} onClick={action} className="w-full text-left px-4 py-2 text-xs text-foreground hover:bg-muted transition-colors">
                      {label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={leaveMeeting}
            className="flex flex-col items-center gap-1 cursor-pointer"
            title="Leave meeting"
          >
            <div className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 flex items-center justify-center transition-all">
              <X size={20} className="text-white" />
            </div>
            <span className="text-[9px] text-red-500 font-medium">Leave</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Video Tile ───────────────────────────────────────────────────────────────
function VideoTile({ name, initials, language, isSpeaking, isMuted, cameraOn, isYou, bubble, color = "from-violet-500 to-purple-600", bgFilter }: {
  name: string; initials: string; language: string; isSpeaking: boolean;
  isMuted: boolean; cameraOn: boolean; isYou?: boolean; bubble?: string;
  color?: string; bgFilter?: string;
}) {
  return (
    <div className={cn(
      "relative rounded-xl border-2 bg-muted overflow-hidden flex items-center justify-center transition-all duration-300 min-h-0",
      isSpeaking ? "border-green-500 speaking-ring" : "border-border"
    )}>
      {/* BG overlay */}
      {bgFilter && bgFilter !== "none" && (
        <div className={cn("absolute inset-0 opacity-50 z-0", BG_STYLES[bgFilter as keyof typeof BG_STYLES] ?? "")} />
      )}

      {/* Avatar */}
      <div className={cn("w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-xl z-10", color)}>
        {initials}
      </div>

      {/* Bubble */}
      <AnimatePresence>
        {bubble && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-2 left-2 right-2 bg-black/70 backdrop-blur-sm border border-accent/30 rounded-lg px-2.5 py-1.5 text-[10px] text-purple-200 leading-snug z-20"
          >
            {bubble}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mic indicator */}
      <div className="absolute top-2 right-2 z-20">
        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px]", isMuted ? "bg-red-500/80" : "bg-black/50 border border-white/20")}>
          {isMuted ? <MicOff size={11} className="text-white" /> : <Mic size={11} className="text-white" />}
        </div>
      </div>

      {/* Bottom overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 z-20 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-white">{name}{isYou ? " (You)" : ""}</span>
        <span className="text-[9px] font-bold bg-accent/60 text-white px-1.5 py-0.5 rounded">
          {flagForCode(language)} {language.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

// ─── Control button ───────────────────────────────────────────────────────────
function CtrlBtn({ children, onClick, active, activeColor, label, title }: {
  children: React.ReactNode; onClick: () => void; active: boolean;
  activeColor?: "red" | "accent" | "amber"; label: string; title?: string;
}) {
  const colors = {
    red: "bg-red-500/10 border-red-500/30 text-red-500",
    accent: "bg-accent/10 border-accent/30 text-accent",
    amber: "bg-amber-500/10 border-amber-500/30 text-amber-500",
  };
  return (
    <button onClick={onClick} title={title} className="flex flex-col items-center gap-1 cursor-pointer group">
      <div className={cn(
        "w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-150 active:scale-95",
        active && activeColor ? colors[activeColor] : "bg-muted border-border text-muted-foreground group-hover:text-foreground group-hover:border-accent/40 group-hover:bg-muted/80"
      )}>
        {children}
      </div>
      <span className={cn("text-[9px] font-medium", active && activeColor === "red" ? "text-red-500" : "text-muted-foreground")}>
        {label}
      </span>
    </button>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const BG_OPTIONS = [
  { id: "none", label: "None", style: "" },
  { id: "blur", label: "Blur", style: "bg-blue-900" },
  { id: "office", label: "Office", style: "bg-gradient-to-br from-purple-900 to-violet-700" },
  { id: "cafe", label: "Cafe", style: "bg-gradient-to-br from-amber-900 to-orange-600" },
  { id: "beach", label: "Beach", style: "bg-gradient-to-br from-blue-800 to-cyan-400" },
  { id: "space", label: "Space", style: "bg-gradient-to-br from-gray-900 to-violet-900" },
];

const BG_STYLES: Record<string, string> = {
  blur: "bg-blue-900",
  office: "bg-gradient-to-br from-purple-900 to-violet-700",
  cafe: "bg-gradient-to-br from-amber-900 to-orange-600",
  beach: "bg-gradient-to-br from-blue-800 to-cyan-400",
  space: "bg-gradient-to-br from-gray-900 to-violet-900",
};

const FILTER_OPTIONS = [
  { id: "none", label: "None" },
  { id: "warm", label: "🌅 Warm" },
  { id: "cool", label: "❄️ Cool" },
  { id: "vivid", label: "🎨 Vivid" },
  { id: "soft", label: "🌸 Soft" },
  { id: "mono", label: "⬛ Mono" },
];

export default function MeetingPage() {
  return (
    <Suspense>
      <MeetingPageInner />
    </Suspense>
  );
}
