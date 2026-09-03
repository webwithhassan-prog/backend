require("dotenv").config();
const mongoose = require("mongoose");
const Trainer = require("./models/Trainer");
const Class = require("./models/Class");

// Workout type by day of week (Sunday defaults to the daily Cardio & Facial Yoga session)
const workoutByDay = {
  0: "Cardio & Facial Yoga", // Sunday
  1: "Yoga and Stretching", // Monday
  2: "Upper Body Strength Training", // Tuesday
  3: "Lower Body Strength Training", // Wednesday
  4: "Aerobics & Tabata", // Thursday
  5: "Abs & Belly", // Friday
  6: "Full Body Workout", // Saturday
};

// Trainer time slots — Pakistan local time (PKT = UTC+5, no DST)
const timeSlots = [
  { trainer: "Miss Nukhba", hour: 5, minute: 30 },
  { trainer: "Miss Arousa", hour: 6, minute: 30 },
  { trainer: "Miss Zaineb", hour: 8, minute: 0 },
  { trainer: "Miss Nukhba", hour: 10, minute: 0 },
  { trainer: "Miss Arousa", hour: 11, minute: 30 },
  { trainer: "Miss Arousa", hour: 15, minute: 0 },
  { trainer: "Miss Arousa", hour: 16, minute: 30 },
  { trainer: "Miss Yashi", hour: 17, minute: 30 },
  { trainer: "Miss Nukhba", hour: 19, minute: 0 },
  { trainer: "Miss Fatema", hour: 21, minute: 0 },
];

const pktToUtc = (year, month, day, hour, minute) => {
  // Pakistan is UTC+5 — build the UTC instant directly by subtracting 5 hours
  return new Date(Date.UTC(year, month, day, hour - 5, minute));
};

const seedTimetable = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB\n");

    // 1. Ensure trainers exist
    const trainerNames = [...new Set(timeSlots.map((s) => s.trainer))];
    const trainerMap = {};
    for (const name of trainerNames) {
      let trainer = await Trainer.findOne({ name });
      if (!trainer) {
        trainer = await Trainer.create({
          name,
          specialty: "General Fitness",
          schedule: [],
        });
        console.log(`Trainer created: ${name}`);
      }
      trainerMap[name] = trainer;
    }

    // 2. Create classes for the next 7 days
    const today = new Date();
    let created = 0;
    let skipped = 0;

    for (let i = 0; i < 7; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);
      const dayOfWeek = targetDate.getDay(); // 0 = Sunday
      const type = workoutByDay[dayOfWeek];

      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      const day = targetDate.getDate();

      for (const slot of timeSlots) {
        const datetime = pktToUtc(year, month, day, slot.hour, slot.minute);
        const trainer = trainerMap[slot.trainer];

        const exists = await Class.findOne({
          trainer_ref: trainer._id,
          datetime,
        });
        if (exists) {
          skipped++;
          continue;
        }

        await Class.create({
          trainer_ref: trainer._id,
          type,
          datetime,
        });
        created++;
      }
    }

    console.log(
      `\nDone. Created ${created} classes, skipped ${skipped} duplicates.`,
    );
    process.exit(0);
  } catch (err) {
    console.error("Error seeding timetable:", err.message);
    process.exit(1);
  }
};

seedTimetable();
