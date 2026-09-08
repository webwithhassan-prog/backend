// ISO 3166 country code -> ISO 4217 currency code, covering essentially
// every country. India ("IN") is intentionally omitted — the site's base
// display currency is already INR, so no conversion hint is needed there.
const COUNTRY_TO_CURRENCY_CODE = {
  PK: "PKR", GB: "GBP", US: "USD", CA: "CAD", AU: "AUD", NZ: "NZD",
  AE: "AED", SA: "SAR", QA: "QAR", KW: "KWD", BH: "BHD", OM: "OMR",
  EU: "EUR", DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR",
  BE: "EUR", IE: "EUR", PT: "EUR", AT: "EUR", GR: "EUR", FI: "EUR",
  LU: "EUR", MT: "EUR", CY: "EUR", SK: "EUR", SI: "EUR", EE: "EUR",
  LV: "EUR", LT: "EUR", HR: "EUR",
  CH: "CHF", NO: "NOK", SE: "SEK", DK: "DKK", PL: "PLN", CZ: "CZK",
  HU: "HUF", RO: "RON", BG: "BGN", RU: "RUB", TR: "TRY", UA: "UAH",
  CN: "CNY", JP: "JPY", KR: "KRW", HK: "HKD", SG: "SGD", MY: "MYR",
  TH: "THB", ID: "IDR", PH: "PHP", VN: "VND", BD: "BDT", LK: "LKR",
  NP: "NPR", MM: "MMK", KH: "KHR",
  ZA: "ZAR", NG: "NGN", EG: "EGP", KE: "KES", GH: "GHS", MA: "MAD",
  TN: "TND", DZ: "DZD", ET: "ETB", TZ: "TZS", UG: "UGX",
  BR: "BRL", MX: "MXN", AR: "ARS", CL: "CLP", CO: "COP", PE: "PEN",
  IL: "ILS", JO: "JOD", LB: "LBP", IQ: "IQD", IR: "IRR", AF: "AFN",
  MV: "MVR", BT: "BTN",
};

const CURRENCY_SYMBOLS = {
  PKR: "₨", GBP: "£", USD: "$", CAD: "C$", AUD: "A$", NZD: "NZ$",
  EUR: "€", AED: "AED ", SAR: "SAR ", QAR: "QAR ", KWD: "KWD ",
  OMR: "OMR ", MYR: "RM ",
  JPY: "¥", CNY: "¥", KRW: "₩", HKD: "HK$", SGD: "S$", THB: "฿",
  ZAR: "R", BRL: "R$", TRY: "₺", RUB: "₽", CHF: "CHF ", NGN: "₦",
  IDR: "Rp", PHP: "₱", VND: "₫", BDT: "৳", LKR: "Rs ", NPR: "Rs ",
};

const getCurrencyForCountry = (countryCode) => {
  const currencyCode = COUNTRY_TO_CURRENCY_CODE[countryCode];
  if (!currencyCode) return null;
  return {
    code: currencyCode,
    symbol: CURRENCY_SYMBOLS[currencyCode] || `${currencyCode} `,
  };
};

module.exports = { getCurrencyForCountry, CURRENCY_SYMBOLS };
