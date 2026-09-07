const { lookupCountryFromIp } = require("../utils/geolocation");
const { getInrExchangeRates } = require("../utils/exchangeRates");
const { getCurrencyForCountry, CURRENCY_SYMBOLS } = require("../utils/currencyByCountry");

// A curated list for the manual currency-switcher dropdown — the full rate
// table underneath supports far more, but a picker only needs the ones
// clients actually ask for.
const SELECTABLE_CURRENCIES = [
  "INR", "PKR", "USD", "GBP", "EUR", "AED", "SAR", "AUD", "CAD",
];

// @desc Full INR-based rate table, for converting to whatever currency the
// user picks from the switcher (not just the ones we can auto-detect).
const getRates = async (req, res) => {
  try {
    const rates = await getInrExchangeRates();
    const currencies = SELECTABLE_CURRENCIES.map((code) => ({
      code,
      symbol: code === "INR" ? "₹" : CURRENCY_SYMBOLS[code] || `${code} `,
      rate: code === "INR" ? 1 : rates[code] || null,
    })).filter((c) => c.rate !== null);

    res.json({ base: "INR", currencies, rates });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Detect the visitor's country from IP and, if it's one where showing
// a local-currency estimate helps (i.e. not India — the site's base
// currency is already INR), return a live INR conversion rate.
const detectLocalCurrency = async (req, res) => {
  try {
    const { country, country_code } = await lookupCountryFromIp(req.ip);
    const localCurrency = country_code ? getCurrencyForCountry(country_code) : null;

    if (!localCurrency) {
      return res.json({ country, country_code, show_conversion: false });
    }

    const rates = await getInrExchangeRates();
    const rate = rates[localCurrency.code];

    if (!rate) {
      return res.json({ country, country_code, show_conversion: false });
    }

    res.json({
      country,
      country_code,
      show_conversion: true,
      currency_code: localCurrency.code,
      symbol: localCurrency.symbol,
      rate,
    });
  } catch (err) {
    res.json({ show_conversion: false });
  }
};

module.exports = { detectLocalCurrency, getRates };
