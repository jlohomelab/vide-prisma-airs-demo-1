import { createContext, useContext, useState, type ReactNode } from "react";
import { TRANSLATIONS, type TranslationKey } from "../i18n/translations";

export type Lang = "en" | "zh-TW" | "zh-CN";

export const LANG_LABELS: Record<Lang, string> = {
  "en": "Eng",
  "zh-TW": "繁中",
  "zh-CN": "简中",
};

export const LANGS: Lang[] = ["en", "zh-TW", "zh-CN"];

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  t: (key) => key as string,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem("app-language");
    if (stored === "zh-TW" || stored === "zh-CN") return stored;
    return "en";
  });

  const setLang = (l: Lang) => {
    localStorage.setItem("app-language", l);
    setLangState(l);
  };

  const t = (key: TranslationKey, vars?: Record<string, string | number>): string => {
    const langMap = TRANSLATIONS[lang];
    const enMap = TRANSLATIONS.en;
    let str: string = langMap[key] ?? enMap[key] ?? (key as string);
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{${k}}`, String(v));
      }
    }
    return str;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
