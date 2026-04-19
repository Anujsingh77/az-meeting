"use client";

import { useCallback, useRef } from "react";

interface TranslateOptions {
  text: string;
  from: string;
  to: string;
}

interface TranslateResult {
  translated: string;
  detectedLanguage?: string;
}

const cache = new Map<string, string>();

export function useTranslation() {
  const pendingRef = useRef<Map<string, Promise<string>>>(new Map());

  const translate = useCallback(
    async ({ text, from, to }: TranslateOptions): Promise<TranslateResult> => {
      if (!text.trim() || from === to) return { translated: text };

      const cacheKey = `${from}:${to}:${text}`;
      if (cache.has(cacheKey)) return { translated: cache.get(cacheKey)! };

      if (pendingRef.current.has(cacheKey)) {
        const translated = await pendingRef.current.get(cacheKey)!;
        return { translated };
      }

      const promise = (async () => {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, from, to }),
        });
        if (!res.ok) return text;
        const data = await res.json();
        cache.set(cacheKey, data.translated);
        return data.translated as string;
      })();

      pendingRef.current.set(cacheKey, promise);
      const translated = await promise;
      pendingRef.current.delete(cacheKey);
      return { translated };
    },
    []
  );

  const translateBatch = useCallback(
    async (items: TranslateOptions[]): Promise<TranslateResult[]> => {
      return Promise.all(items.map(translate));
    },
    [translate]
  );

  return { translate, translateBatch };
}
