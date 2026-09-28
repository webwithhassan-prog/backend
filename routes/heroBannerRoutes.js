const express = require("express");
const router = express.Router();
const { cachePublic } = require("../middleware/responseCache");
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const {
  getHeroBanners,
  createHeroBanner,
  updateHeroBanner,
  deleteHeroBanner,
} = require("../controllers/heroBannerController");

router.get("/public", cachePublic(), getHeroBanners);

router.get("/", protect, adminOnly, getHeroBanners);
router.post("/", protect, adminOnly, createHeroBanner);
router.put("/:id", protect, adminOnly, updateHeroBanner);
router.delete("/:id", protect, adminOnly, deleteHeroBanner);

module.exports = router;
