export type CurrencyCode = "PKR" | "USD" | "GBP" | "EUR";

export interface CurrencyInfo {
  code: CurrencyCode;
  name: string;
  symbol: string;
  /** Number of decimal places commonly shown on menus. */
  decimals: number;
}

export const CURRENCIES: readonly CurrencyInfo[] = [
  { code: "PKR", name: "Pakistani Rupee", symbol: "Rs", decimals: 0 },
  { code: "USD", name: "US Dollar", symbol: "$", decimals: 2 },
  { code: "GBP", name: "British Pound", symbol: "£", decimals: 2 },
  { code: "EUR", name: "Euro", symbol: "€", decimals: 2 },
] as const;

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code) as [CurrencyCode, ...CurrencyCode[]];

/**
 * Format a numeric price for display. Prices are always stored as numbers and
 * formatted at render time, so translation never touches them.
 *
 * formatPrice(1250, "PKR") -> "Rs 1,250"
 * formatPrice(4.5, "USD")  -> "$4.50"
 */
export function formatPrice(amount: number, currency: CurrencyCode, locale = "en-US"): string {
  const info = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];
  // Show decimals when the amount actually has them, even for PKR (e.g. 12.50).
  const hasFraction = Math.abs(amount - Math.round(amount)) > 0.000001;
  const decimals = hasFraction ? 2 : info.decimals;
  const number = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
  return info.code === "PKR" ? `${info.symbol} ${number}` : `${info.symbol}${number}`;
}
