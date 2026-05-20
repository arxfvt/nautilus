const CURRENCY_DECIMALS: Record<string, number> = {
  UGX: 0, JPY: 0, KRW: 0, VND: 0, IDR: 0,
  USD: 2, EUR: 2, GBP: 2, KES: 2, TZS: 2,
};

export function getCurrencyDecimals(currency: string): number {
  return CURRENCY_DECIMALS[currency.toUpperCase()] ?? 2;
}

export function formatAmount(minorUnits: number, currency: string): string {
  const decimals = getCurrencyDecimals(currency);
  const value = minorUnits / Math.pow(10, decimals);
  try {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

export function toMinorUnits(amount: number, currency: string): number {
  const decimals = getCurrencyDecimals(currency);
  return Math.round(amount * Math.pow(10, decimals));
}

export function fromMinorUnits(minorUnits: number, currency: string): number {
  const decimals = getCurrencyDecimals(currency);
  return minorUnits / Math.pow(10, decimals);
}

export function convertAmount(
  minorUnits: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>
): number {
  if (fromCurrency === toCurrency) return minorUnits;
  const key = `${fromCurrency}:${toCurrency}`;
  const rate = rates[key];
  if (!rate) return minorUnits; // fallback 1:1, never crash
  return Math.round(minorUnits * rate);
}
