require("dotenv").config();
const mongoose = require("mongoose");
const PremiumAddon = require("./models/PremiumAddon");

const seedPremiumAddon = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const existing = await PremiumAddon.findOne();
    if (existing) {
      console.log("Premium add-on already exists:", existing);
      process.exit(0);
    }

    const addon = await PremiumAddon.create({
      name: "Premium Consultation Add-on",
      price: 1000, // placeholder — update anytime from the admin panel
      sessions_included: 1,
    });

    console.log("Premium add-on created:", addon);
    process.exit(0);
  } catch (err) {
    console.error("Error seeding premium add-on:", err.message);
    process.exit(1);
  }
};

seedPremiumAddon();
