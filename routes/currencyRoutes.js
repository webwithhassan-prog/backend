const express = require("express");
const router = express.Router();
const { detectLocalCurrency, getRates } = require("../controllers/currencyController");

router.get("/detect", detectLocalCurrency);
router.get("/rates", getRates);

module.exports = router;
