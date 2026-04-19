import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { customAlphabet } from "nanoid";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const nanoid = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

export function generateMeetingCode(): string {
  const id = nanoid();
  return `${id.slice(0, 3)}-${id.slice(3, 6)}-${id.slice(6)}`;
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function avatarColor(str: string): string {
  const colors = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-500",
    "from-green-500 to-emerald-500",
    "from-orange-500 to-amber-500",
    "from-red-500 to-pink-500",
    "from-indigo-500 to-blue-500",
    "from-teal-500 to-green-500",
    "from-yellow-500 to-orange-500",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function flagForCode(code: string): string {
  const flags: Record<string, string> = {
    en: "🇬🇧",
    hi: "🇮🇳",
    es: "🇪🇸",
    ja: "🇯🇵",
    ar: "🇸🇦",
    fr: "🇫🇷",
    de: "🇩🇪",
    zh: "🇨🇳",
    pt: "🇧🇷",
    ru: "🇷🇺",
    ko: "🇰🇷",
    it: "🇮🇹",
    nl: "🇳🇱",
    tr: "🇹🇷",
    pl: "🇵🇱",
  };
  return flags[code] ?? "🌐";
}
