// ─── WebRTC + Supabase Realtime Signaling ────────────────────────────────────
// Uses Supabase Realtime as the signaling channel for WebRTC peer connections.
// Each participant broadcasts their presence, offers, answers, and ICE candidates
// through a shared Realtime channel keyed by the meeting room code.

import { createClient } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

// Free STUN servers — work globally, no setup needed
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
  // Free TURN server for when STUN alone fails (NAT traversal)
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

export type SignalMessage =
  | { type: "join";    peerId: string; name: string; language: string }
  | { type: "leave";   peerId: string }
  | { type: "offer";   peerId: string; targetId: string; sdp: RTCSessionDescriptionInit }
  | { type: "answer";  peerId: string; targetId: string; sdp: RTCSessionDescriptionInit }
  | { type: "ice";     peerId: string; targetId: string; candidate: RTCIceCandidateInit }
  | { type: "mute";    peerId: string; mic: boolean; cam: boolean }
  | { type: "hand";    peerId: string; raised: boolean }
  | { type: "chat";    peerId: string; name: string; text: string; lang: string };

export interface RemotePeer {
  peerId:    string;
  name:      string;
  language:  string;
  stream:    MediaStream | null;
  micOn:     boolean;
  camOn:     boolean;
  handRaised: boolean;
  pc:        RTCPeerConnection | null;
}

type PeerUpdateFn = (peers: Map<string, RemotePeer>) => void;
type ChatFn = (msg: { peerId: string; name: string; text: string; lang: string }) => void;

export class RoomSession {
  private peerId:    string;
  private name:      string;
  private language:  string;
  private roomCode:  string;
  private channel:   RealtimeChannel | null = null;
  private peers:     Map<string, RemotePeer> = new Map();
  private localStream: MediaStream | null = null;
  private onPeersUpdate: PeerUpdateFn;
  private onChat: ChatFn;
  private supabase = createClient();
  // Track which peer pairs we've already initiated an offer from to avoid duplicates
  private offeredTo = new Set<string>();

  constructor(opts: {
    peerId: string;
    name: string;
    language: string;
    roomCode: string;
    onPeersUpdate: PeerUpdateFn;
    onChat: ChatFn;
  }) {
    this.peerId       = opts.peerId;
    this.name         = opts.name;
    this.language     = opts.language;
    this.roomCode     = opts.roomCode;
    this.onPeersUpdate = opts.onPeersUpdate;
    this.onChat       = opts.onChat;
  }

  // ── Join the room ──────────────────────────────────────────────────────────
  async join(localStream: MediaStream) {
    this.localStream = localStream;

    const channelName = `room:${this.roomCode.replace(/[^A-Z0-9]/g, "")}`;

    this.channel = this.supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    this.channel
      .on("broadcast", { event: "signal" }, ({ payload }: { payload: SignalMessage }) => {
        this.handleSignal(payload);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Announce our presence — existing members will send us offers
          this.broadcast({ type: "join", peerId: this.peerId, name: this.name, language: this.language });
        }
      });
  }

  // ── Handle incoming signals ────────────────────────────────────────────────
  private async handleSignal(msg: SignalMessage) {
    switch (msg.type) {
      case "join": {
        if (msg.peerId === this.peerId) return;
        // Create peer entry
        if (!this.peers.has(msg.peerId)) {
          this.peers.set(msg.peerId, {
            peerId: msg.peerId, name: msg.name, language: msg.language,
            stream: null, micOn: true, camOn: true, handRaised: false, pc: null,
          });
          this.notifyUpdate();
        }
        // Existing member initiates offer to the newcomer (avoid both sides offering)
        if (!this.offeredTo.has(msg.peerId)) {
          this.offeredTo.add(msg.peerId);
          await this.createOffer(msg.peerId);
        }
        break;
      }
      case "leave": {
        this.closePeer(msg.peerId);
        this.peers.delete(msg.peerId);
        this.offeredTo.delete(msg.peerId);
        this.notifyUpdate();
        break;
      }
      case "offer": {
        if (msg.targetId !== this.peerId) return;
        await this.handleOffer(msg.peerId, msg.sdp);
        break;
      }
      case "answer": {
        if (msg.targetId !== this.peerId) return;
        await this.handleAnswer(msg.peerId, msg.sdp);
        break;
      }
      case "ice": {
        if (msg.targetId !== this.peerId) return;
        await this.handleIce(msg.peerId, msg.candidate);
        break;
      }
      case "mute": {
        const p = this.peers.get(msg.peerId);
        if (p) { p.micOn = msg.mic; p.camOn = msg.cam; this.notifyUpdate(); }
        break;
      }
      case "hand": {
        const p = this.peers.get(msg.peerId);
        if (p) { p.handRaised = msg.raised; this.notifyUpdate(); }
        break;
      }
      case "chat": {
        this.onChat(msg);
        break;
      }
    }
  }

  // ── Create a peer connection ───────────────────────────────────────────────
  private createPeerConnection(peerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add our local tracks to the connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // When we get remote tracks, attach to the peer's stream
    pc.ontrack = (event) => {
      const peer = this.peers.get(peerId);
      if (!peer) return;
      if (!peer.stream) {
        peer.stream = new MediaStream();
        this.peers.set(peerId, peer);
      }
      peer.stream.addTrack(event.track);
      this.notifyUpdate();
    };

    // Send ICE candidates to the remote peer via signaling
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.broadcast({
          type: "ice",
          peerId: this.peerId,
          targetId: peerId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        // Attempt ICE restart
        if (pc.signalingState === "stable") {
          pc.restartIce();
        }
      }
    };

    return pc;
  }

  // ── Offer (caller side) ───────────────────────────────────────────────────
  private async createOffer(peerId: string) {
    const pc = this.createPeerConnection(peerId);
    const peer = this.peers.get(peerId);
    if (peer) { peer.pc = pc; this.peers.set(peerId, peer); }

    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
    await pc.setLocalDescription(offer);

    this.broadcast({
      type: "offer",
      peerId: this.peerId,
      targetId: peerId,
      sdp: pc.localDescription!,
    });
  }

  // ── Answer (callee side) ──────────────────────────────────────────────────
  private async handleOffer(peerId: string, sdp: RTCSessionDescriptionInit) {
    if (!this.peers.has(peerId)) {
      this.peers.set(peerId, {
        peerId, name: "Connecting…", language: "en",
        stream: null, micOn: true, camOn: true, handRaised: false, pc: null,
      });
    }

    const pc = this.createPeerConnection(peerId);
    const peer = this.peers.get(peerId)!;
    peer.pc = pc;
    this.peers.set(peerId, peer);

    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.broadcast({
      type: "answer",
      peerId: this.peerId,
      targetId: peerId,
      sdp: pc.localDescription!,
    });
  }

  private async handleAnswer(peerId: string, sdp: RTCSessionDescriptionInit) {
    const peer = this.peers.get(peerId);
    if (!peer?.pc) return;
    if (peer.pc.signalingState !== "have-local-offer") return;
    await peer.pc.setRemoteDescription(new RTCSessionDescription(sdp));
  }

  private async handleIce(peerId: string, candidate: RTCIceCandidateInit) {
    const peer = this.peers.get(peerId);
    if (!peer?.pc) return;
    try {
      await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {
      // Ignore — may arrive before remote desc is set
    }
  }

  // ── Broadcast helpers ─────────────────────────────────────────────────────
  broadcast(msg: SignalMessage) {
    this.channel?.send({ type: "broadcast", event: "signal", payload: msg });
  }

  sendMuteState(mic: boolean, cam: boolean) {
    this.broadcast({ type: "mute", peerId: this.peerId, mic, cam });
  }

  sendHandRaise(raised: boolean) {
    this.broadcast({ type: "hand", peerId: this.peerId, raised });
  }

  sendChat(text: string, lang: string) {
    this.broadcast({ type: "chat", peerId: this.peerId, name: this.name, text, lang });
  }

  // ── Update local stream (e.g. after quality change) ───────────────────────
  updateLocalStream(newStream: MediaStream) {
    this.localStream = newStream;
    this.peers.forEach((peer) => {
      if (!peer.pc) return;
      const senders = peer.pc.getSenders();
      newStream.getTracks().forEach((track) => {
        const sender = senders.find((s) => s.track?.kind === track.kind);
        if (sender) sender.replaceTrack(track);
        else peer.pc!.addTrack(track, newStream);
      });
    });
  }

  // ── Clean up ──────────────────────────────────────────────────────────────
  private closePeer(peerId: string) {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    peer.pc?.close();
    peer.stream?.getTracks().forEach((t) => t.stop());
  }

  leave() {
    this.broadcast({ type: "leave", peerId: this.peerId });
    this.peers.forEach((_, id) => this.closePeer(id));
    this.peers.clear();
    this.channel?.unsubscribe();
    this.channel = null;
    this.notifyUpdate();
  }

  getPeers() { return new Map(this.peers); }

  private notifyUpdate() {
    this.onPeersUpdate(new Map(this.peers));
  }
}
