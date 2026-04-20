"use client";

import {
  useState, useEffect, useRef, useCallback, Suspense
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  Globe, Hand, MoreHorizontal, X, MessageSquare,
  Users, Copy, PhoneOff, Settings2, ChevronRight,
  AlertCircle, Loader2, Share2, Camera,
} from "lucide-react";
import { useAppStore } from "@/store/app";
import { Button, Badge, Avatar, SwitchRow } from "@/components/ui";
import { cn, flagForCode, generateMeetingCode } from "@/lib/utils";
import { LANGUAGES } from "@/types";
import toast from "react-hot-toast";

// ─── Camera filter CSS values ────────────────────────────────────────────────
const FILTER_CSS: Record<string, string> = {
  none: "none",
  warm: "sepia(0.4) saturate(1.4) hue-rotate(-10deg)",
  cool: "saturate(0.7) hue-rotate(25deg) brightness(1.1)",
  vivid: "saturate(1.9) contrast(1.12)",
  soft: "blur(0.4px) brightness(1.05) saturate(0.9)",
  mono: "grayscale(1)",
};

const BG_OPTIONS = [
  { id: "none",   label: "None",   style: "" },
  { id: "blur",   label: "Blur",   style: "bg-gradient-to-br from-slate-700 to-slate-900" },
  { id: "office", label: "Office", style: "bg-gradient-to-br from-purple-900 to-violet-700" },
  { id: "cafe",   label: "Cafe",   style: "bg-gradient-to-br from-amber-900 to-orange-600" },
  { id: "beach",  label: "Beach",  style: "bg-gradient-to-br from-blue-800 to-cyan-400" },
  { id: "space",  label: "Space",  style: "bg-gradient-to-br from-gray-900 to-violet-900" },
];

const FILTER_OPTIONS = [
  { id: "none",  label: "None" },
  { id: "warm",  label: "🌅 Warm" },
  { id: "cool",  label: "❄️ Cool" },
  { id: "vivid", label: "🎨 Vivid" },
  { id: "soft",  label: "🌸 Soft" },
  { id: "mono",  label: "⬛ Mono" },
];

const CAPTIONS = [
  { speaker: "Arjun K.",  text: "Let's kick off the Q2 review — everyone ready?",        orig: 'Original (HI): "चलिए Q2 समीक्षा शुरू करते हैं?"' },
  { speaker: "Maria R.",  text: "Design metrics improved by 18% this quarter.",           orig: 'Original (ES): "Las métricas mejoraron un 18%."' },
  { speaker: "Kenji T.",  text: "Slide 3 covers the key user research findings.",         orig: 'Original (JA): "スライド3はユーザー調査の結果です。"' },
  { speaker: "Fatima L.", text: "Can we schedule a follow-up for next week?",             orig: 'Original (AR): "هل يمكننا جدولة مكالمة متابعة؟"' },
];

// ─── Lobby (pre-join preview) ─────────────────────────────────────────────────
function LobbyScreen({
  code,
  onJoin,
}: {
  code: string;
  onJoin: (name: string, lang: string) => void;
}) {
  const user = useAppStore((s) => s.user);
  const [name, setName] = useState(user?.full_name ?? "");
  const [lang, setLang] = useState(user?.preferred_language ?? "en");
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [stream, setStream]   = useState<MediaStream | null>(null);
  const [camErr, setCamErr]   = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  // Start camera preview
  useEffect(() => {
    let s: MediaStream | null = null;
    if (camOn) {
      navigator.mediaDevices
        .getUserMedia({ video: { width: 640, height: 480 }, audio: micOn })
        .then((ms) => {
          s = ms;
          setStream(ms);
          setCamErr("");
          if (videoRef.current) {
            videoRef.current.srcObject = ms;
          }
        })
        .catch((err) => {
          setCamErr(
            err.name === "NotAllowedError"
              ? "Camera permission denied. Please allow camera access."
              : "Camera not available on this device."
          );
        });
    }
    return () => {
      if (s) s.getTracks().forEach((t) => t.stop());
    };
  }, [camOn, micOn]);

  const copyLink = () => {
    const url = `${window.location.origin}/join/${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Invite link copied!");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-accent/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-500/8 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[820px] grid md:grid-cols-2 gap-5 relative z-10"
      >
        {/* Camera preview */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="relative bg-black aspect-video flex items-center justify-center">
            {camOn && !camErr ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                style={{ filter: "none", transform: "scaleX(-1)" }}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-white/50">
                <Camera size={40} />
                <span className="text-xs text-center px-4">
                  {camErr || "Camera is off"}
                </span>
                {camErr && (
                  <button
                    onClick={() => setCamOn(true)}
                    className="text-xs text-accent underline"
                  >
                    Try again
                  </button>
                )}
              </div>
            )}
            {/* Mic / Cam toggles */}
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
              <button
                onClick={() => setMicOn((v) => !v)}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                  micOn
                    ? "bg-white/10 border-white/30 text-white"
                    : "bg-red-500 border-red-500 text-white"
                )}
              >
                {micOn ? <Mic size={16} /> : <MicOff size={16} />}
              </button>
              <button
                onClick={() => setCamOn((v) => !v)}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                  camOn
                    ? "bg-white/10 border-white/30 text-white"
                    : "bg-red-500 border-red-500 text-white"
                )}
              >
                {camOn ? <Video size={16} /> : <VideoOff size={16} />}
              </button>
            </div>
          </div>
          <div className="p-4 flex flex-col gap-2">
            <div className="text-xs text-muted-foreground text-center">
              Your camera preview — only you can see this
            </div>
            <button
              onClick={copyLink}
              className="flex items-center justify-center gap-2 text-xs text-accent hover:underline"
            >
              <Share2 size={12} /> Copy invite link for others
            </button>
          </div>
        </div>

        {/* Join form */}
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl accent-gradient flex items-center justify-center text-white font-black text-xs">
              AZ
            </div>
            <div>
              <div className="font-black text-base text-foreground">
                Ready to join?
              </div>
              <div className="text-xs text-muted-foreground">
                Meeting code:{" "}
                <span className="font-mono font-bold text-foreground">
                  {code}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Your name
            </label>
            <input
              className="input-base"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && name.trim() && onJoin(name, lang)}
              autoFocus
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
              I want to hear the meeting in
            </label>
            <select
              className="input-base"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-accent/6 border border-accent/15 rounded-xl p-3 flex items-start gap-2">
            <Globe size={13} className="text-accent mt-0.5 flex-shrink-0" />
            <span className="text-xs text-muted-foreground leading-relaxed">
              AI translation active — everyone hears you in their own language in real time. Up to 40+ participants.
            </span>
          </div>

          <Button
            size="lg"
            className="w-full"
            disabled={!name.trim()}
            onClick={() => {
              if (!name.trim()) {
                toast.error("Please enter your name");
                return;
              }
              // Stop preview stream before entering call
              if (stream) stream.getTracks().forEach((t) => t.stop());
              onJoin(name, lang);
            }}
          >
            <Video size={16} /> Join meeting
          </Button>

          <p className="text-center text-[11px] text-muted-foreground">
            By joining you agree to our{" "}
            <span className="text-accent cursor-pointer hover:underline">
              Terms
            </span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main meeting room ────────────────────────────────────────────────────────
function MeetingRoom({
  code,
  displayName,
}: {
  code: string;
  displayName: string;
}) {
  const router = useRouter();
  const {
    micEnabled, cameraEnabled, toggleMic, toggleCamera,
    isHandRaised, setHandRaised,
    isScreenSharing, setScreenSharing,
    isRecording, setRecording,
    speakLanguage, hearLanguage, setSpeakLanguage, setHearLanguage,
    aiDubbingEnabled, setAiDubbingEnabled,
    captionsEnabled, setCaptionsEnabled,
    showOriginal, setShowOriginal,
    autoDetect, setAutoDetect,
    noiseCancellation, setNoiseCancellation,
    translationEngine, setTranslationEngine,
    videoQuality, setVideoQuality,
    virtualBackground, setVirtualBackground,
    cameraFilter, setCameraFilter,
    skinTouchup, setSkinTouchup,
    autoLighting, setAutoLighting,
    hdRecording, setHdRecording,
    rightPanelTab, setRightPanelTab,
    chatMessages, addChatMessage, clearChat,
    user,
  } = useAppStore();

  // ── refs & state
  const localVideoRef   = useRef<HTMLVideoElement>(null);
  const screenVideoRef  = useRef<HTMLVideoElement>(null);
  const localStreamRef  = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const chatEndRef      = useRef<HTMLDivElement>(null);

  const [camErr,     setCamErr]     = useState("");
  const [micErr,     setMicErr]     = useState("");
  const [camReady,   setCamReady]   = useState(false);
  const [panelOpen,  setPanelOpen]  = useState(true);
  const [moreOpen,   setMoreOpen]   = useState(false);
  const [chatInput,  setChatInput]  = useState("");
  const [elapsed,    setElapsed]    = useState(0);
  const [capIdx,     setCapIdx]     = useState(0);
  const [spkIdx,     setSpkIdx]     = useState(0);
  const [handTimer,  setHandTimer]  = useState<NodeJS.Timeout | null>(null);

  // ── Start/restart local stream
  const startLocalStream = useCallback(async () => {
    // Stop existing
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    const constraints: MediaStreamConstraints = {
      video: cameraEnabled
        ? {
            width:  { ideal: videoQuality === "4K" ? 3840 : videoQuality === "1080p" ? 1920 : 1280 },
            height: { ideal: videoQuality === "4K" ? 2160 : videoQuality === "1080p" ? 1080 : 720 },
            frameRate: { ideal: 30 },
            facingMode: "user",
          }
        : false,
      audio: micEnabled
        ? {
            echoCancellation: true,
            noiseSuppression: noiseCancellation,
            autoGainControl:  true,
            sampleRate:       48000,
          }
        : false,
    };

    // Need at least one track
    if (!cameraEnabled && !micEnabled) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current && cameraEnabled) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
      }

      setCamErr("");
      setMicErr("");
      setCamReady(true);
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setCamErr("Permission denied — please allow camera/microphone access in your browser settings.");
      } else if (err.name === "NotFoundError") {
        setCamErr("No camera found on this device.");
      } else if (err.name === "NotReadableError") {
        setCamErr("Camera is in use by another application.");
      } else {
        setCamErr(`Could not access camera: ${err.message}`);
      }
      setCamReady(false);
    }
  }, [cameraEnabled, micEnabled, noiseCancellation, videoQuality]);

  // Initial stream start
  useEffect(() => {
    startLocalStream();
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to mic/cam toggle — mute/unmute tracks without restarting
  useEffect(() => {
    if (!localStreamRef.current) {
      if (cameraEnabled || micEnabled) startLocalStream();
      return;
    }
    localStreamRef.current.getVideoTracks().forEach((t) => {
      t.enabled = cameraEnabled;
    });
    localStreamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = micEnabled;
    });
  }, [cameraEnabled, micEnabled, startLocalStream]);

  // Apply CSS filter to local video
  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.style.filter = FILTER_CSS[cameraFilter] ?? "none";
    }
  }, [cameraFilter]);

  // Meeting timer
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Rotate captions
  useEffect(() => {
    const t = setInterval(() => {
      setCapIdx((i) => (i + 1) % CAPTIONS.length);
      setSpkIdx((i) => (i + 1) % 5);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const ss = (s % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
  };

  // ── Screen share
  const handleScreenShare = async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setScreenSharing(false);
      toast("Screen share stopped");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as any,
        audio: true,
      });
      screenStreamRef.current = stream;
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
      }
      stream.getVideoTracks()[0].onended = () => {
        setScreenSharing(false);
        screenStreamRef.current = null;
      };
      setScreenSharing(true);
      toast.success("Screen sharing started");
    } catch (err: any) {
      if (err.name !== "NotAllowedError") {
        toast.error("Could not start screen share");
      }
    }
  };

  // ── Chat
  const sendChat = () => {
    const val = chatInput.trim();
    if (!val) return;
    addChatMessage({
      id: Date.now().toString(),
      sender_id: user?.id ?? "me",
      sender_name: displayName,
      text: val,
      original_language: speakLanguage,
      timestamp: new Date(),
    });
    setChatInput("");
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  // ── Invite link
  const copyInvite = () => {
    const url = `${window.location.origin}/join/${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Invite link copied!");
  };

  // ── Leave
  const leave = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    clearChat();
    router.push("/dashboard");
    toast("Left meeting", { icon: "👋" });
  };

  const cap = CAPTIONS[capIdx];

  // Simulated remote participants (40 supported by design)
  const REMOTE = [
    { id: "1", name: "Maria R.",    lang: "es", color: "from-green-500 to-emerald-500",  muted: true,  spk: spkIdx === 1 },
    { id: "2", name: "Kenji T.",    lang: "ja", color: "from-amber-500 to-orange-500",   muted: false, spk: spkIdx === 2 },
    { id: "3", name: "Fatima L.",   lang: "ar", color: "from-red-500 to-pink-500",        muted: true,  spk: spkIdx === 3 },
  ];

  const allParticipants = REMOTE.length + 1; // +1 for self

  return (
    <div className="flex h-screen bg-background overflow-hidden flex-col">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-card border-b border-border flex-shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg accent-gradient flex items-center justify-center text-white font-black text-[11px] flex-shrink-0">
            AZ
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-foreground leading-none truncate">
              A-Z Meeting
            </div>
            <button
              onClick={copyInvite}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-accent transition-colors mt-0.5"
            >
              {code} <Copy size={9} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            {fmt(elapsed)}
          </div>
          {isRecording && (
            <Badge variant="red" className="gap-1 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              REC
            </Badge>
          )}
          <Badge variant="accent" className="hidden sm:flex text-[10px]">
            🌐 {allParticipants} live
          </Badge>
          {camErr && (
            <div className="flex items-center gap-1 text-[10px] text-amber-500">
              <AlertCircle size={12} /> Cam issue
            </div>
          )}
          <button
            onClick={() => setPanelOpen((v) => !v)}
            className="w-8 h-8 hidden md:flex items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight
              size={15}
              className={cn("transition-transform", !panelOpen && "rotate-180")}
            />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Video grid */}
        <div className="flex-1 flex flex-col gap-2 p-2 sm:p-3 min-w-0 overflow-hidden">
          <div
            className={cn(
              "grid gap-2 flex-1 min-h-0",
              allParticipants <= 1 ? "grid-cols-1" :
              allParticipants <= 2 ? "grid-cols-1 md:grid-cols-2" :
              allParticipants <= 4 ? "grid-cols-2" :
              allParticipants <= 9 ? "grid-cols-3" :
              "grid-cols-4"
            )}
          >
            {/* ── Self tile ── */}
            <div
              className={cn(
                "relative rounded-xl border-2 bg-black overflow-hidden flex items-center justify-center transition-all duration-300",
                spkIdx === 0 ? "border-green-500" : "border-border"
              )}
            >
              {/* BG overlay */}
              {virtualBackground !== "none" && (
                <div
                  className={cn(
                    "absolute inset-0 z-0 opacity-60",
                    BG_OPTIONS.find((b) => b.id === virtualBackground)?.style ?? ""
                  )}
                />
              )}

              {cameraEnabled && !camErr ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover z-10 relative"
                  style={{ transform: "scaleX(-1)" }}
                />
              ) : (
                <div className="flex flex-col items-center gap-2 z-10 relative">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                    {displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  {camErr && (
                    <div className="text-[10px] text-amber-400 text-center px-2 max-w-[160px]">
                      {camErr}
                    </div>
                  )}
                </div>
              )}

              {/* Screen share PiP */}
              {isScreenSharing && (
                <video
                  ref={screenVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute bottom-2 right-2 w-28 h-16 rounded-lg border-2 border-accent object-contain bg-black z-20"
                />
              )}

              {/* Translation bubble */}
              <AnimatePresence>
                {spkIdx === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute top-2 left-2 right-2 bg-black/70 backdrop-blur-sm border border-accent/30 rounded-lg px-2.5 py-1.5 text-[10px] text-purple-200 leading-snug z-20"
                  >
                    🌐 &quot;{cap.text}&quot;
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Mic indicator */}
              <div className="absolute top-2 right-2 z-20">
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center",
                  !micEnabled ? "bg-red-500" : "bg-black/50 border border-white/20"
                )}>
                  {!micEnabled
                    ? <MicOff size={11} className="text-white" />
                    : <Mic size={11} className="text-white" />}
                </div>
              </div>

              {/* Name bar */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 z-20 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-white truncate">
                  {displayName} (You)
                </span>
                <span className="text-[9px] font-bold bg-accent/60 text-white px-1.5 py-0.5 rounded flex-shrink-0">
                  {flagForCode(speakLanguage)} {speakLanguage.toUpperCase()}
                </span>
              </div>
            </div>

            {/* ── Remote tiles ── */}
            {REMOTE.map((p, i) => (
              <div
                key={p.id}
                className={cn(
                  "relative rounded-xl border-2 bg-muted overflow-hidden flex items-center justify-center transition-all duration-300",
                  p.spk ? "border-green-500" : "border-border"
                )}
              >
                <div className={cn(
                  "w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-xl",
                  p.color
                )}>
                  {p.name.split(" ").map((n) => n[0]).join("")}
                </div>

                <AnimatePresence>
                  {p.spk && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute top-2 left-2 right-2 bg-black/70 backdrop-blur-sm border border-accent/30 rounded-lg px-2.5 py-1.5 text-[10px] text-purple-200 leading-snug z-20"
                    >
                      🌐 &quot;{cap.text}&quot;
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="absolute top-2 right-2 z-20">
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center",
                    p.muted ? "bg-red-500" : "bg-black/50 border border-white/20"
                  )}>
                    {p.muted
                      ? <MicOff size={11} className="text-white" />
                      : <Mic size={11} className="text-white" />}
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 z-20 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-white truncate">{p.name}</span>
                  <span className="text-[9px] font-bold bg-accent/60 text-white px-1.5 py-0.5 rounded flex-shrink-0">
                    {flagForCode(p.lang)} {p.lang.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Captions bar */}
          {captionsEnabled && (
            <motion.div
              key={capIdx}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-xl px-4 py-2.5 flex-shrink-0"
            >
              <div className="flex items-start gap-3">
                <span className="text-[10px] font-bold bg-accent/10 text-accent px-2 py-0.5 rounded-full border border-accent/20 mt-0.5 flex-shrink-0">
                  🌐 LIVE
                </span>
                <div>
                  <p className="text-sm text-foreground leading-relaxed">
                    <span className="font-semibold text-accent">{cap.speaker}: </span>
                    {cap.text}
                  </p>
                  {showOriginal && (
                    <p className="text-xs text-muted-foreground mt-0.5">{cap.orig}</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* ── Right panel ── */}
        <AnimatePresence>
          {panelOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 272, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="bg-card border-l border-border flex flex-col overflow-hidden flex-shrink-0 hidden md:flex"
            >
              <div className="flex border-b border-border flex-shrink-0">
                {(["translate", "video", "chat", "people"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setRightPanelTab(t)}
                    className={cn(
                      "flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2 capitalize",
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

                {/* Translate */}
                {rightPanelTab === "translate" && (
                  <>
                    <div className="flex items-center gap-2 bg-accent/6 border border-accent/15 rounded-lg px-3 py-2">
                      <Globe size={13} className="text-accent flex-shrink-0" />
                      <span className="text-xs font-semibold text-accent">AI translation active · {allParticipants} langs</span>
                    </div>
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
                    <div className="space-y-0.5">
                      <SwitchRow label="AI voice dubbing" checked={aiDubbingEnabled} onCheckedChange={setAiDubbingEnabled} />
                      <SwitchRow label="Live captions" checked={captionsEnabled} onCheckedChange={setCaptionsEnabled} />
                      <SwitchRow label="Show original text" checked={showOriginal} onCheckedChange={setShowOriginal} />
                      <SwitchRow label="Auto-detect language" checked={autoDetect} onCheckedChange={setAutoDetect} />
                      <SwitchRow label="Noise cancellation" checked={noiseCancellation} onCheckedChange={(v) => { setNoiseCancellation(v); startLocalStream(); }} />
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

                {/* Video */}
                {rightPanelTab === "video" && (
                  <>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Quality</label>
                      <div className="flex gap-1.5 flex-wrap">
                        {["Auto", "720p", "1080p", "4K"].map((q) => (
                          <button key={q} onClick={() => { setVideoQuality(q); startLocalStream(); }}
                            className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                              videoQuality === q ? "bg-accent/10 border-accent/30 text-accent" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}>{q}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Virtual background</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {BG_OPTIONS.map((bg) => (
                          <button key={bg.id} onClick={() => setVirtualBackground(bg.id)}
                            className={cn("h-12 rounded-lg text-xs font-semibold text-white flex items-center justify-center border-2 transition-all",
                              virtualBackground === bg.id ? "border-accent scale-105" : "border-transparent",
                              bg.id === "none" ? "bg-muted text-muted-foreground" : bg.style
                            )}>{bg.label}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Camera filter</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {FILTER_OPTIONS.map((f) => (
                          <button key={f.id} onClick={() => setCameraFilter(f.id)}
                            className={cn("py-2 rounded-lg text-xs font-medium border transition-all",
                              cameraFilter === f.id ? "bg-accent/10 border-accent/30 text-accent" : "border-border text-muted-foreground hover:bg-muted"
                            )}>{f.label}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <SwitchRow label="AI skin touch-up" checked={skinTouchup} onCheckedChange={setSkinTouchup} />
                      <SwitchRow label="Auto lighting" checked={autoLighting} onCheckedChange={setAutoLighting} />
                      <SwitchRow label="HD recording" checked={hdRecording} onCheckedChange={setHdRecording} />
                    </div>
                    {camErr && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-xs font-semibold text-amber-500 mb-1">Camera issue</div>
                            <div className="text-xs text-muted-foreground">{camErr}</div>
                            <button
                              onClick={startLocalStream}
                              className="text-xs text-accent mt-2 hover:underline"
                            >
                              Retry camera
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Chat */}
                {rightPanelTab === "chat" && (
                  <div className="flex flex-col gap-3" style={{ height: "calc(100vh - 240px)" }}>
                    <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                      {chatMessages.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-6">
                          No messages yet. All messages are auto-translated.
                        </p>
                      )}
                      {chatMessages.map((msg) => (
                        <div key={msg.id} className="bg-muted rounded-xl p-3 border border-border">
                          <div className={cn("text-[10px] font-bold mb-1",
                            msg.sender_id === user?.id ? "text-green-500" : "text-accent"
                          )}>
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
                      <button
                        onClick={sendChat}
                        className="accent-gradient text-white px-3 py-2 rounded-xl text-xs font-bold hover:opacity-90"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                )}

                {/* People */}
                {rightPanelTab === "people" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-muted rounded-xl p-3 text-center border border-border">
                        <div className="text-lg font-black text-foreground">{allParticipants}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Participants</div>
                        <div className="text-[9px] text-muted-foreground">max 40+ supported</div>
                      </div>
                      <div className="bg-muted rounded-xl p-3 text-center border border-border">
                        <div className="text-lg font-black text-foreground">{allParticipants}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Languages</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">In meeting</div>
                      {/* Self */}
                      <div className={cn("flex items-center gap-2.5 bg-muted rounded-xl px-3 py-2.5 border", spkIdx === 0 ? "border-green-500/40" : "border-border")}>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0,2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-foreground truncate">{displayName} (You)</div>
                        </div>
                        <span className="text-[9px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                          {speakLanguage.toUpperCase()}
                        </span>
                      </div>
                      {REMOTE.map((p) => (
                        <div key={p.id} className={cn("flex items-center gap-2.5 bg-muted rounded-xl px-3 py-2.5 border", p.spk ? "border-green-500/40" : "border-border")}>
                          <div className={cn("w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold", p.color)}>
                            {p.name.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-foreground truncate">{p.name}</div>
                          </div>
                          <span className="text-[9px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                            {p.lang.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-accent/5 border border-accent/15 rounded-xl p-3 space-y-1.5">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">AI Stats</div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Translation latency</span>
                        <span className="font-semibold text-green-500">~98ms</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Accuracy</span>
                        <span className="font-semibold text-foreground">97%</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Words translated</span>
                        <span className="font-semibold text-foreground">{(elapsed * 2).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Max capacity</span>
                        <span className="font-semibold text-foreground">40+ people</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="w-full gap-2" onClick={copyInvite}>
                      <Share2 size={13} /> Copy invite link
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Control bar ── */}
      <div className="bg-card border-t border-border px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <CtrlBtn active={!micEnabled} onClick={toggleMic} activeColor="red" label="Mic" title={micEnabled ? "Mute" : "Unmute"}>
            {micEnabled ? <Mic size={18} /> : <MicOff size={18} />}
          </CtrlBtn>
          <CtrlBtn active={!cameraEnabled} onClick={toggleCamera} activeColor="red" label="Camera" title={cameraEnabled ? "Stop video" : "Start video"}>
            {cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
          </CtrlBtn>
          <CtrlBtn active={isScreenSharing} onClick={handleScreenShare} activeColor="accent" label="Share">
            {isScreenSharing ? <MonitorOff size={18} /> : <Monitor size={18} />}
          </CtrlBtn>
          <CtrlBtn active={false} onClick={() => { setRightPanelTab("translate"); setPanelOpen(true); }} label="Translate">
            <Globe size={18} className="text-accent" />
          </CtrlBtn>
        </div>

        <div className="text-center flex-1 hidden md:block">
          <div className="text-xs font-semibold text-foreground">a-zmeet.io / {code}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{fmt(elapsed)} · {allParticipants} participants</div>
        </div>

        <div className="flex items-center gap-2">
          <CtrlBtn
            active={isHandRaised}
            onClick={() => {
              if (!isHandRaised) toast.success("✋ Hand raised — others can see it");
              setHandRaised(!isHandRaised);
              if (handTimer) clearTimeout(handTimer);
              if (!isHandRaised) {
                setHandTimer(setTimeout(() => setHandRaised(false), 30000));
              }
            }}
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
                  className="absolute bottom-14 right-0 bg-card border border-border rounded-xl shadow-xl py-1.5 w-52 z-50"
                >
                  {[
                    { label: isRecording ? "⏹ Stop recording" : "⏺ Start recording", action: () => { setRecording(!isRecording); toast.success(isRecording ? "Recording stopped" : "Recording started"); setMoreOpen(false); } },
                    { label: "📋 Copy invite link", action: () => { copyInvite(); setMoreOpen(false); } },
                    { label: "⚙️ Video settings", action: () => { setRightPanelTab("video"); setPanelOpen(true); setMoreOpen(false); } },
                    { label: "🐛 Report a problem", action: () => { toast("Thanks — we'll look into it"); setMoreOpen(false); } },
                    { label: "📊 Debug info", action: () => {
                      const tracks = localStreamRef.current?.getTracks() ?? [];
                      toast(`Tracks: ${tracks.map(t => `${t.kind}:${t.readyState}`).join(", ") || "none"}`);
                      setMoreOpen(false);
                    }},
                  ].map(({ label, action }) => (
                    <button key={label} onClick={action} className="w-full text-left px-4 py-2.5 text-xs text-foreground hover:bg-muted transition-colors">
                      {label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button onClick={leave} className="flex flex-col items-center gap-1 cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 flex items-center justify-center transition-all">
              <PhoneOff size={20} className="text-white" />
            </div>
            <span className="text-[9px] text-red-500 font-medium">Leave</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Control button ───────────────────────────────────────────────────────────
function CtrlBtn({
  children, onClick, active, activeColor, label, title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  activeColor?: "red" | "accent" | "amber";
  label: string;
  title?: string;
}) {
  const colors = {
    red:   "bg-red-500/10 border-red-500/30 text-red-500",
    accent:"bg-accent/10 border-accent/30 text-accent",
    amber: "bg-amber-500/10 border-amber-500/30 text-amber-500",
  };
  return (
    <button onClick={onClick} title={title} className="flex flex-col items-center gap-1 cursor-pointer group">
      <div className={cn(
        "w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-150 active:scale-95",
        active && activeColor
          ? colors[activeColor]
          : "bg-muted border-border text-muted-foreground group-hover:text-foreground group-hover:border-accent/40 group-hover:bg-muted/80"
      )}>
        {children}
      </div>
      <span className={cn("text-[9px] font-medium",
        active && activeColor === "red" ? "text-red-500" : "text-muted-foreground"
      )}>
        {label}
      </span>
    </button>
  );
}

// ─── Entry point ──────────────────────────────────────────────────────────────
function MeetingPageInner() {
  const params = useSearchParams();
  const rawCode = params.get("code");
  const nameParam = params.get("name");
  const langParam = params.get("lang");

  const user = useAppStore((s) => s.user);
  const { setHearLanguage } = useAppStore();

  // If no code in URL, generate one (instant meeting)
  const code = (rawCode ?? generateMeetingCode()).toUpperCase();

  // Show lobby unless name already provided (e.g. coming from join page)
  const [phase, setPhase]     = useState<"lobby" | "meeting">(nameParam ? "meeting" : "lobby");
  const [displayName, setDisplayName] = useState(
    nameParam ?? user?.full_name ?? ""
  );

  useEffect(() => {
    if (langParam) setHearLanguage(langParam);
  }, [langParam, setHearLanguage]);

  if (phase === "lobby") {
    return (
      <LobbyScreen
        code={code}
        onJoin={(name, lang) => {
          setDisplayName(name);
          setHearLanguage(lang);
          setPhase("meeting");
        }}
      />
    );
  }

  return <MeetingRoom code={code} displayName={displayName} />;
}

export default function MeetingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-accent" />
        </div>
      }
    >
      <MeetingPageInner />
    </Suspense>
  );
}
