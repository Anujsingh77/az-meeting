export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  native_language: string;
  preferred_language: string;
  languages: string[];
  plan: "free" | "pro" | "enterprise";
  total_meetings: number;
  total_minutes: number;
  total_words_translated: number;
}

export interface Meeting {
  id: string;
  code: string;
  title: string;
  host_id: string;
  scheduled_at: string | null;
  duration_minutes: number | null;
  languages: string[];
  status: "scheduled" | "active" | "ended";
  recording_url: string | null;
  summary: string | null;
  created_at: string;
  participant_count?: number;
}

export interface Participant {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  language: string;
  is_speaking: boolean;
  is_muted: boolean;
  camera_on: boolean;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  text: string;
  translated_text?: string;
  original_language: string;
  timestamp: Date;
}

export interface FeedbackItem {
  id: string;
  user_id: string | null;
  type: "feature" | "bug" | "translation" | "general";
  rating: number | null;
  message: string;
  tags: string[];
  anonymous: boolean;
  status: "open" | "reviewing" | "planned" | "resolved";
  created_at: string;
  author_name?: string;
}

export const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "hi", label: "Hindi", flag: "🇮🇳" },
  { code: "es", label: "Spanish", flag: "🇪🇸" },
  { code: "ja", label: "Japanese", flag: "🇯🇵" },
  { code: "ar", label: "Arabic", flag: "🇸🇦" },
  { code: "fr", label: "French", flag: "🇫🇷" },
  { code: "de", label: "German", flag: "🇩🇪" },
  { code: "zh", label: "Chinese", flag: "🇨🇳" },
  { code: "pt", label: "Portuguese", flag: "🇧🇷" },
  { code: "ru", label: "Russian", flag: "🇷🇺" },
  { code: "ko", label: "Korean", flag: "🇰🇷" },
  { code: "it", label: "Italian", flag: "🇮🇹" },
  { code: "nl", label: "Dutch", flag: "🇳🇱" },
  { code: "tr", label: "Turkish", flag: "🇹🇷" },
  { code: "pl", label: "Polish", flag: "🇵🇱" },
  { code: "sv", label: "Swedish", flag: "🇸🇪" },
  { code: "da", label: "Danish", flag: "🇩🇰" },
  { code: "fi", label: "Finnish", flag: "🇫🇮" },
  { code: "no", label: "Norwegian", flag: "🇳🇴" },
  { code: "th", label: "Thai", flag: "🇹🇭" },
  { code: "vi", label: "Vietnamese", flag: "🇻🇳" },
  { code: "id", label: "Indonesian", flag: "🇮🇩" },
  { code: "ms", label: "Malay", flag: "🇲🇾" },
  { code: "bn", label: "Bengali", flag: "🇧🇩" },
  { code: "ta", label: "Tamil", flag: "🇮🇳" },
  { code: "te", label: "Telugu", flag: "🇮🇳" },
  { code: "mr", label: "Marathi", flag: "🇮🇳" },
  { code: "ur", label: "Urdu", flag: "🇵🇰" },
  { code: "fa", label: "Persian", flag: "🇮🇷" },
  { code: "uk", label: "Ukrainian", flag: "🇺🇦" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];
