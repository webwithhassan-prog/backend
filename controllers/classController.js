const Class = require('../models/Class');
const Trainer = require('../models/Trainer');
const { createZoomMeeting } = require('../services/zoomService');

// @desc Get all classes (public — limited fields). Defaults to upcoming-only
// (used by the public "Join Class" picker, which shouldn't offer classes
// that have already happened). Pass ?scope=today to also include classes
// already conducted earlier today (used by the client dashboard, which
// shows the full day's schedule with past slots marked "Class Done").
const getPublicClasses = async (req, res) => {
  try {
    let fromDate = new Date();
    if (req.query.scope === 'today') {
      fromDate = new Date();
      fromDate.setHours(0, 0, 0, 0);
    }
    const classes = await Class.find({ datetime: { $gte: fromDate } })
      .populate('trainer_ref', 'name')
      .select('type datetime trainer_ref status cancel_reason');
    res.json(classes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Get classes (Timetable) — optionally narrowed to a date range via
// ?from=&to= (ISO dates) so the admin view doesn't have to pull the whole,
// ever-growing history just to show today/tomorrow
const getClasses = async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = {};
    if (from || to) {
      filter.datetime = {};
      if (from) filter.datetime.$gte = new Date(from);
      if (to) filter.datetime.$lte = new Date(to);
    }
    const classes = await Class.find(filter).populate('trainer_ref', 'name specialty');
    res.json(classes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Create a class slot — auto-creates a Zoom meeting
const createClass = async (req, res) => {
  try {
    const { trainer_ref, type, datetime, capacity } = req.body;

    const trainer = await Trainer.findById(trainer_ref);
    if (!trainer) return res.status(404).json({ message: 'Trainer not found' });

    let zoom_meeting_id = null;
    let zoom_join_url = null;

    try {
      const zoomMeeting = await createZoomMeeting({
        topic: `${type} with ${trainer.name}`,
        startTime: new Date(datetime).toISOString(),
        duration: 60,
      });
      zoom_meeting_id = zoomMeeting.meeting_id;
      zoom_join_url = zoomMeeting.join_url;
    } catch (zoomErr) {
      console.error('Zoom meeting creation failed:', zoomErr.message);
    }

    const newClass = await Class.create({
      trainer_ref,
      type,
      datetime,
      capacity,
      zoom_meeting_id,
      zoom_join_url,
    });

    res.status(201).json(newClass);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Update a class slot
const updateClass = async (req, res) => {
  try {
    const updated = await Class.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: 'Class not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Delete a class slot
const deleteClass = async (req, res) => {
  try {
    const deleted = await Class.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Class not found' });
    res.json({ message: 'Class removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Cancel a single class occurrence, with a reason
const cancelClass = async (req, res) => {
  const { reason } = req.body;

  try {
    const updated = await Class.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled', cancel_reason: reason },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Class not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Restore a cancelled class occurrence
const restoreClass = async (req, res) => {
  try {
    const updated = await Class.findByIdAndUpdate(
      req.params.id,
      { status: 'scheduled', cancel_reason: null },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Class not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getPublicClasses,
  getClasses,
  createClass,
  updateClass,
  deleteClass,
  cancelClass,
  restoreClass,
};