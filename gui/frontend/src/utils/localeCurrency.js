// Mapping of language/locale prefixes to ISO‑4217 currency codes
const localeCurrencyMap = {
  en: "USD",
  "en-us": "USD",
  "en-gb": "GBP",
  "en-ca": "CAD",
  es: "EUR",
  fr: "EUR",
  hi: "INR",
  "en-in": "INR",
  // Add more as needed
};

export function getCurrencyForLocale(locale = navigator.language) {
  try {
    const saved = localStorage.getItem('simplepay_app_settings');
    if (saved && saved !== 'undefined') {
      const parsed = JSON.parse(saved);
      if (parsed.currency) return parsed.currency;
    }
  } catch (e) {}

  const normalized = (locale || '').toLowerCase();
  if (localeCurrencyMap[normalized]) return localeCurrencyMap[normalized];
  const prefix = normalized.split('-')[0];
  return localeCurrencyMap[prefix] || "INR";
}
