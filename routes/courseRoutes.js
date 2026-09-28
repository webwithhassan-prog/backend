const express = require("express");
const router = express.Router();
const { cachePublic } = require("../middleware/responseCache");
const { protect } = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const {
  getPublicCourses,
  getCourses,
  getClientCourses,
  createCourse,
  updateCourse,
  deleteCourse,
} = require("../controllers/courseController");

router.get("/public", cachePublic(), getPublicCourses);

router.get("/", protect, adminOnly, getCourses);
router.post("/", protect, adminOnly, createCourse);
router.put("/:id", protect, adminOnly, updateCourse);
router.delete("/:id", protect, adminOnly, deleteCourse);

router.get("/client/:clientId", protect, getClientCourses);

module.exports = router;
