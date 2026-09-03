require('dotenv').config();
const mongoose = require('mongoose');
const Trainer = require('./models/Trainer');
const DayPlan = require('./models/DayPlan');
const TimeSlot = require('./models/TimeSlot');

// Workout type by day of week (0 = Sunday ... 6 = Saturday)
const dayPlansToSeed = [
  { day_of_week: 0, type: 'Cardio & Facial Yoga' }, // Sunday
  { day_of_week: 1, type: 'Yoga and Stretching' }, // Monday
  { day_of_week: 2, type: 'Upper Body Strength Training' }, // Tuesday
  { day_of_week: 3, type: 'Lower Body Strength Training' }, // Wednesday
  { day_of_week: 4, type: 'Aerobics & Tabata' }, // Thursday
  { day_of_week: 5, type: 'Abs & Belly' }, // Friday
  { day_of_week: 6, type: 'Full Body Workout' }, // Saturday
];

// Trainer time slots — Pakistan local time (24-hour)
const timeSlotsToSeed = [
  { trainer: 'Miss Nukhba', hour: 5, minute: 30 },
  { trainer: 'Miss Arousa', hour: 6, minute: 30 },
  { trainer: 'Miss Zaineb', hour: 8, minute: 0 },
  { trainer: 'Miss Nukhba', hour: 10, minute: 0 },
  { trainer: 'Miss Arousa', hour: 11, minute: 30 },
  { trainer: 'Miss Arousa', hour: 15, minute: 0 },
  { trainer: 'Miss Arousa', hour: 16, minute: 30 },
  { trainer: 'Miss Yashi', hour: 17, minute: 30 },
  { trainer: 'Miss Nukhba', hour: 19, minute: 0 },
  { trainer: 'Miss Fatema', hour: 21, minute: 0 },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    // 1. Day plans (upsert so re-running is safe)
    for (const plan of dayPlansToSeed) {
      await DayPlan.findOneAndUpdate(
        { day_of_week: plan.day_of_week },
        { type: plan.type },
        { upsert: true, new: true }
      );
      console.log(`Day plan set: day ${plan.day_of_week} -> ${plan.type}`);
    }

    // 2. Ensure trainers exist
    const trainerNames = [...new Set(timeSlotsToSeed.map((s) => s.trainer))];
    const trainerMap = {};
    for (const name of trainerNames) {
      let trainer = await Trainer.findOne({ name });
      if (!trainer) {
        trainer = await Trainer.create({ name, specialty: 'General Fitness', schedule: [] });
        console.log(`Trainer created: ${name}`);
      }
      trainerMap[name] = trainer;
    }

    // 3. Time slots (skip if an identical one already exists)
    let created = 0;
    let skipped = 0;
    for (const slot of timeSlotsToSeed) {
      const trainer = trainerMap[slot.trainer];
      const exists = await TimeSlot.findOne({
        trainer_ref: trainer._id,
        hour: slot.hour,
        minute: slot.minute,
      });
      if (exists) {
        skipped++;
        continue;
      }
      await TimeSlot.create({
        trainer_ref: trainer._id,
        hour: slot.hour,
        minute: slot.minute,
      });
      created++;
    }

    console.log(`\nTime slots: ${created} created, ${skipped} already existed.`);
    console.log('\nDone. Go to Admin > Timetable and click "Regenerate Schedule" to generate the next 7 days of classes from this plan.');

    process.exit(0);
  } catch (err) {
    console.error('Error seeding:', err.message);
    process.exit(1);
  }
};

seed();