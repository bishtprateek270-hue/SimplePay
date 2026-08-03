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
  const normalized = locale.toLowerCase();
  // Exact match first, then prefix match
  if (localeCurrencyMap[normalized]) return localeCurrencyMap[normalized];
  const prefix = normalized.split('-')[0];
  return localeCurrencyMap[prefix] || "USD"; // fallback
}
