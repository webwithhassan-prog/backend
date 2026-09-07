require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Client = require("./models/Client");
const Trainer = require("./models/Trainer");
const Consultant = require("./models/Consultant");
const Plan = require("./models/Plan");
const PremiumAddon = require("./models/PremiumAddon");
const Class = require("./models/Class");
const EBook = require("./models/EBook");
const RecordedContent = require("./models/RecordedContent");

const seedAll = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB\n");

    // 1. Admin
    let adminUser = await User.findOne({ email: "admin@fitnesszone.com" });
    if (!adminUser) {
      adminUser = await User.create({
        email: "admin@fitnesszone.com",
        password: "admin12345",
        role: "admin",
      });
      console.log("Admin created: admin@fitnesszone.com / admin12345");
    } else {
      console.log("Admin already exists: admin@fitnesszone.com");
    }

    // 2. Test client
    let clientUser = await User.findOne({ email: "client@fitnesszone.com" });
    let client;
    if (!clientUser) {
      clientUser = await User.create({
        email: "client@fitnesszone.com",
        password: "client12345",
        role: "client",
      });
      client = await Client.create({
        user_ref: clientUser._id,
        name: "Test Client",
        phone_number: "03000000000",
        status: "expired",
        days_remaining: 0,
      });
      console.log("Client created: client@fitnesszone.com / client12345");
    } else {
      client = await Client.findOne({ user_ref: clientUser._id });
      console.log("Client already exists: client@fitnesszone.com");
    }

    // 3. Trainers
    const trainerNames = ["Sara Khan", "Mahnoor Ali"];
    const trainers = [];
    for (const name of trainerNames) {
      let trainer = await Trainer.findOne({ name });
      if (!trainer) {
        trainer = await Trainer.create({
          name,
          specialty: "Yoga & Strength",
          schedule: [{ day: "Mon", start_time: "18:00", end_time: "19:00" }],
        });
        console.log(`Trainer created: ${name}`);
      }
      trainers.push(trainer);
    }

    // 4. Consultants (one per specialty)
    const consultantData = [
      { name: "Dr. Ayesha Raza", specialty: "dietician" },
      { name: "Dr. Hina Farooq", specialty: "gynecologist" },
      { name: "Dr. Bilal Ahmed", specialty: "psychiatrist" },
    ];
    for (const c of consultantData) {
      const exists = await Consultant.findOne({ name: c.name });
      if (!exists) {
        await Consultant.create(c);
        console.log(`Consultant created: ${c.name} (${c.specialty})`);
      }
    }

    // 5. Plans (6: dietplan/workout x 30/90/180)
    const plansToSeed = [
      {
        product_type: "dietplan",
        duration_days: 30,
        price: 700,
        diet_plans_included: 2,
      },
      {
        product_type: "dietplan",
        duration_days: 90,
        price: 1500,
        diet_plans_included: 6,
      },
      {
        product_type: "dietplan",
        duration_days: 180,
        price: 2500,
        diet_plans_included: 12,
      },
      {
        product_type: "workout",
        duration_days: 30,
        price: 800,
        diet_plans_included: null,
      },
      {
        product_type: "workout",
        duration_days: 90,
        price: 2000,
        diet_plans_included: null,
      },
      {
        product_type: "workout",
        duration_days: 180,
        price: 3000,
        diet_plans_included: null,
      },
    ];
    for (const p of plansToSeed) {
      const exists = await Plan.findOne({
        product_type: p.product_type,
        duration_days: p.duration_days,
      });
      if (!exists) {
        await Plan.create(p);
        console.log(
          `Plan created: ${p.product_type} - ${p.duration_days} days - ₹${p.price}`,
        );
      }
    }

    // 6. Premium add-on
    let addon = await PremiumAddon.findOne();
    if (!addon) {
      addon = await PremiumAddon.create({
        name: "Premium Consultation Add-on",
        price: 1000,
        sessions_included: 1,
      });
      console.log("Premium add-on created: ₹1000");
    }

    // 7. Classes (Timetable) — a few upcoming ones
    const now = new Date();
    const classTimes = [
      { type: "Yoga", daysFromNow: 1, hour: 18 },
      { type: "HIIT", daysFromNow: 2, hour: 19 },
      { type: "Strength Training", daysFromNow: 3, hour: 17 },
    ];
    for (const c of classTimes) {
      const datetime = new Date(now);
      datetime.setDate(datetime.getDate() + c.daysFromNow);
      datetime.setHours(c.hour, 0, 0, 0);

      const exists = await Class.findOne({ type: c.type, datetime });
      if (!exists) {
        await Class.create({
          trainer_ref: trainers[0]._id,
          type: c.type,
          datetime,
          capacity: 15,
          // zoom_meeting_id / zoom_join_url left empty — will populate once Zoom API creds are live
        });
        console.log(`Class created: ${c.type} on ${datetime.toDateString()}`);
      }
    }

    // 8. E-books
    const ebooksToSeed = [
      {
        title: "30-Day Home Workout Guide",
        description: "A complete no-equipment home workout plan.",
        pdf_url: "https://example.com/ebook1.pdf",
        price: 500,
      },
      {
        title: "Clean Eating Starter Kit",
        description: "Simple, sustainable meal ideas for beginners.",
        pdf_url: "https://example.com/ebook2.pdf",
        price: 400,
      },
    ];
    for (const e of ebooksToSeed) {
      const exists = await EBook.findOne({ title: e.title });
      if (!exists) {
        await EBook.create(e);
        console.log(`E-book created: ${e.title}`);
      }
    }

    // 9. Recorded content
    const contentToSeed = [
      {
        title: "Full Body Warm-Up",
        youtube_link: "https://www.youtube.com/watch?v=vtxAyruLOX4",
        category: "Warm-Up",
      },
      {
        title: "Core Strength Basics",
        youtube_link: "https://www.youtube.com/watch?v=1bze7Y6_UaM",
        category: "Core",
      },
    ];
    for (const c of contentToSeed) {
      const exists = await RecordedContent.findOne({ title: c.title });
      if (!exists) {
        await RecordedContent.create(c);
        console.log(`Content created: ${c.title}`);
      }
    }

    console.log("\n--- Seeding complete ---");
    console.log("Admin login:  admin@fitnesszone.com / admin12345");
    console.log("Client login: client@fitnesszone.com / client12345");
    console.log(
      "(Test client has no active package yet — extend/toggle packages from Admin > Enrollments to test gated features)",
    );

    process.exit(0);
  } catch (err) {
    console.error("Error seeding data:", err.message);
    process.exit(1);
  }
};

seedAll();
