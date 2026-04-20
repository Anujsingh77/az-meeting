"use client";

import {
  useState, useEffect, useRef, useCallback, Suspense, useMemo
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  Globe, Hand, MoreHorizontal, X, MessageSquare,
  Users, Copy, PhoneOff, ChevronRight, AlertCircle,
  Loader2, Share2, Camera, Wifi, WifiOff, CheckCircle,
} from "lucide-react";
import { useAppStore } from "@/store/app";
import { Button, Badge, SwitchRow } from "@/components/ui";
import { cn, flagForCode, generateMeetingCode } from "@/lib/utils";
import { LANGUAGES } from "@/types";
import { RoomSession, RemotePeer } from "@/lib/webrtc";
import toast from "react-hot-toast";
import { nanoid } from "nanoid";

// ─── Constants ────────────────────────────────────────────────────────────────
const FILTER_CSS: Record<string, string> = {
  none:  "none",
  warm:  "sepia(0.4) saturate(1.4) hue-rotate(-10deg)",
  cool:  "saturate(0.7) hue-rotate(25deg) brightness(1.1)",
  vivid: "saturate(1.9) contrast(1.12)",
  soft:  "blur(0.4px) brightness(1.05) saturate(0.9)",
  mono:  "grayscale(1)",
};

const BG_OPTIONS = [
  { id: "none",   label: "None",   cls: "" },
  { id: "blur",   label: "Blur",   cls: "bg-gradient-to-br from-slate-700 to-slate-900" },
  { id: "office", label: "Office", cls: "bg-gradient-to-br from-purple-900 to-violet-700" },
  { id: "cafe",   label: "Cafe",   cls: "bg-gradient-to-br from-amber-900 to-orange-600" },
  { id: "beach",  label: "Beach",  cls: "bg-gradient-to-br from-blue-800 to-cyan-400" },
  { id: "space",  label: "Space",  cls: "bg-gradient-to-br from-gray-900 to-violet-900" },
];

const FILTER_OPTIONS = [
  { id: "none",  label: "None" },
  { id: "warm",  label: "🌅 Warm" },
  { id: "cool",  label: "❄️ Cool" },
  { id: "vivid", label: "🎨 Vivid" },
  { id: "soft",  label: "🌸 Soft" },
  { id: "mono",  label: "⬛ Mono" },
];

// ─── Avatar initials helper ───────────────────────────────────────────────────
function initials(name: string) {
  return name.split(" ").map((n) => n[0] ?? "").join("").toUpperCase().slice(0, 2) || "?";
}

const COLORS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-500",
  "from-green-500 to-emerald-500",
  "from-orange-500 to-amber-500",
  "from-red-500 to-pink-500",
  "from-indigo-500 to-blue-500",
  "from-teal-500 to-green-500",
];
function peerColor(peerId: string) {
  let h = 0;
  for (let i = 0; i < peerId.length; i++) h = peerId.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOBBY SCREEN — camera preview before joining
// ═══════════════════════════════════════════════════════════════════════════════
function LobbyScreen({
  code, onJoin,
}: {
  code: string;
  onJoin: (opts: { name: string; lang: string; stream: MediaStream | null; micOn: boolean; camOn: boolean }) => void;
}) {
  const user = useAppStore((s) => s.user);
  const [name, setName]     = useState(user?.full_name ?? "");
  const [lang, setLang]     = useState(user?.preferred_language ?? "en");
  const [camOn, setCamOn]   = useState(true);
  const [micOn, setMicOn]   = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [camErr, setCamErr] = useState("");
  const [joining, setJoining] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startPreview = useCallback(async () => {
    if (stream) { stream.getTracks().forEach((t) => t.stop()); setStream(null); }
    if (!camOn && !micOn) return;
    try {
      const ms = await navigator.mediaDevices.getUserMedia({
        video: camOn ? { width: 640, height: 480, facingMode: "user" } : false,
        audio: micOn ? { echoCancellation: true, noiseSuppression: true } : false,
      });
      setStream(ms);
      setCamErr("");
      if (videoRef.current) videoRef.current.srcObject = ms;
    } catch (e: any) {
      setCamErr(
        e.name === "NotAllowedError"
          ? "Permission denied — click the camera icon in your browser address bar to allow access."
          : e.name === "NotFoundError"
          ? "No camera/microphone found. Connect a device and try again."
          : `Device error: ${e.message}`
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camOn, micOn]);

  useEffect(() => { startPreview(); return () => stream?.getTracks().forEach((t) => t.stop()); }, [camOn, micOn]); // eslint-disable-line

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
    toast.success("Invite link copied! Send it to your friend.");
  };

  const handleJoin = () => {
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    setJoining(true);
    // Don't stop preview stream — hand it directly to meeting room
    onJoin({ name: name.trim(), lang, stream, micOn, camOn });
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
        className="w-full max-w-[840px] grid md:grid-cols-2 gap-5 z-10 relative"
      >
        {/* Camera preview card */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="relative bg-black" style={{ aspectRatio: "16/9" }}>
            {camOn && !camErr ? (
              <video
                ref={videoRef}
                autoPlay muted playsInline
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/40">
                <Camera size={44} />
                <span className="text-xs text-center px-6 text-white/50">
                  {camErr || "Camera is off"}
                </span>
                {camErr && (
                  <button onClick={startPreview} className="text-xs text-accent underline mt-1">
                    Try again
                  </button>
                )}
              </div>
            )}
            {/* Controls overlay */}
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
              <button
                onClick={() => setMicOn((v) => !v)}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all shadow-lg",
                  micOn ? "bg-white/10 border-white/30 text-white" : "bg-red-500 border-red-500 text-white"
                )}
              >
                {micOn ? <Mic size={16} /> : <MicOff size={16} />}
              </button>
              <button
                onClick={() => setCamOn((v) => !v)}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all shadow-lg",
                  camOn ? "bg-white/10 border-white/30 text-white" : "bg-red-500 border-red-500 text-white"
                )}
              >
                {camOn ? <Video size={16} /> : <VideoOff size={16} />}
              </button>
            </div>
          </div>
          <div className="p-4 space-y-2 text-center">
            <p className="text-xs text-muted-foreground">Your preview — only you see this</p>
            <button onClick={copyLink} className="flex items-center justify-center gap-2 text-xs text-accent hover:underline w-full">
              <Share2 size={12} /> Copy invite link to share with friends
            </button>
          </div>
        </div>

        {/* Join form */}
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center text-white font-black text-sm flex-shrink-0">AZ</div>
            <div>
              <div className="font-black text-base text-foreground">Ready to join?</div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <span className="font-mono font-bold text-foreground">{code}</span>
                <button onClick={copyLink} className="hover:text-accent transition-colors"><Copy size={11} /></button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Your name</label>
            <input
              className="input-base"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              autoFocus
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Hear the meeting in</label>
            <select className="input-base" value={lang} onChange={(e) => setLang(e.target.value)}>
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
            </select>
          </div>

          <div className="bg-green-500/8 border border-green-500/20 rounded-xl p-3 flex items-start gap-2">
            <CheckCircle size={13} className="text-green-500 mt-0.5 flex-shrink-0" />
            <span className="text-xs text-muted-foreground leading-relaxed">
              Real peer-to-peer video — your friend joins using the invite link and you&apos;ll see each other live. No demo. No delay.
            </span>
          </div>

          <Button
            size="lg"
            className="w-full mt-auto"
            disabled={!name.trim() || joining}
            onClick={handleJoin}
          >
            {joining ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
            {joining ? "Connecting…" : "Join meeting"}
          </Button>

          <p className="text-center text-[11px] text-muted-foreground">
            Share the invite link so your friend can join
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO TILE — renders one participant's video or avatar
// ═══════════════════════════════════════════════════════════════════════════════
function VideoTile({
  name, peerId, stream, micOn, camOn, isSelf, language,
  handRaised, isSpeaking, bgFilter, filter,
  localVideoRef,
}: {
  name: string; peerId: string; stream?: MediaStream | null;
  micOn: boolean; camOn: boolean; isSelf?: boolean;
  language: string; handRaised?: boolean; isSpeaking?: boolean;
  bgFilter?: string; filter?: string;
  localVideoRef?: React.RefObject<HTMLVideoElement>;
}) {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Attach remote stream to video element
  useEffect(() => {
    if (!isSelf && remoteVideoRef.current && stream) {
      remoteVideoRef.current.srcObject = stream;
    }
  }, [stream, isSelf]);

  const videoRef = isSelf ? localVideoRef : remoteVideoRef;
  const hasVideo = isSelf ? camOn : (camOn && !!stream);

  return (
    <div className={cn(
      "relative rounded-xl border-2 bg-black overflow-hidden flex items-center justify-center transition-all duration-300 min-h-[120px]",
      isSpeaking ? "border-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.15)]" : "border-border"
    )}>
      {/* Background overlay for virtual bg */}
      {isSelf && bgFilter && bgFilter !== "none" && (
        <div className={cn("absolute inset-0 z-0 opacity-50",
          BG_OPTIONS.find((b) => b.id === bgFilter)?.cls ?? ""
        )} />
      )}

      {/* Video or avatar */}
      {hasVideo ? (
        <video
          ref={videoRef as React.RefObject<HTMLVideoElement>}
          autoPlay muted={isSelf} playsInline
          className="w-full h-full object-cover z-10 relative"
          style={{
            transform: isSelf ? "scaleX(-1)" : "none",
            filter: isSelf ? (FILTER_CSS[filter ?? "none"] ?? "none") : "none",
          }}
        />
      ) : (
        <div className="flex flex-col items-center gap-2 z-10 relative">
          <div className={cn(
            "w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-xl",
            peerColor(peerId)
          )}>
            {initials(name)}
          </div>
          {!camOn && <span className="text-[10px] text-white/40">Camera off</span>}
        </div>
      )}

      {/* Hand raised badge */}
      {handRaised && (
        <div className="absolute top-2 left-2 z-30 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
          ✋ Hand raised
        </div>
      )}

      {/* Mic indicator */}
      <div className="absolute top-2 right-2 z-20">
        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center",
          !micOn ? "bg-red-500" : "bg-black/50 border border-white/20"
        )}>
          {!micOn ? <MicOff size={11} className="text-white" /> : <Mic size={11} className="text-white" />}
        </div>
      </div>

      {/* Name bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent px-3 py-2 z-20 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-white truncate">
          {name}{isSelf ? " (You)" : ""}
        </span>
        <span className="text-[9px] font-bold bg-accent/60 text-white px-1.5 py-0.5 rounded flex-shrink-0 ml-1">
          {flagForCode(language)} {language.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTROL BUTTON
// ═══════════════════════════════════════════════════════════════════════════════
function CtrlBtn({
  children, onClick, active, activeColor = "red", label, title,
}: {
  children: React.ReactNode; onClick: () => void;
  active: boolean; activeColor?: "red" | "accent" | "amber";
  label: string; title?: string;
}) {
  const activeClasses = {
    red:   "bg-red-500/10 border-red-500/30 text-red-500",
    accent:"bg-accent/10 border-accent/30 text-accent",
    amber: "bg-amber-500/10 border-amber-500/30 text-amber-500",
  };
  return (
    <button onClick={onClick} title={title} className="flex flex-col items-center gap-1 cursor-pointer group">
      <div className={cn(
        "w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-150 active:scale-95",
        active ? activeClasses[activeColor] : "bg-muted border-border text-muted-foreground group-hover:text-foreground group-hover:border-accent/40"
      )}>
        {children}
      </div>
      <span className={cn("text-[9px] font-medium",
        active && activeColor === "red" ? "text-red-500" : "text-muted-foreground"
      )}>{label}</span>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEETING ROOM — the live call
// ═══════════════════════════════════════════════════════════════════════════════
function MeetingRoom({
  code, myName, myLang,
  initialStream, initialMic, initialCam,
}: {
  code: string; myName: string; myLang: string;
  initialStream: MediaStream | null;
  initialMic: boolean; initialCam: boolean;
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

  // ── State ──────────────────────────────────────────────────────────────────
  const peerId = useMemo(() => user?.id ?? nanoid(), [user?.id]);
  const [peers, setPeers]             = useState<Map<string, RemotePeer>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream | null>(initialStream);
  const [camErr, setCamErr]           = useState("");
  const [connected, setConnected]     = useState(false);
  const [panelOpen, setPanelOpen]     = useState(true);
  const [moreOpen, setMoreOpen]       = useState(false);
  const [chatInput, setChatInput]     = useState("");
  const [elapsed, setElapsed]         = useState(0);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const sessionRef     = useRef<RoomSession | null>(null);
  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef     = useRef<HTMLDivElement>(null);

  // Sync initial mic/cam state
  useEffect(() => {
    if (!initialMic)  useAppStore.getState().setMicEnabled(false);
    if (!initialCam)  useAppStore.getState().setCameraEnabled(false);
  }, []); // eslint-disable-line

  // ── Attach local stream to video element ──────────────────────────────────
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // ── Apply camera filter ───────────────────────────────────────────────────
  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.style.filter = FILTER_CSS[cameraFilter] ?? "none";
    }
  }, [cameraFilter]);

  // ── Join the Supabase Realtime room ───────────────────────────────────────
  useEffect(() => {
    const session = new RoomSession({
      peerId,
      name: myName,
      language: myLang,
      roomCode: code,
      onPeersUpdate: (updated) => {
        setPeers(new Map(updated));
        setConnected(true);
      },
      onChat: (msg) => {
        addChatMessage({
          id: nanoid(),
          sender_id: msg.peerId,
          sender_name: msg.name,
          text: msg.text,
          original_language: msg.lang,
          timestamp: new Date(),
        });
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      },
    });

    sessionRef.current = session;

    const stream = localStream ?? new MediaStream();
    session.join(stream).then(() => {
      setConnected(true);
      toast.success("Joined meeting — share the code with your friend!", { duration: 4000 });
    });

    return () => { session.leave(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Meeting timer
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (s: number) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  // ── Mic / camera toggle ───────────────────────────────────────────────────
  const handleToggleMic = useCallback(() => {
    toggleMic();
    const newMic = !micEnabled;
    localStream?.getAudioTracks().forEach((t) => { t.enabled = newMic; });
    sessionRef.current?.sendMuteState(newMic, cameraEnabled);
  }, [micEnabled, cameraEnabled, localStream, toggleMic]);

  const handleToggleCam = useCallback(async () => {
    const newCam = !cameraEnabled;
    toggleCamera();

    if (newCam) {
      // Re-acquire camera
      try {
        const ms = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        const videoTrack = ms.getVideoTracks()[0];
        if (videoTrack && localStream) {
          // Replace video track in existing stream
          const old = localStream.getVideoTracks();
          old.forEach((t) => localStream.removeTrack(t));
          localStream.addTrack(videoTrack);
          sessionRef.current?.updateLocalStream(localStream);
          if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
          setCamErr("");
        }
      } catch (e: any) {
        setCamErr(e.name === "NotAllowedError" ? "Camera permission denied" : "Could not start camera");
        toggleCamera(); // revert
        return;
      }
    } else {
      localStream?.getVideoTracks().forEach((t) => { t.enabled = false; });
    }
    sessionRef.current?.sendMuteState(micEnabled, newCam);
  }, [cameraEnabled, micEnabled, localStream, toggleCamera]);

  // ── Screen share ──────────────────────────────────────────────────────────
  const handleScreenShare = async () => {
    if (isScreenSharing) {
      screenStream?.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
      setScreenSharing(false);
      toast("Screen share stopped");
      return;
    }
    try {
      const ms = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" } as any, audio: true });
      setScreenStream(ms);
      if (screenVideoRef.current) screenVideoRef.current.srcObject = ms;
      ms.getVideoTracks()[0].onended = () => { setScreenSharing(false); setScreenStream(null); };
      setScreenSharing(true);
      toast.success("Screen sharing started");
    } catch (e: any) {
      if (e.name !== "NotAllowedError") toast.error("Could not share screen");
    }
  };

  // ── Hand raise ────────────────────────────────────────────────────────────
  const handleHand = () => {
    const next = !isHandRaised;
    setHandRaised(next);
    sessionRef.current?.sendHandRaise(next);
    if (next) {
      toast.success("✋ Hand raised — everyone can see it");
      setTimeout(() => { setHandRaised(false); sessionRef.current?.sendHandRaise(false); }, 30000);
    }
  };

  // ── Chat ──────────────────────────────────────────────────────────────────
  const sendChat = () => {
    const val = chatInput.trim();
    if (!val) return;
    addChatMessage({ id: nanoid(), sender_id: peerId, sender_name: myName, text: val, original_language: myLang, timestamp: new Date() });
    sessionRef.current?.sendChat(val, myLang);
    setChatInput("");
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  // ── Invite ────────────────────────────────────────────────────────────────
  const copyInvite = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
    toast.success("Invite link copied! Send to your friend.");
  };

  // ── Leave ─────────────────────────────────────────────────────────────────
  const leave = () => {
    sessionRef.current?.leave();
    localStream?.getTracks().forEach((t) => t.stop());
    screenStream?.getTracks().forEach((t) => t.stop());
    clearChat();
    router.push("/dashboard");
    toast("Left the meeting", { icon: "👋" });
  };

  const allCount = peers.size + 1;
  const gridCols = allCount <= 1 ? "grid-cols-1" :
                   allCount <= 2 ? "grid-cols-1 md:grid-cols-2" :
                   allCount <= 4 ? "grid-cols-2" :
                   allCount <= 9 ? "grid-cols-3" : "grid-cols-4";

  return (
    <div className="flex h-screen bg-background overflow-hidden flex-col">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border flex-shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg accent-gradient flex items-center justify-center text-white font-black text-[11px] flex-shrink-0">AZ</div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-foreground leading-none">A-Z Meeting</div>
            <button onClick={copyInvite} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-accent transition-colors mt-0.5">
              {code} <Copy size={9} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />{fmt(elapsed)}
          </div>
          {isRecording && <Badge variant="red" className="text-[10px] gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />REC</Badge>}
          <div className="flex items-center gap-1 text-[10px] font-semibold text-green-500">
            {connected ? <Wifi size={11} /> : <WifiOff size={11} className="text-amber-500" />}
            <span className={connected ? "text-green-500" : "text-amber-500"}>{connected ? `${allCount} in call` : "Connecting…"}</span>
          </div>
          {camErr && <div className="flex items-center gap-1 text-[10px] text-amber-500"><AlertCircle size={11} />{camErr}</div>}
          <button onClick={() => setPanelOpen((v) => !v)} className="w-8 h-8 hidden md:flex items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-foreground">
            <ChevronRight size={15} className={cn("transition-transform", !panelOpen && "rotate-180")} />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Video grid */}
        <div className="flex-1 flex flex-col gap-2 p-2 sm:p-3 min-w-0 overflow-hidden">
          <div className={cn("grid gap-2 flex-1 min-h-0", gridCols)}>

            {/* Self tile */}
            <VideoTile
              name={myName} peerId={peerId}
              stream={localStream} micOn={micEnabled} camOn={cameraEnabled}
              isSelf language={myLang} handRaised={isHandRaised}
              bgFilter={virtualBackground} filter={cameraFilter}
              localVideoRef={localVideoRef}
            />

            {/* Remote peers — real WebRTC streams */}
            {Array.from(peers.values()).map((peer) => (
              <VideoTile
                key={peer.peerId}
                name={peer.name} peerId={peer.peerId}
                stream={peer.stream} micOn={peer.micOn} camOn={peer.camOn}
                language={peer.language} handRaised={peer.handRaised}
              />
            ))}

            {/* Waiting state when alone */}
            {peers.size === 0 && (
              <div className="rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 p-8 text-center min-h-[120px]">
                <Users size={28} className="text-muted-foreground" />
                <div>
                  <div className="text-sm font-semibold text-foreground mb-1">Waiting for others…</div>
                  <div className="text-xs text-muted-foreground mb-3">Share the link and your friend will appear here</div>
                  <button
                    onClick={copyInvite}
                    className="flex items-center gap-2 text-xs accent-gradient text-white px-4 py-2 rounded-xl font-semibold hover:opacity-90 transition-opacity mx-auto"
                  >
                    <Share2 size={13} /> Copy invite link
                  </button>
                  <div className="text-[10px] text-muted-foreground mt-2 font-mono">{window?.location?.origin}/join/{code}</div>
                </div>
              </div>
            )}
          </div>

          {/* Screen share bar */}
          {isScreenSharing && (
            <div className="bg-card border border-border rounded-xl p-2 flex-shrink-0 flex items-center gap-2">
              <video ref={screenVideoRef} autoPlay playsInline muted className="h-16 w-28 rounded-lg object-contain bg-black border border-border" />
              <div className="text-xs text-foreground">Screen sharing active</div>
              <button onClick={handleScreenShare} className="ml-auto text-xs text-red-500 hover:underline">Stop</button>
            </div>
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
                  <button key={t} onClick={() => setRightPanelTab(t)}
                    className={cn("flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2 capitalize",
                      rightPanelTab === t ? "text-accent border-accent" : "text-muted-foreground border-transparent hover:text-foreground"
                    )}>{t}</button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-4">

                {/* TRANSLATE */}
                {rightPanelTab === "translate" && (
                  <>
                    <div className="flex items-center gap-2 bg-accent/6 border border-accent/15 rounded-lg px-3 py-2">
                      <Globe size={13} className="text-accent" />
                      <span className="text-xs font-semibold text-accent">AI translation — {allCount} language{allCount > 1 ? "s" : ""}</span>
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

                {/* VIDEO */}
                {rightPanelTab === "video" && (
                  <>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Streaming quality</label>
                      <div className="flex gap-1.5 flex-wrap">
                        {["Auto","720p","1080p","4K"].map((q) => (
                          <button key={q} onClick={() => setVideoQuality(q)}
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
                              bg.id === "none" ? "bg-muted text-muted-foreground" : bg.cls
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
                  </>
                )}

                {/* CHAT */}
                {rightPanelTab === "chat" && (
                  <div className="flex flex-col gap-3" style={{ height: "calc(100vh - 240px)" }}>
                    <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                      {chatMessages.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-6">No messages yet. All messages auto-translated.</p>
                      )}
                      {chatMessages.map((msg) => (
                        <div key={msg.id} className="bg-muted rounded-xl p-3 border border-border">
                          <div className={cn("text-[10px] font-bold mb-1", msg.sender_id === peerId ? "text-green-500" : "text-accent")}>
                            {msg.sender_id === peerId ? "You" : msg.sender_name}
                          </div>
                          <div className="text-xs text-foreground leading-relaxed">{msg.text}</div>
                          {msg.translated_text && <div className="text-[10px] text-muted-foreground mt-1">{msg.translated_text}</div>}
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendChat()}
                        placeholder="Message (auto-translated)…"
                        className="input-base flex-1 text-xs py-2" />
                      <button onClick={sendChat} className="accent-gradient text-white px-3 py-2 rounded-xl text-xs font-bold hover:opacity-90">Send</button>
                    </div>
                  </div>
                )}

                {/* PEOPLE */}
                {rightPanelTab === "people" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-muted rounded-xl p-3 text-center border border-border">
                        <div className="text-lg font-black text-foreground">{allCount}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">In call</div>
                      </div>
                      <div className="bg-muted rounded-xl p-3 text-center border border-border">
                        <div className="text-lg font-black text-green-500 text-sm font-semibold">{connected ? "Live" : "…"}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">WebRTC P2P</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Participants</div>
                      {/* Self */}
                      <div className="flex items-center gap-2.5 bg-muted rounded-xl px-3 py-2.5 border border-green-500/30">
                        <div className={cn("w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold", peerColor(peerId))}>
                          {initials(myName)}
                        </div>
                        <div className="flex-1 min-w-0"><div className="text-xs font-semibold text-foreground truncate">{myName} (You)</div></div>
                        <span className="text-[9px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded">{myLang.toUpperCase()}</span>
                      </div>
                      {Array.from(peers.values()).map((peer) => (
                        <div key={peer.peerId} className="flex items-center gap-2.5 bg-muted rounded-xl px-3 py-2.5 border border-border">
                          <div className={cn("w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold", peerColor(peer.peerId))}>
                            {initials(peer.name)}
                          </div>
                          <div className="flex-1 min-w-0"><div className="text-xs font-semibold text-foreground truncate">{peer.name}</div></div>
                          <span className="text-[9px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded">{peer.language.toUpperCase()}</span>
                        </div>
                      ))}
                      {peers.size === 0 && (
                        <div className="text-xs text-muted-foreground text-center py-3">Waiting for others to join…</div>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="w-full gap-2" onClick={copyInvite}>
                      <Share2 size={13} /> Copy invite link
                    </Button>
                    <div className="bg-accent/5 border border-accent/15 rounded-xl p-3 space-y-1.5">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Connection</div>
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Signaling</span><span className="text-green-500 font-semibold">Supabase Realtime</span></div>
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Video</span><span className="text-green-500 font-semibold">WebRTC P2P</span></div>
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Max capacity</span><span className="font-semibold text-foreground">40+ peers</span></div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Control bar ── */}
      <div className="bg-card border-t border-border px-4 py-3 flex items-center justify-between gap-2 flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-2">
          <CtrlBtn active={!micEnabled} onClick={handleToggleMic} activeColor="red" label="Mic">
            {micEnabled ? <Mic size={18} /> : <MicOff size={18} />}
          </CtrlBtn>
          <CtrlBtn active={!cameraEnabled} onClick={handleToggleCam} activeColor="red" label="Camera">
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
          <div className="text-xs font-semibold text-foreground">{code}</div>
          <div className="text-[10px] text-muted-foreground">{fmt(elapsed)} · {allCount} in call</div>
        </div>

        <div className="flex items-center gap-2">
          <CtrlBtn active={isHandRaised} onClick={handleHand} activeColor="amber" label="Hand">
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
                    { label: "🐛 Report a problem", action: () => { toast("Thanks — we appreciate the report"); setMoreOpen(false); } },
                  ].map(({ label, action }) => (
                    <button key={label} onClick={action} className="w-full text-left px-4 py-2.5 text-xs text-foreground hover:bg-muted transition-colors">
                      {label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button onClick={leave} className="flex flex-col items-center gap-1 cursor-pointer" title="Leave meeting">
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

// ═══════════════════════════════════════════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════
function MeetingPageInner() {
  const params  = useSearchParams();
  const user    = useAppStore((s) => s.user);
  const { setHearLanguage } = useAppStore();

  const rawCode  = params.get("code");
  const nameParam = params.get("name");
  const langParam = params.get("lang");

  const code = useMemo(
    () => (rawCode ?? generateMeetingCode()).toUpperCase().replace(/[^A-Z0-9-]/g, ""),
    [rawCode]
  );

  const [phase, setPhase]       = useState<"lobby" | "room">(nameParam ? "room" : "lobby");
  const [myName, setMyName]     = useState(nameParam ?? user?.full_name ?? "");
  const [myLang, setMyLang]     = useState(langParam ?? user?.preferred_language ?? "en");
  const [initStream, setInitStream] = useState<MediaStream | null>(null);
  const [initMic,    setInitMic]    = useState(true);
  const [initCam,    setInitCam]    = useState(true);

  useEffect(() => {
    if (langParam) setHearLanguage(langParam);
  }, [langParam, setHearLanguage]);

  if (phase === "lobby") {
    return (
      <LobbyScreen
        code={code}
        onJoin={({ name, lang, stream, micOn, camOn }) => {
          setMyName(name);
          setMyLang(lang);
          setInitStream(stream);
          setInitMic(micOn);
          setInitCam(camOn);
          setHearLanguage(lang);
          setPhase("room");
        }}
      />
    );
  }

  return (
    <MeetingRoom
      code={code} myName={myName} myLang={myLang}
      initialStream={initStream} initialMic={initMic} initialCam={initCam}
    />
  );
}

export default function MeetingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-accent" />
      </div>
    }>
      <MeetingPageInner />
    </Suspense>
  );
}
