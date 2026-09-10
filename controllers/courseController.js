const Course = require("../models/Course");
const Client = require("../models/Client");

// @desc Public list — title/description/price/lesson count only. Video
// links stay hidden until the course is actually purchased.
const getPublicCourses = async (req, res) => {
  try {
    const courses = await Course.find();
    res.json(
      courses.map((c) => ({
        _id: c._id,
        title: c.title,
        description: c.description,
        price: c.price,
        banner_url: c.banner_url,
        lesson_count: c.lessons.length,
      })),
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Get all courses, full detail (admin)
const getCourses = async (req, res) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Full lesson detail (video links included) for every course a
// client actually owns — used by the client dashboard's "My Courses"
const getClientCourses = async (req, res) => {
  try {
    const client = await Client.findById(req.params.clientId);
    if (!client) return res.status(404).json({ message: "Client not found" });

    const courses = await Course.find({
      _id: { $in: client.purchased_courses },
    });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Create a course
const createCourse = async (req, res) => {
  try {
    const course = await Course.create(req.body);
    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Update a course (including its lesson list)
const updateCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Delete a course
const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json({ message: "Course removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getPublicCourses,
  getCourses,
  getClientCourses,
  createCourse,
  updateCourse,
  deleteCourse,
};
