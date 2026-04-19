import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, ChatMessage, Participant } from "@/types";

interface AppState {
  // User
  user: User | null;
  setUser: (user: User | null) => void;

  // Meeting
  activeMeetingId: string | null;
  activeMeetingCode: string | null;
  setActiveMeeting: (id: string | null, code: string | null) => void;

  // Devices
  micEnabled: boolean;
  cameraEnabled: boolean;
  speakerEnabled: boolean;
  setMicEnabled: (v: boolean) => void;
  setCameraEnabled: (v: boolean) => void;
  setSpeakerEnabled: (v: boolean) => void;
  toggleMic: () => void;
  toggleCamera: () => void;

  // Translation
  speakLanguage: string;
  hearLanguage: string;
  aiDubbingEnabled: boolean;
  captionsEnabled: boolean;
  showOriginal: boolean;
  autoDetect: boolean;
  noiseCancellation: boolean;
  translationEngine: string;
  setSpeakLanguage: (v: string) => void;
  setHearLanguage: (v: string) => void;
  setAiDubbingEnabled: (v: boolean) => void;
  setCaptionsEnabled: (v: boolean) => void;
  setShowOriginal: (v: boolean) => void;
  setAutoDetect: (v: boolean) => void;
  setNoiseCancellation: (v: boolean) => void;
  setTranslationEngine: (v: string) => void;

  // Video
  videoQuality: string;
  virtualBackground: string;
  cameraFilter: string;
  skinTouchup: boolean;
  autoLighting: boolean;
  hdRecording: boolean;
  setVideoQuality: (v: string) => void;
  setVirtualBackground: (v: string) => void;
  setCameraFilter: (v: string) => void;
  setSkinTouchup: (v: boolean) => void;
  setAutoLighting: (v: boolean) => void;
  setHdRecording: (v: boolean) => void;

  // Chat
  chatMessages: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;

  // Participants
  participants: Participant[];
  setParticipants: (p: Participant[]) => void;

  // UI
  rightPanelTab: "translate" | "video" | "chat" | "people";
  setRightPanelTab: (v: "translate" | "video" | "chat" | "people") => void;
  isHandRaised: boolean;
  setHandRaised: (v: boolean) => void;
  isScreenSharing: boolean;
  setScreenSharing: (v: boolean) => void;
  isRecording: boolean;
  setRecording: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // User
      user: null,
      setUser: (user) => set({ user }),

      // Meeting
      activeMeetingId: null,
      activeMeetingCode: null,
      setActiveMeeting: (id, code) =>
        set({ activeMeetingId: id, activeMeetingCode: code }),

      // Devices
      micEnabled: true,
      cameraEnabled: true,
      speakerEnabled: true,
      setMicEnabled: (v) => set({ micEnabled: v }),
      setCameraEnabled: (v) => set({ cameraEnabled: v }),
      setSpeakerEnabled: (v) => set({ speakerEnabled: v }),
      toggleMic: () => set((s) => ({ micEnabled: !s.micEnabled })),
      toggleCamera: () => set((s) => ({ cameraEnabled: !s.cameraEnabled })),

      // Translation
      speakLanguage: "en",
      hearLanguage: "en",
      aiDubbingEnabled: true,
      captionsEnabled: true,
      showOriginal: true,
      autoDetect: true,
      noiseCancellation: true,
      translationEngine: "az-ai",
      setSpeakLanguage: (v) => set({ speakLanguage: v }),
      setHearLanguage: (v) => set({ hearLanguage: v }),
      setAiDubbingEnabled: (v) => set({ aiDubbingEnabled: v }),
      setCaptionsEnabled: (v) => set({ captionsEnabled: v }),
      setShowOriginal: (v) => set({ showOriginal: v }),
      setAutoDetect: (v) => set({ autoDetect: v }),
      setNoiseCancellation: (v) => set({ noiseCancellation: v }),
      setTranslationEngine: (v) => set({ translationEngine: v }),

      // Video
      videoQuality: "720p",
      virtualBackground: "none",
      cameraFilter: "none",
      skinTouchup: true,
      autoLighting: true,
      hdRecording: false,
      setVideoQuality: (v) => set({ videoQuality: v }),
      setVirtualBackground: (v) => set({ virtualBackground: v }),
      setCameraFilter: (v) => set({ cameraFilter: v }),
      setSkinTouchup: (v) => set({ skinTouchup: v }),
      setAutoLighting: (v) => set({ autoLighting: v }),
      setHdRecording: (v) => set({ hdRecording: v }),

      // Chat
      chatMessages: [],
      addChatMessage: (msg) =>
        set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
      clearChat: () => set({ chatMessages: [] }),

      // Participants
      participants: [],
      setParticipants: (p) => set({ participants: p }),

      // UI
      rightPanelTab: "translate",
      setRightPanelTab: (v) => set({ rightPanelTab: v }),
      isHandRaised: false,
      setHandRaised: (v) => set({ isHandRaised: v }),
      isScreenSharing: false,
      setScreenSharing: (v) => set({ isScreenSharing: v }),
      isRecording: false,
      setRecording: (v) => set({ isRecording: v }),
    }),
    {
      name: "az-meeting-store",
      partialize: (state) => ({
        speakLanguage: state.speakLanguage,
        hearLanguage: state.hearLanguage,
        videoQuality: state.videoQuality,
        aiDubbingEnabled: state.aiDubbingEnabled,
        captionsEnabled: state.captionsEnabled,
        noiseCancellation: state.noiseCancellation,
      }),
    }
  )
);
