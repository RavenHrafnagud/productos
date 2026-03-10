/**
 * Lista de monedas para selects de UI.
 * Usa soporte nativo de Intl para aproximar monedas globales ISO-4217.
 */
export interface CurrencyOption {
  code: string;
  label: string;
}

const FALLBACK_CODES = [
  'COP',
  'USD',
  'EUR',
  'MXN',
  'BRL',
  'ARS',
  'CLP',
  'PEN',
  'GBP',
  'JPY',
  'CNY',
  'KRW',
  'CAD',
  'AUD',
  'CHF',
  'INR',
  'TRY',
  'ZAR',
  'NZD',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
];

function getSupportedCurrencyCodes(): string[] {
  const intlWithSupportedValues = Intl as Intl.DateTimeFormatOptions & {
    supportedValuesOf?: (key: string) => string[];
  };
  if (typeof intlWithSupportedValues.supportedValuesOf === 'function') {
    return intlWithSupportedValues.supportedValuesOf('currency').map((code) => code.toUpperCase());
  }
  return FALLBACK_CODES;
}

function resolveCurrencyName(code: string, locale: string) {
  try {
    const displayNames = new Intl.DisplayNames([locale], { type: 'currency' });
    const name = displayNames.of(code);
    return name ?? code;
  } catch {
    return code;
  }
}

export function getWorldCurrencyOptions(locale = 'es') {
  const codes = Array.from(new Set(getSupportedCurrencyCodes())).sort((a, b) => a.localeCompare(b));
  return codes.map((code) => ({
    code,
    label: `${code} - ${resolveCurrencyName(code, locale)}`,
  })) as CurrencyOption[];
}
