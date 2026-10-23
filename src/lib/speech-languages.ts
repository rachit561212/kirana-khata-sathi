/**
 * Languages the shopkeeper can pick as a hint for voice entry.
 * "auto" means: no hint — the transcription model detects the spoken language itself,
 * so anything the shopkeeper speaks is read, not just the languages listed here.
 */
export const AUTO_LANGUAGE = "auto";

export type SpeechLanguage = { code: string; native: string; english: string };

export const INDIAN_LANGUAGES: SpeechLanguage[] = [
  { code: "hi-IN", native: "हिन्दी", english: "Hindi" },
  { code: "en-IN", native: "English (India)", english: "English" },
  { code: "bn-IN", native: "বাংলা", english: "Bengali" },
  { code: "te-IN", native: "తెలుగు", english: "Telugu" },
  { code: "mr-IN", native: "मराठी", english: "Marathi" },
  { code: "ta-IN", native: "தமிழ்", english: "Tamil" },
  { code: "gu-IN", native: "ગુજરાતી", english: "Gujarati" },
  { code: "ur-IN", native: "اردو", english: "Urdu" },
  { code: "kn-IN", native: "ಕನ್ನಡ", english: "Kannada" },
  { code: "ml-IN", native: "മലയാളം", english: "Malayalam" },
  { code: "pa-IN", native: "ਪੰਜਾਬੀ", english: "Punjabi" },
  { code: "or-IN", native: "ଓଡ଼ିଆ", english: "Odia" },
  { code: "as-IN", native: "অসমীয়া", english: "Assamese" },
  { code: "mai-IN", native: "मैथिली", english: "Maithili" },
  { code: "sa-IN", native: "संस्कृतम्", english: "Sanskrit" },
  { code: "ne-IN", native: "नेपाली", english: "Nepali" },
  { code: "sd-IN", native: "سنڌي", english: "Sindhi" },
  { code: "ks-IN", native: "کٲشُر", english: "Kashmiri" },
  { code: "kok-IN", native: "कोंकणी", english: "Konkani" },
  { code: "mni-IN", native: "ꯃꯤꯇꯩꯂꯣꯟ", english: "Manipuri" },
  { code: "brx-IN", native: "बड़ो", english: "Bodo" },
  { code: "doi-IN", native: "डोगरी", english: "Dogri" },
  { code: "sat-IN", native: "ᱥᱟᱱᱛᱟᱲᱤ", english: "Santali" },
];

export const WORLD_LANGUAGES: SpeechLanguage[] = [
  { code: "en-US", native: "English", english: "English (US)" },
  { code: "es-ES", native: "Español", english: "Spanish" },
  { code: "fr-FR", native: "Français", english: "French" },
  { code: "pt-BR", native: "Português", english: "Portuguese" },
  { code: "de-DE", native: "Deutsch", english: "German" },
  { code: "it-IT", native: "Italiano", english: "Italian" },
  { code: "nl-NL", native: "Nederlands", english: "Dutch" },
  { code: "ar-SA", native: "العربية", english: "Arabic" },
  { code: "fa-IR", native: "فارسی", english: "Persian" },
  { code: "tr-TR", native: "Türkçe", english: "Turkish" },
  { code: "id-ID", native: "Bahasa Indonesia", english: "Indonesian" },
  { code: "ms-MY", native: "Bahasa Melayu", english: "Malay" },
  { code: "vi-VN", native: "Tiếng Việt", english: "Vietnamese" },
  { code: "th-TH", native: "ไทย", english: "Thai" },
  { code: "fil-PH", native: "Filipino", english: "Filipino" },
  { code: "ja-JP", native: "日本語", english: "Japanese" },
  { code: "ko-KR", native: "한국어", english: "Korean" },
  { code: "zh-CN", native: "中文", english: "Chinese" },
  { code: "ru-RU", native: "Русский", english: "Russian" },
  { code: "pl-PL", native: "Polski", english: "Polish" },
  { code: "uk-UA", native: "Українська", english: "Ukrainian" },
  { code: "sw-KE", native: "Kiswahili", english: "Swahili" },
  { code: "ha-NG", native: "Hausa", english: "Hausa" },
  { code: "yo-NG", native: "Yorùbá", english: "Yoruba" },
  { code: "am-ET", native: "አማርኛ", english: "Amharic" },
  { code: "he-IL", native: "עברית", english: "Hebrew" },
  { code: "hi-Latn-IN", native: "Hinglish", english: "Hinglish (mixed)" },
];

export const ALL_LANGUAGES = [...INDIAN_LANGUAGES, ...WORLD_LANGUAGES];

/** Plain-language label for whichever language is currently picked. */
export function languageLabel(code: string) {
  if (code === AUTO_LANGUAGE) return "Any language — I’ll listen and work it out";
  const hit = ALL_LANGUAGES.find((l) => l.code === code);
  return hit ? `${hit.native} · ${hit.english}` : code;
}
