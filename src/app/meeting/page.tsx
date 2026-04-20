"use client";

import {
  useState, useEffect, useRef, useCallback,
  Suspense, useMemo,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  Globe, Hand, MoreHorizontal, MessageSquare,
  Users, Copy, PhoneOff, ChevronRight,
  Loader2, Share2, Camera, AlertTriangle,
  RefreshCw, CheckCircle2,
} from "lucide-react";
import { useAppStore } from "@/store/app";
import { Button, Badge, SwitchRow } from "@/components/ui";
import { cn, flagForCode, generateMeetingCode } from "@/lib/utils";
import { LANGUAGES } from "@/types";
import { RoomSession, RemotePeer } from "@/lib/webrtc";
import toast from "react-hot-toast";
import { nanoid } from "nanoid";

// ─── Camera CSS filters ───────────────────────────────────────────────────────
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
  { id: "none", label: "None" }, { id: "warm", label: "🌅 Warm" },
  { id: "cool", label: "❄️ Cool" }, { id: "vivid", label: "🎨 Vivid" },
  { id: "soft", label: "🌸 Soft" }, { id: "mono", label: "⬛ Mono" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.trim().split(/\s+/).map((n) => n[0] ?? "").join("").toUpperCase().slice(0, 2) || "?";
}
const COLORS = [
  "from-violet-500 to-purple-600","from-blue-500 to-cyan-500",
  "from-green-500 to-emerald-500","from-orange-500 to-amber-500",
  "from-red-500 to-pink-500","from-indigo-500 to-blue-600","from-teal-500 to-green-500",
];
function peerColor(id: string) {
  let h = 0; for (const c of id) h = c.charCodeAt(0) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}

// ─── getUserMedia with best settings ─────────────────────────────────────────
// Tries high quality first, then falls back progressively
async function getMedia(wantCam: boolean, wantMic: boolean): Promise<{ stream: MediaStream; err: string }> {
  // Strategy 1: ask for both at once
  const attempts: MediaStreamConstraints[] = [];

  if (wantCam && wantMic) {
    attempts.push(
      { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } },
      { video: { facingMode: "user" }, audio: true },
      { video: true, audio: true },
    );
  } else if (wantCam) {
    attempts.push({ video: { facingMode: "user" }, audio: false }, { video: true, audio: false });
  } else if (wantMic) {
    attempts.push({ video: false, audio: { echoCancellation: true, noiseSuppression: true } }, { video: false, audio: true });
  }

  for (const constraints of attempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return { stream, err: "" };
    } catch (e: any) {
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        return {
          stream: new MediaStream(),
          err: "PERMISSION_DENIED",
        };
      }
      // Try next fallback
    }
  }

  return {
    stream: new MediaStream(),
    err: "DEVICE_NOT_FOUND",
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PERMISSION GUIDE — shown when browser blocks camera/mic
// ═══════════════════════════════════════════════════════════════════════════
function PermissionGuide({ onRetry }: { onRetry: () => void }) {
  const isChrome = typeof navigator !== "undefined" && /Chrome/.test(navigator.userAgent);
  const isFirefox = typeof navigator !== "undefined" && /Firefox/.test(navigator.userAgent);
  const isSafari = typeof navigator !== "undefined" && /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

  return (
    <div className="bg-amber-500/8 border border-amber-500/25 rounded-2xl p-5 space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-bold text-sm text-foreground mb-1">Camera & microphone access blocked</div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            Your browser needs permission to access your camera and microphone for the meeting.
          </div>
        </div>
      </div>

      <div className="bg-background/60 rounded-xl p-4 space-y-2">
        <div className="text-xs font-bold text-foreground mb-2">
          How to fix it in {isChrome ? "Chrome" : isFirefox ? "Firefox" : isSafari ? "Safari" : "your browser"}:
        </div>
        {isChrome && (
          <ol className="space-y-1.5">
            {[
              'Click the 🔒 lock icon in the address bar (top of the page)',
              'Find "Camera" and "Microphone"',
              'Change both from "Block" to "Allow"',
              'Click "Retry" below — page will reload with access granted',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                {step}
              </li>
            ))}
          </ol>
        )}
        {isFirefox && (
          <ol className="space-y-1.5">
            {[
              'Click the 🔒 lock icon in the address bar',
              'Click "Connection secure" → "More information"',
              'Go to Permissions tab',
              'Set Camera and Microphone to "Allow"',
              'Click "Retry" below',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                {step}
              </li>
            ))}
          </ol>
        )}
        {isSafari && (
          <ol className="space-y-1.5">
            {[
              'Go to Safari menu → Settings for this website',
              'Set Camera and Microphone to "Allow"',
              'Click "Retry" below',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                {step}
              </li>
            ))}
          </ol>
        )}
        {!isChrome && !isFirefox && !isSafari && (
          <p className="text-xs text-muted-foreground">
            Look for a camera or lock icon in the browser address bar and allow camera and microphone access, then click Retry.
          </p>
        )}
      </div>

      <button
        onClick={onRetry}
        className="w-full flex items-center justify-center gap-2 bg-accent text-white rounded-xl py-2.5 text-sm font-bold hover:opacity-90 transition-opacity"
      >
        <RefreshCw size={14} /> Retry camera & microphone access
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LOBBY — camera preview + join form
// ═══════════════════════════════════════════════════════════════════════════
function LobbyScreen({
  code,
  onJoin,
}: {
  code: string;
  onJoin: (opts: {
    name: string; lang: string;
    stream: MediaStream; micOn: boolean; camOn: boolean;
  }) => void;
}) {
  const user    = useAppStore((s) => s.user);
  const [name, setName]       = useState(user?.full_name ?? "");
  const [lang, setLang]       = useState(user?.preferred_language ?? "en");
  const [camOn, setCamOn]     = useState(true);
  const [micOn, setMicOn]     = useState(true);
  const [stream, setStream]   = useState<MediaStream | null>(null);
  const [permErr, setPermErr] = useState(false);
  const [deviceErr, setDeviceErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const videoRef              = useRef<HTMLVideoElement>(null);
  // track if component is still mounted
  const mounted               = useRef(true);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const requestMedia = useCallback(async (cam: boolean, mic: boolean) => {
    // Stop any existing stream first
    if (stream) { stream.getTracks().forEach((t) => t.stop()); }
    if (mounted.current) { setStream(null); setLoading(true); setPermErr(false); setDeviceErr(""); }

    const { stream: ms, err } = await getMedia(cam, mic);

    if (!mounted.current) { ms.getTracks().forEach((t) => t.stop()); return; }

    if (err === "PERMISSION_DENIED") {
      setPermErr(true);
      setLoading(false);
      return;
    }
    if (err === "DEVICE_NOT_FOUND") {
      setDeviceErr("No camera or microphone found. You can still join with audio/video off.");
      setLoading(false);
      setStream(new MediaStream());
      return;
    }

    setStream(ms);
    setLoading(false);

    // Attach to preview video
    if (cam && videoRef.current) {
      videoRef.current.srcObject = ms;
      videoRef.current.muted = true;
      try { await videoRef.current.play(); } catch { /* autoplay blocked — fine, controls will show */ }
    }
  }, []); // eslint-disable-line

  // Request on mount
  useEffect(() => {
    requestMedia(camOn, micOn);
  }, []); // eslint-disable-line

  // Re-request when user toggles cam/mic
  const handleToggleCam = () => {
    const next = !camOn;
    setCamOn(next);
    requestMedia(next, micOn);
  };
  const handleToggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    requestMedia(camOn, next);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
    toast.success("Invite link copied! Send it to your friend.");
  };

  const handleJoin = async () => {
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    setJoining(true);

    // If no stream yet, try one more time
    let finalStream = stream;
    if (!finalStream || finalStream.getTracks().length === 0) {
      const { stream: ms } = await getMedia(camOn, micOn);
      finalStream = ms;
      setStream(ms);
    }

    onJoin({ name: name.trim(), lang, stream: finalStream!, micOn, camOn });
  };

  const camTrack = stream?.getVideoTracks()[0];
  const micTrack = stream?.getAudioTracks()[0];
  const hasCam   = !!camTrack && camTrack.readyState === "live";
  const hasMic   = !!micTrack && micTrack.readyState === "live";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-accent/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-500/8 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[860px] grid md:grid-cols-2 gap-5 z-10 relative"
      >
        {/* ── Camera preview card ── */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="relative bg-zinc-900" style={{ aspectRatio: "16/9" }}>
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
                <Loader2 size={28} className="animate-spin text-accent" />
                <span className="text-xs text-white/50">Requesting camera access…</span>
              </div>
            )}

            {!loading && !permErr && hasCam && (
              <video
                ref={videoRef}
                autoPlay muted playsInline
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
            )}

            {!loading && !permErr && !hasCam && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Camera size={40} className="text-white/20" />
                <span className="text-xs text-white/40">
                  {camOn ? "Camera not available" : "Camera is off"}
                </span>
              </div>
            )}

            {/* Mic / Cam toggle buttons */}
            {!permErr && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3 z-20">
                <button
                  onClick={handleToggleMic}
                  title={micOn ? "Mute microphone" : "Unmute microphone"}
                  className={cn(
                    "w-11 h-11 rounded-full flex items-center justify-center border-2 shadow-lg transition-all",
                    micOn && hasMic
                      ? "bg-white/15 border-white/30 text-white"
                      : micOn && !hasMic
                      ? "bg-amber-500/70 border-amber-400 text-white"
                      : "bg-red-500 border-red-400 text-white"
                  )}
                >
                  {micOn ? <Mic size={17} /> : <MicOff size={17} />}
                </button>
                <button
                  onClick={handleToggleCam}
                  title={camOn ? "Stop camera" : "Start camera"}
                  className={cn(
                    "w-11 h-11 rounded-full flex items-center justify-center border-2 shadow-lg transition-all",
                    camOn && hasCam
                      ? "bg-white/15 border-white/30 text-white"
                      : camOn && !hasCam
                      ? "bg-amber-500/70 border-amber-400 text-white"
                      : "bg-red-500 border-red-400 text-white"
                  )}
                >
                  {camOn ? <Video size={17} /> : <VideoOff size={17} />}
                </button>
              </div>
            )}
          </div>

          {/* Status row */}
          <div className="px-4 py-3 flex items-center justify-between gap-3 border-t border-border">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs">
                <div className={cn("w-2 h-2 rounded-full flex-shrink-0", hasMic ? "bg-green-500" : "bg-red-400")} />
                <span className={hasMic ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                  {hasMic ? "Mic ready" : "No mic"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <div className={cn("w-2 h-2 rounded-full flex-shrink-0", hasCam ? "bg-green-500" : "bg-red-400")} />
                <span className={hasCam ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                  {hasCam ? "Camera ready" : "No camera"}
                </span>
              </div>
            </div>
            <button onClick={copyLink} className="flex items-center gap-1.5 text-xs text-accent hover:underline">
              <Share2 size={11} /> Invite friend
            </button>
          </div>
        </div>

        {/* ── Join form ── */}
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center text-white font-black text-sm flex-shrink-0">AZ</div>
            <div>
              <div className="font-black text-base text-foreground">Ready to join?</div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                Code: <span className="font-mono font-bold text-foreground">{code}</span>
                <button onClick={copyLink} className="hover:text-accent"><Copy size={10} /></button>
              </div>
            </div>
          </div>

          {/* Permission error — show guide */}
          {permErr ? (
            <PermissionGuide onRetry={() => requestMedia(camOn, micOn)} />
          ) : (
            <>
              {deviceErr && (
                <div className="bg-amber-500/8 border border-amber-500/25 rounded-xl px-3 py-2.5 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
                  <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
                  {deviceErr}
                </div>
              )}

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
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Hear meeting in</label>
                <select className="input-base" value={lang} onChange={(e) => setLang(e.target.value)}>
                  {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
                </select>
              </div>

              <div className="bg-green-500/6 border border-green-500/20 rounded-xl p-3 flex items-start gap-2">
                <CheckCircle2 size={13} className="text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Real live P2P video call — your friend joins via the invite link and you see & hear each other instantly. No demo.
                </p>
              </div>

              <Button size="lg" className="w-full mt-auto" disabled={!name.trim() || joining} onClick={handleJoin}>
                {joining ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
                {joining ? "Connecting…" : "Join meeting"}
              </Button>

              <p className="text-[11px] text-muted-foreground text-center">
                Send <button onClick={copyLink} className="text-accent underline">the invite link</button> to your friend so they can join
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// VIDEO TILE
// ═══════════════════════════════════════════════════════════════════════════
function VideoTile({
  name, peerId, stream, micOn, camOn, isSelf,
  language, handRaised, bgFilter, filterCss, localRef,
}: {
  name: string; peerId: string; stream: MediaStream | null;
  micOn: boolean; camOn: boolean; isSelf?: boolean;
  language: string; handRaised?: boolean;
  bgFilter?: string; filterCss?: string;
  localRef?: React.RefObject<HTMLVideoElement>;
}) {
  const remoteRef = useRef<HTMLVideoElement>(null);
  const ref = isSelf ? localRef : remoteRef;

  // Attach remote stream
  useEffect(() => {
    if (!isSelf && remoteRef.current && stream) {
      remoteRef.current.srcObject = stream;
      remoteRef.current.play().catch(() => {});
    }
  }, [stream, isSelf]);

  const showVideo = isSelf ? (camOn && !!stream && (stream.getVideoTracks().length > 0)) : (camOn && !!stream);

  return (
    <div className={cn(
      "relative rounded-xl border-2 bg-zinc-900 overflow-hidden flex items-center justify-center transition-all duration-300 min-h-[130px]",
      "border-border"
    )}>
      {/* Virtual background layer */}
      {isSelf && bgFilter && bgFilter !== "none" && (
        <div className={cn("absolute inset-0 z-0 opacity-50", BG_OPTIONS.find((b) => b.id === bgFilter)?.cls)} />
      )}

      {showVideo ? (
        <video
          ref={ref as React.RefObject<HTMLVideoElement>}
          autoPlay
          muted={!!isSelf}
          playsInline
          className="w-full h-full object-cover z-10 relative"
          style={{ transform: isSelf ? "scaleX(-1)" : "none", filter: isSelf ? filterCss : "none" }}
        />
      ) : (
        <div className="flex flex-col items-center gap-2 z-10 relative select-none">
          <div className={cn(
            "w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-2xl",
            peerColor(peerId)
          )}>
            {initials(name)}
          </div>
          {!camOn && <span className="text-[10px] text-white/40">Camera off</span>}
        </div>
      )}

      {handRaised && (
        <div className="absolute top-2 left-2 z-30 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          ✋ Raised
        </div>
      )}

      <div className="absolute top-2 right-2 z-20">
        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center",
          !micOn ? "bg-red-500" : "bg-black/50 border border-white/20"
        )}>
          {!micOn ? <MicOff size={11} className="text-white" /> : <Mic size={11} className="text-white" />}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent px-3 py-2 z-20 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-white truncate">{name}{isSelf ? " (You)" : ""}</span>
        <span className="text-[9px] font-bold bg-accent/60 text-white px-1.5 py-0.5 rounded ml-1 flex-shrink-0">
          {flagForCode(language)} {language.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

// ─── Control button ───────────────────────────────────────────────────────────
function CtrlBtn({ children, onClick, active, activeColor = "red", label, title }: {
  children: React.ReactNode; onClick: () => void; active: boolean;
  activeColor?: "red" | "accent" | "amber"; label: string; title?: string;
}) {
  const cls = { red: "bg-red-500/12 border-red-500/30 text-red-500", accent: "bg-accent/12 border-accent/30 text-accent", amber: "bg-amber-500/12 border-amber-500/30 text-amber-500" };
  return (
    <button onClick={onClick} title={title} className="flex flex-col items-center gap-1 cursor-pointer group">
      <div className={cn("w-11 h-11 rounded-full flex items-center justify-center border transition-all active:scale-95",
        active ? cls[activeColor] : "bg-muted border-border text-muted-foreground group-hover:text-foreground group-hover:border-accent/40"
      )}>{children}</div>
      <span className={cn("text-[9px] font-medium", active && activeColor === "red" ? "text-red-500" : "text-muted-foreground")}>{label}</span>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MEETING ROOM — live call
// ═══════════════════════════════════════════════════════════════════════════
function MeetingRoom({
  code, myName, myLang, initialStream, initialMic, initialCam,
}: {
  code: string; myName: string; myLang: string;
  initialStream: MediaStream; initialMic: boolean; initialCam: boolean;
}) {
  const router = useRouter();
  const {
    micEnabled, cameraEnabled,
    isHandRaised, setHandRaised,
    isScreenSharing, setScreenSharing,
    isRecording, setRecording,
    speakLanguage, hearLanguage, setSpeakLanguage, setHearLanguage,
    aiDubbingEnabled, setAiDubbingEnabled, captionsEnabled, setCaptionsEnabled,
    showOriginal, setShowOriginal, autoDetect, setAutoDetect,
    noiseCancellation, setNoiseCancellation, translationEngine, setTranslationEngine,
    videoQuality, setVideoQuality,
    virtualBackground, setVirtualBackground, cameraFilter, setCameraFilter,
    skinTouchup, setSkinTouchup, autoLighting, setAutoLighting, hdRecording, setHdRecording,
    rightPanelTab, setRightPanelTab, chatMessages, addChatMessage, clearChat, user,
  } = useAppStore();

  const peerId       = useMemo(() => user?.id ?? nanoid(12), [user?.id]); // eslint-disable-line
  const [peers, setPeers]             = useState<Map<string, RemotePeer>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream>(initialStream);
  const [micOn, setMicOn]             = useState(initialMic);
  const [camOn, setCamOn]             = useState(initialCam);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [panelOpen, setPanelOpen]     = useState(true);
  const [moreOpen, setMoreOpen]       = useState(false);
  const [chatInput, setChatInput]     = useState("");
  const [elapsed, setElapsed]         = useState(0);

  const sessionRef    = useRef<RoomSession | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenRef     = useRef<HTMLVideoElement>(null);
  const chatEndRef    = useRef<HTMLDivElement>(null);

  // Sync initial mic/cam into store
  useEffect(() => {
    useAppStore.getState().setMicEnabled(initialMic);
    useAppStore.getState().setCameraEnabled(initialCam);
  }, []); // eslint-disable-line

  // Attach local video
  useEffect(() => {
    if (localVideoRef.current && localStream && camOn) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.muted = true;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, camOn]);

  // Camera filter
  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.style.filter = FILTER_CSS[cameraFilter] ?? "none";
  }, [cameraFilter]);

  // Timer
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Join room
  useEffect(() => {
    const session = new RoomSession({
      peerId, name: myName, language: myLang, roomCode: code,
      onPeersUpdate: (updated) => setPeers(new Map(updated)),
      onChat: (msg) => {
        addChatMessage({ id: nanoid(), sender_id: msg.peerId, sender_name: msg.name, text: msg.text, original_language: msg.lang, timestamp: new Date() });
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      },
    });
    sessionRef.current = session;
    session.join(localStream).then(() => {
      toast.success("You're live! Share the invite link with your friend.", { duration: 5000 });
    });
    return () => { session.leave(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmt = (s: number) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  // ── Mic toggle ────────────────────────────────────────────────────────────
  const handleMic = useCallback(async () => {
    const next = !micOn;
    setMicOn(next);
    useAppStore.getState().setMicEnabled(next);

    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length > 0) {
      // Just mute/unmute existing track
      audioTracks.forEach((t) => { t.enabled = next; });
    } else if (next) {
      // No audio track yet — request mic
      try {
        const ms = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
        ms.getAudioTracks().forEach((t) => {
          localStream.addTrack(t);
        });
        sessionRef.current?.updateLocalStream(localStream);
      } catch {
        toast.error("Could not access microphone");
        setMicOn(false); useAppStore.getState().setMicEnabled(false);
        return;
      }
    }
    sessionRef.current?.sendMuteState(next, camOn);
    toast(next ? "Microphone on" : "Microphone muted", { icon: next ? "🎙️" : "🔇" });
  }, [micOn, camOn, localStream]);

  // ── Camera toggle ─────────────────────────────────────────────────────────
  const handleCam = useCallback(async () => {
    const next = !camOn;
    setCamOn(next);
    useAppStore.getState().setCameraEnabled(next);

    const videoTracks = localStream.getVideoTracks();
    if (videoTracks.length > 0) {
      videoTracks.forEach((t) => { t.enabled = next; });
    } else if (next) {
      try {
        const ms = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        ms.getVideoTracks().forEach((t) => {
          localStream.addTrack(t);
        });
        setLocalStream(new MediaStream(localStream.getTracks())); // trigger re-render
        sessionRef.current?.updateLocalStream(localStream);
      } catch {
        toast.error("Could not access camera");
        setCamOn(false); useAppStore.getState().setCameraEnabled(false);
        return;
      }
    }
    sessionRef.current?.sendMuteState(micOn, next);
    toast(next ? "Camera on" : "Camera off", { icon: next ? "📹" : "📷" });
  }, [camOn, micOn, localStream]);

  // ── Screen share ──────────────────────────────────────────────────────────
  const handleScreen = async () => {
    if (isScreenSharing) {
      screenStream?.getTracks().forEach((t) => t.stop()); setScreenStream(null); setScreenSharing(false);
      toast("Screen share stopped"); return;
    }
    try {
      const ms = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" } as any, audio: true });
      setScreenStream(ms);
      if (screenRef.current) { screenRef.current.srcObject = ms; screenRef.current.play().catch(() => {}); }
      ms.getVideoTracks()[0].onended = () => { setScreenSharing(false); setScreenStream(null); };
      setScreenSharing(true);
      toast.success("Screen sharing started");
    } catch (e: any) {
      if (e.name !== "NotAllowedError") toast.error("Could not share screen");
    }
  };

  // ── Hand raise ────────────────────────────────────────────────────────────
  const handleHand = () => {
    const next = !isHandRaised; setHandRaised(next);
    sessionRef.current?.sendHandRaise(next);
    if (next) { toast.success("✋ Hand raised"); setTimeout(() => { setHandRaised(false); sessionRef.current?.sendHandRaise(false); }, 30000); }
  };

  // ── Chat ──────────────────────────────────────────────────────────────────
  const sendChat = () => {
    const val = chatInput.trim(); if (!val) return;
    addChatMessage({ id: nanoid(), sender_id: peerId, sender_name: myName, text: val, original_language: myLang, timestamp: new Date() });
    sessionRef.current?.sendChat(val, myLang);
    setChatInput("");
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  // ── Invite ────────────────────────────────────────────────────────────────
  const copyInvite = () => { navigator.clipboard.writeText(`${window.location.origin}/join/${code}`); toast.success("Invite link copied!"); };

  // ── Leave ─────────────────────────────────────────────────────────────────
  const leave = () => {
    sessionRef.current?.leave();
    localStream.getTracks().forEach((t) => t.stop());
    screenStream?.getTracks().forEach((t) => t.stop());
    clearChat(); router.push("/dashboard");
    toast("Left the meeting", { icon: "👋" });
  };

  const allCount = peers.size + 1;
  const gridCols = allCount <= 1 ? "grid-cols-1" : allCount <= 2 ? "grid-cols-1 md:grid-cols-2" : allCount <= 4 ? "grid-cols-2" : allCount <= 9 ? "grid-cols-3" : "grid-cols-4";
  const filterCss = FILTER_CSS[cameraFilter] ?? "none";

  return (
    <div className="flex h-screen bg-background overflow-hidden flex-col">
      {/* Top bar */}
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
          <span className="text-[10px] font-semibold text-green-500">{allCount} in call</span>
          <button onClick={() => setPanelOpen((v) => !v)} className="w-8 h-8 hidden md:flex items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-foreground">
            <ChevronRight size={15} className={cn("transition-transform", !panelOpen && "rotate-180")} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Video grid */}
        <div className="flex-1 flex flex-col gap-2 p-2 sm:p-3 min-w-0 overflow-hidden">
          <div className={cn("grid gap-2 flex-1 min-h-0", gridCols)}>
            {/* Self */}
            <VideoTile name={myName} peerId={peerId} stream={localStream} micOn={micOn} camOn={camOn}
              isSelf language={myLang} handRaised={isHandRaised}
              bgFilter={virtualBackground} filterCss={filterCss} localRef={localVideoRef} />

            {/* Real remote peers */}
            {Array.from(peers.values()).map((peer) => (
              <VideoTile key={peer.peerId} name={peer.name} peerId={peer.peerId}
                stream={peer.stream} micOn={peer.micOn} camOn={peer.camOn}
                language={peer.language} handRaised={peer.handRaised} />
            ))}

            {/* Waiting tile */}
            {peers.size === 0 && (
              <div className="rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 p-6 text-center min-h-[130px]">
                <Users size={26} className="text-muted-foreground" />
                <div>
                  <div className="text-sm font-semibold text-foreground mb-1">Waiting for others…</div>
                  <div className="text-xs text-muted-foreground mb-3">Share your invite link and your friend will appear here live</div>
                  <button onClick={copyInvite} className="flex items-center gap-2 text-xs accent-gradient text-white px-4 py-2 rounded-xl font-semibold hover:opacity-90 mx-auto">
                    <Share2 size={13} /> Copy invite link
                  </button>
                  <div className="text-[10px] text-muted-foreground mt-2 font-mono break-all">{typeof window !== "undefined" ? window.location.origin : ""}/join/{code}</div>
                </div>
              </div>
            )}
          </div>

          {/* Screen share PiP */}
          {isScreenSharing && screenStream && (
            <div className="bg-card border border-border rounded-xl p-2 flex-shrink-0 flex items-center gap-3">
              <video ref={screenRef} autoPlay playsInline muted className="h-16 w-28 rounded-lg object-contain bg-black border border-border" />
              <div className="text-xs text-foreground flex-1">Screen sharing active</div>
              <button onClick={handleScreen} className="text-xs text-red-500 hover:underline">Stop</button>
            </div>
          )}
        </div>

        {/* Right panel */}
        <AnimatePresence>
          {panelOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }} animate={{ width: 272, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="bg-card border-l border-border flex flex-col overflow-hidden flex-shrink-0 hidden md:flex"
            >
              <div className="flex border-b border-border flex-shrink-0">
                {(["translate","video","chat","people"] as const).map((t) => (
                  <button key={t} onClick={() => setRightPanelTab(t)}
                    className={cn("flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2 capitalize",
                      rightPanelTab === t ? "text-accent border-accent" : "text-muted-foreground border-transparent hover:text-foreground"
                    )}>{t}</button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-4">

                {rightPanelTab === "translate" && (<>
                  <div className="flex items-center gap-2 bg-accent/6 border border-accent/15 rounded-lg px-3 py-2">
                    <Globe size={13} className="text-accent" /><span className="text-xs font-semibold text-accent">AI translation active</span>
                  </div>
                  <div><label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">You speak</label>
                    <select value={speakLanguage} onChange={(e) => setSpeakLanguage(e.target.value)} className="input-base text-xs py-2">
                      {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
                    </select></div>
                  <div><label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">You hear in</label>
                    <select value={hearLanguage} onChange={(e) => setHearLanguage(e.target.value)} className="input-base text-xs py-2">
                      {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
                    </select></div>
                  <div className="space-y-0.5">
                    <SwitchRow label="AI voice dubbing" checked={aiDubbingEnabled} onCheckedChange={setAiDubbingEnabled} />
                    <SwitchRow label="Live captions" checked={captionsEnabled} onCheckedChange={setCaptionsEnabled} />
                    <SwitchRow label="Show original text" checked={showOriginal} onCheckedChange={setShowOriginal} />
                    <SwitchRow label="Auto-detect language" checked={autoDetect} onCheckedChange={setAutoDetect} />
                    <SwitchRow label="Noise cancellation" checked={noiseCancellation} onCheckedChange={setNoiseCancellation} />
                  </div>
                  <div><label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Engine</label>
                    <select value={translationEngine} onChange={(e) => setTranslationEngine(e.target.value)} className="input-base text-xs py-2">
                      <option value="az-ai">A-Z AI (recommended)</option>
                      <option value="deepl">DeepL Neural</option>
                      <option value="google">Google Neural MT</option>
                    </select></div>
                </>)}

                {rightPanelTab === "video" && (<>
                  <div><label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Streaming quality</label>
                    <div className="flex gap-1.5 flex-wrap">{["Auto","720p","1080p","4K"].map((q) => (
                      <button key={q} onClick={() => setVideoQuality(q)}
                        className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                          videoQuality === q ? "bg-accent/10 border-accent/30 text-accent" : "border-border text-muted-foreground hover:bg-muted"
                        )}>{q}</button>
                    ))}</div></div>
                  <div><label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Virtual background</label>
                    <div className="grid grid-cols-3 gap-1.5">{BG_OPTIONS.map((bg) => (
                      <button key={bg.id} onClick={() => setVirtualBackground(bg.id)}
                        className={cn("h-12 rounded-lg text-xs font-semibold text-white flex items-center justify-center border-2 transition-all",
                          virtualBackground === bg.id ? "border-accent scale-105" : "border-transparent",
                          bg.id === "none" ? "bg-muted text-muted-foreground" : bg.cls
                        )}>{bg.label}</button>
                    ))}</div></div>
                  <div><label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Camera filter</label>
                    <div className="grid grid-cols-3 gap-1.5">{FILTER_OPTIONS.map((f) => (
                      <button key={f.id} onClick={() => setCameraFilter(f.id)}
                        className={cn("py-2 rounded-lg text-xs font-medium border transition-all",
                          cameraFilter === f.id ? "bg-accent/10 border-accent/30 text-accent" : "border-border text-muted-foreground hover:bg-muted"
                        )}>{f.label}</button>
                    ))}</div></div>
                  <div className="space-y-0.5">
                    <SwitchRow label="AI skin touch-up" checked={skinTouchup} onCheckedChange={setSkinTouchup} />
                    <SwitchRow label="Auto lighting" checked={autoLighting} onCheckedChange={setAutoLighting} />
                    <SwitchRow label="HD recording" checked={hdRecording} onCheckedChange={setHdRecording} />
                  </div>
                </>)}

                {rightPanelTab === "chat" && (
                  <div className="flex flex-col gap-3" style={{ height: "calc(100vh - 240px)" }}>
                    <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                      {chatMessages.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No messages yet.</p>}
                      {chatMessages.map((msg) => (
                        <div key={msg.id} className="bg-muted rounded-xl p-3 border border-border">
                          <div className={cn("text-[10px] font-bold mb-1", msg.sender_id === peerId ? "text-green-500" : "text-accent")}>
                            {msg.sender_id === peerId ? "You" : msg.sender_name}
                          </div>
                          <div className="text-xs text-foreground leading-relaxed">{msg.text}</div>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendChat()}
                        placeholder="Message…" className="input-base flex-1 text-xs py-2" />
                      <button onClick={sendChat} className="accent-gradient text-white px-3 py-2 rounded-xl text-xs font-bold hover:opacity-90">Send</button>
                    </div>
                  </div>
                )}

                {rightPanelTab === "people" && (<>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted rounded-xl p-3 text-center border border-border">
                      <div className="text-lg font-black text-foreground">{allCount}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">In call</div>
                    </div>
                    <div className="bg-muted rounded-xl p-3 text-center border border-border">
                      <div className="text-sm font-black text-green-500">P2P</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">WebRTC</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Participants</div>
                    <div className="flex items-center gap-2.5 bg-muted rounded-xl px-3 py-2.5 border border-green-500/25">
                      <div className={cn("w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold", peerColor(peerId))}>{initials(myName)}</div>
                      <div className="flex-1 min-w-0"><div className="text-xs font-semibold text-foreground truncate">{myName} (You)</div></div>
                      <span className="text-[9px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded">{myLang.toUpperCase()}</span>
                    </div>
                    {Array.from(peers.values()).map((peer) => (
                      <div key={peer.peerId} className="flex items-center gap-2.5 bg-muted rounded-xl px-3 py-2.5 border border-border">
                        <div className={cn("w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold", peerColor(peer.peerId))}>{initials(peer.name)}</div>
                        <div className="flex-1 min-w-0"><div className="text-xs font-semibold text-foreground truncate">{peer.name}</div></div>
                        <span className="text-[9px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded">{peer.language.toUpperCase()}</span>
                      </div>
                    ))}
                    {peers.size === 0 && <div className="text-xs text-muted-foreground text-center py-2">Waiting for others…</div>}
                  </div>
                  <Button variant="ghost" size="sm" className="w-full gap-2" onClick={copyInvite}><Share2 size={13} /> Copy invite link</Button>
                </>)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control bar */}
      <div className="bg-card border-t border-border px-4 py-3 flex items-center justify-between gap-2 flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-2">
          <CtrlBtn active={!micOn} onClick={handleMic} activeColor="red" label="Mic">
            {micOn ? <Mic size={18} /> : <MicOff size={18} />}
          </CtrlBtn>
          <CtrlBtn active={!camOn} onClick={handleCam} activeColor="red" label="Camera">
            {camOn ? <Video size={18} /> : <VideoOff size={18} />}
          </CtrlBtn>
          <CtrlBtn active={isScreenSharing} onClick={handleScreen} activeColor="accent" label="Share">
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
          <CtrlBtn active={isHandRaised} onClick={handleHand} activeColor="amber" label="Hand"><Hand size={18} /></CtrlBtn>
          <CtrlBtn active={false} onClick={() => { setRightPanelTab("chat"); setPanelOpen(true); }} label="Chat"><MessageSquare size={18} /></CtrlBtn>
          <CtrlBtn active={false} onClick={() => { setRightPanelTab("people"); setPanelOpen(true); }} label="People"><Users size={18} /></CtrlBtn>
          <div className="relative">
            <CtrlBtn active={moreOpen} onClick={() => setMoreOpen((v) => !v)} label="More"><MoreHorizontal size={18} /></CtrlBtn>
            <AnimatePresence>{moreOpen && (
              <motion.div initial={{ opacity:0, scale:0.92, y:8 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.92, y:8 }}
                className="absolute bottom-14 right-0 bg-card border border-border rounded-xl shadow-xl py-1.5 w-52 z-50">
                {[
                  { label: isRecording ? "⏹ Stop recording" : "⏺ Start recording", action: () => { setRecording(!isRecording); toast.success(isRecording ? "Stopped" : "Recording started"); setMoreOpen(false); } },
                  { label: "📋 Copy invite link", action: () => { copyInvite(); setMoreOpen(false); } },
                  { label: "⚙️ Video settings", action: () => { setRightPanelTab("video"); setPanelOpen(true); setMoreOpen(false); } },
                  { label: "🐛 Report a problem", action: () => { toast("Thanks for the report"); setMoreOpen(false); } },
                ].map(({ label, action }) => (
                  <button key={label} onClick={action} className="w-full text-left px-4 py-2.5 text-xs text-foreground hover:bg-muted transition-colors">{label}</button>
                ))}
              </motion.div>
            )}</AnimatePresence>
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

// ═══════════════════════════════════════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════
function MeetingPageInner() {
  const params    = useSearchParams();
  const user      = useAppStore((s) => s.user);
  const { setHearLanguage } = useAppStore();

  const code = useMemo(() => {
    const raw = params.get("code");
    return (raw ?? generateMeetingCode()).toUpperCase().replace(/[^A-Z0-9-]/g, "");
  }, [params]);

  const nameParam = params.get("name");
  const langParam = params.get("lang");

  const [phase, setPhase]           = useState<"lobby" | "room">("lobby");
  const [myName, setMyName]         = useState(nameParam ?? user?.full_name ?? "");
  const [myLang, setMyLang]         = useState(langParam ?? user?.preferred_language ?? "en");
  const [roomStream, setRoomStream] = useState<MediaStream | null>(null);
  const [roomMic, setRoomMic]       = useState(true);
  const [roomCam, setRoomCam]       = useState(true);

  useEffect(() => { if (langParam) setHearLanguage(langParam); }, [langParam, setHearLanguage]);

  if (phase === "lobby") {
    return (
      <LobbyScreen
        code={code}
        onJoin={({ name, lang, stream, micOn, camOn }) => {
          setMyName(name); setMyLang(lang);
          setRoomStream(stream); setRoomMic(micOn); setRoomCam(camOn);
          setHearLanguage(lang); setPhase("room");
        }}
      />
    );
  }

  return (
    <MeetingRoom
      code={code} myName={myName} myLang={myLang}
      initialStream={roomStream ?? new MediaStream()}
      initialMic={roomMic} initialCam={roomCam}
    />
  );
}

export default function MeetingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Loader2 size={28} className="animate-spin text-accent" /></div>}>
      <MeetingPageInner />
    </Suspense>
  );
}
