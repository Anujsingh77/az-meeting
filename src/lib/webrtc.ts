// WebRTC + Supabase Realtime Signaling
// Uses Supabase Realtime as the signaling channel for WebRTC peer connections.

import { createClient } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
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
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

export type SignalMessage =
  | { type: "join";   peerId: string; name: string; language: string }
  | { type: "leave";  peerId: string }
  | { type: "offer";  peerId: string; targetId: string; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; peerId: string; targetId: string; sdp: RTCSessionDescriptionInit }
  | { type: "ice";    peerId: string; targetId: string; candidate: RTCIceCandidateInit }
  | { type: "mute";   peerId: string; mic: boolean; cam: boolean }
  | { type: "hand";   peerId: string; raised: boolean }
  | { type: "chat";   peerId: string; name: string; text: string; lang: string };

export interface RemotePeer {
  peerId:     string;
  name:       string;
  language:   string;
  stream:     MediaStream | null;
  micOn:      boolean;
  camOn:      boolean;
  handRaised: boolean;
  pc:         RTCPeerConnection | null;
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
  private offeredTo = new Set<string>();
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();

  constructor(opts: {
    peerId: string; name: string; language: string; roomCode: string;
    onPeersUpdate: PeerUpdateFn; onChat: ChatFn;
  }) {
    this.peerId        = opts.peerId;
    this.name          = opts.name;
    this.language      = opts.language;
    this.roomCode      = opts.roomCode;
    this.onPeersUpdate = opts.onPeersUpdate;
    this.onChat        = opts.onChat;
  }

  async join(localStream: MediaStream) {
    this.localStream = localStream;
    const channelName = `room:${this.roomCode.replace(/[^A-Z0-9]/g, "")}`;

    this.channel = this.supabase.channel(channelName, {
      config: { broadcast: { self: false, ack: false } },
    });

    this.channel
      .on("broadcast", { event: "signal" }, ({ payload }: { payload: SignalMessage }) => {
        this.handleSignal(payload).catch(console.error);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Small delay to ensure channel is ready before announcing
          await new Promise((r) => setTimeout(r, 300));
          this.broadcast({ type: "join", peerId: this.peerId, name: this.name, language: this.language });
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("Realtime channel error:", status);
        }
      });
  }

  private async handleSignal(msg: SignalMessage) {
    switch (msg.type) {
      case "join": {
        if (msg.peerId === this.peerId) return;
        if (!this.peers.has(msg.peerId)) {
          this.peers.set(msg.peerId, {
            peerId: msg.peerId, name: msg.name, language: msg.language,
            stream: null, micOn: true, camOn: true, handRaised: false, pc: null,
          });
          this.notifyUpdate();
        }
        // Only the peer with the lexicographically larger ID initiates the offer
        // This prevents both sides offering simultaneously
        if (this.peerId > msg.peerId && !this.offeredTo.has(msg.peerId)) {
          this.offeredTo.add(msg.peerId);
          await this.createOffer(msg.peerId);
        } else if (this.peerId < msg.peerId) {
          // We are the lower-ID peer — we will receive an offer, do nothing
          // But if we don't get one in 3s, we send one ourselves
          setTimeout(async () => {
            const peer = this.peers.get(msg.peerId);
            if (peer && !peer.pc && !this.offeredTo.has(msg.peerId)) {
              this.offeredTo.add(msg.peerId);
              await this.createOffer(msg.peerId);
            }
          }, 3000);
        }
        break;
      }
      case "leave": {
        this.closePeer(msg.peerId);
        this.peers.delete(msg.peerId);
        this.offeredTo.delete(msg.peerId);
        this.pendingCandidates.delete(msg.peerId);
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

  private createPeerConnection(peerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, iceCandidatePoolSize: 10 });

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    pc.ontrack = (event) => {
      const peer = this.peers.get(peerId);
      if (!peer) return;
      if (!peer.stream) {
        peer.stream = new MediaStream();
      }
      // Only add the track if it's not already there
      const existingIds = peer.stream.getTracks().map((t) => t.id);
      if (!existingIds.includes(event.track.id)) {
        peer.stream.addTrack(event.track);
      }
      this.peers.set(peerId, peer);
      this.notifyUpdate();
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.broadcast({
          type: "ice", peerId: this.peerId, targetId: peerId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] ${peerId} connection state:`, pc.connectionState);
      if (pc.connectionState === "failed") {
        pc.restartIce();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ${peerId} ICE state:`, pc.iceConnectionState);
    };

    return pc;
  }

  private async createOffer(peerId: string) {
    const pc = this.createPeerConnection(peerId);
    const peer = this.peers.get(peerId);
    if (peer) { peer.pc = pc; this.peers.set(peerId, peer); }

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await pc.setLocalDescription(offer);

    this.broadcast({
      type: "offer", peerId: this.peerId, targetId: peerId,
      sdp: pc.localDescription!,
    });
  }

  private async handleOffer(peerId: string, sdp: RTCSessionDescriptionInit) {
    // Close any existing connection to this peer before creating a new one
    const existing = this.peers.get(peerId);
    if (existing?.pc) {
      existing.pc.close();
    }

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

    // Flush any pending ICE candidates
    const pending = this.pendingCandidates.get(peerId) ?? [];
    for (const c of pending) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
    this.pendingCandidates.delete(peerId);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.broadcast({
      type: "answer", peerId: this.peerId, targetId: peerId,
      sdp: pc.localDescription!,
    });
  }

  private async handleAnswer(peerId: string, sdp: RTCSessionDescriptionInit) {
    const peer = this.peers.get(peerId);
    if (!peer?.pc) return;
    if (peer.pc.signalingState !== "have-local-offer") return;
    await peer.pc.setRemoteDescription(new RTCSessionDescription(sdp));

    // Flush pending ICE
    const pending = this.pendingCandidates.get(peerId) ?? [];
    for (const c of pending) {
      try { await peer.pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
    this.pendingCandidates.delete(peerId);
  }

  private async handleIce(peerId: string, candidate: RTCIceCandidateInit) {
    const peer = this.peers.get(peerId);
    if (!peer?.pc) {
      // Queue it — the peer connection may not be ready yet
      if (!this.pendingCandidates.has(peerId)) {
        this.pendingCandidates.set(peerId, []);
      }
      this.pendingCandidates.get(peerId)!.push(candidate);
      return;
    }
    try {
      if (peer.pc.remoteDescription) {
        await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        // Queue if remote description not set yet
        if (!this.pendingCandidates.has(peerId)) {
          this.pendingCandidates.set(peerId, []);
        }
        this.pendingCandidates.get(peerId)!.push(candidate);
      }
    } catch (e) {
      console.warn("ICE candidate error:", e);
    }
  }

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
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.notifyUpdate();
  }

  getPeers() { return new Map(this.peers); }

  private notifyUpdate() {
    this.onPeersUpdate(new Map(this.peers));
  }
}
