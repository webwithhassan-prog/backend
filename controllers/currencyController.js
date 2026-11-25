const { detectCountry } = require("../utils/geolocation");
const { getInrExchangeRates } = require("../utils/exchangeRates");
const { getCurrencyForCountry, CURRENCY_SYMBOLS } = require("../utils/currencyByCountry");
const { getOrCreateSettings } = require("./settingsController");
const { DEFAULT_CURRENCIES } = require("../models/Settings");

const symbolFor = (code) => (code === "INR" ? "₹" : CURRENCY_SYMBOLS[code] || `${code} `);

// The dropdown's currencies — the admin's list in Settings (Settings →
// Currencies), defaulting to the original 13.
const selectableCurrencies = async () => {
  const settings = await getOrCreateSettings();
  return settings.currencies?.length ? settings.currencies : DEFAULT_CURRENCIES;
};

// @desc Full INR-based rate table, for converting to whatever currency the
// user picks from the switcher (not just the ones we can auto-detect).
const getRates = async (req, res) => {
  try {
    const [rates, list] = await Promise.all([getInrExchangeRates(), selectableCurrencies()]);
    const currencies = list
      .map(({ code, label }) => ({
        code,
        label: label || "",
        symbol: symbolFor(code),
        rate: code === "INR" ? 1 : rates[code] || null,
      }))
      .filter((c) => c.rate !== null)
      .sort((a, b) => a.code.localeCompare(b.code));

    res.json({ base: "INR", currencies, rates });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Admin — the dropdown's currencies plus every code that can be added
const getCurrencySettings = async (req, res) => {
  try {
    const [rates, list] = await Promise.all([getInrExchangeRates(), selectableCurrencies()]);
    res.json({
      currencies: list.map(({ code, label }) => ({ code, label: label || "", symbol: symbolFor(code) })),
      available: Object.keys(rates).sort(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Admin — save the dropdown's currencies ([{ code, label }])
const updateCurrencySettings = async (req, res) => {
  const input = Array.isArray(req.body?.currencies) ? req.body.currencies : null;
  if (!input || input.length === 0) {
    return res.status(400).json({ message: "Keep at least one currency" });
  }
  try {
    const rates = await getInrExchangeRates();
    const seen = new Set();
    const currencies = [];
    for (const item of input) {
      const code = String(item?.code || "").trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(code) || (code !== "INR" && !rates[code])) {
        return res.status(400).json({ message: `${code || "That"} isn't a currency we have exchange rates for` });
      }
      if (seen.has(code)) continue;
      seen.add(code);
      currencies.push({ code, label: String(item.label || "").trim().slice(0, 60) });
    }
    if (!seen.has("INR")) {
      // Prices are stored in rupees; INR must stay available.
      currencies.push({ code: "INR", label: "India" });
    }
    const settings = await getOrCreateSettings();
    settings.currencies = currencies;
    await settings.save();
    res.json({ currencies: currencies.map((c) => ({ ...c, symbol: symbolFor(c.code) })) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Detect the visitor's country from IP and, if it's one where showing
// a local-currency estimate helps (i.e. not India — the site's base
// currency is already INR), return a live INR conversion rate.
const detectLocalCurrency = async (req, res) => {
  try {
    const { country, country_code, source } = await detectCountry(req, {
      timeZone: req.query.tz,
    });
    const localCurrency = country_code ? getCurrencyForCountry(country_code) : null;

    if (!localCurrency) {
      return res.json({ country, country_code, source, show_conversion: false });
    }

    const rates = await getInrExchangeRates();
    const rate = rates[localCurrency.code];

    if (!rate) {
      return res.json({ country, country_code, source, show_conversion: false });
    }

    res.json({
      country,
      country_code,
      source,
      show_conversion: true,
      currency_code: localCurrency.code,
      symbol: localCurrency.symbol,
      rate,
    });
  } catch (err) {
    res.json({ show_conversion: false });
  }
};

module.exports = { detectLocalCurrency, getRates, getCurrencySettings, updateCurrencySettings };
