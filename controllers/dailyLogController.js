const DailyLog = require("../models/DailyLog");
const Client = require("../models/Client");
const { dateStringPKT } = require("../utils/pktTime");

// Clients are in Pakistan, so "today" for a daily log must be the PKT
// calendar date. toISOString() is always UTC, which rolls to the next
// date 5 hours before PKT does — a client logging between midnight and
// 5am PKT would have had their entry saved under yesterday's date key
// and then "disappear" once the day actually rolled over for them.
const todayString = () => dateStringPKT();

// @desc Client — get their own log for today
const getToday = async (req, res) => {
  try {
    const client = await Client.findOne({ user_ref: req.user._id });
    if (!client) return res.status(404).json({ message: "Client not found" });

    const log = await DailyLog.findOne({
      client_ref: client._id,
      date: todayString(),
    });
    res.json(log || { steps: 0, water_liters: 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Client — upsert today's steps/water entry
const setToday = async (req, res) => {
  const { steps, water_liters } = req.body;

  try {
    const client = await Client.findOne({ user_ref: req.user._id });
    if (!client) return res.status(404).json({ message: "Client not found" });

    const log = await DailyLog.findOneAndUpdate(
      { client_ref: client._id, date: todayString() },
      { steps, water_liters },
      { new: true, upsert: true, runValidators: true },
    );

    res.json(log);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Public — recent (last 3 days) individual client activity, for the homepage marquee
const getRecentActivity = async (req, res) => {
  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const cutoffString = threeDaysAgo.toISOString().split("T")[0];

    const logs = await DailyLog.find({ date: { $gte: cutoffString } })
      .populate("client_ref", "name")
      .sort({ date: -1, createdAt: -1 })
      .limit(30);

    const entries = logs
      .filter(
        (log) => log.client_ref && (log.steps > 0 || log.water_liters > 0),
      )
      .map((log) => ({
        name: log.client_ref.name,
        steps: log.steps,
        water_liters: log.water_liters,
      }));

    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getToday, setToday, getRecentActivity };
