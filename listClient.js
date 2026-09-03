// // require('dotenv').config();
// // const mongoose = require('mongoose');
// // const Client = require('./models/Client');

// // const listClients = async () => {
// //   try {
// //     await mongoose.connect(process.env.MONGO_URI);
// //     console.log('Connected to MongoDB');

// //     const clients = await Client.find().select('name phone_number user_ref status has_dietplan has_workout has_premium');
// //     clients.forEach((c) => {
// //       console.log({
// //         name: c.name,
// //         phone_number: c.phone_number,
// //         linked: !!c.user_ref,
// //         status: c.status,
// //         has_workout: c.has_workout,
// //       });
// //     });

// //     process.exit(0);
// //   } catch (err) {
// //     console.error('Error:', err.message);
// //     process.exit(1);
// //   }
// // };

// // listClients();
// require("dotenv").config();
// const mongoose = require("mongoose");
// const User = require("./models/User");
// const Client = require("./models/Client");

// const debug = async () => {
//   await mongoose.connect(process.env.MONGO_URI);

//   const email = process.argv[2];
//   const user = await User.findOne({ email });

//   if (!user) {
//     console.log("NO USER found with that email");
//     process.exit(1);
//   }

//   console.log("User found:", {
//     id: user._id.toString(),
//     email: user.email,
//     role: user.role,
//   });

//   const client = await Client.findOne({ user_ref: user._id });

//   if (!client) {
//     console.log("NO CLIENT linked to this user_ref.");
//   } else {
//     console.log("Client found:", {
//       id: client._id.toString(),
//       name: client.name,
//       phone: client.phone_number,
//       status: client.status,
//       has_workout: client.has_workout,
//     });
//   }

//   process.exit(0);
// };

// debug();

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Client = require("./models/Client");

const createClientForUser = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const email = process.argv[2];
    const name = process.argv[3];
    const phone = process.argv[4];

    if (!email || !name || !phone) {
      console.log(
        "Usage: node createClientForUser.js <email> <name> <phone_number>",
      );
      process.exit(1);
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log("No user found with that email.");
      process.exit(1);
    }

    const existingClient = await Client.findOne({ user_ref: user._id });
    if (existingClient) {
      console.log(
        "This user already has a client:",
        existingClient._id.toString(),
      );
      process.exit(0);
    }

    const phoneTaken = await Client.findOne({ phone_number: phone });
    if (phoneTaken) {
      console.log(
        "That phone number is already used by another client. Pick a different one.",
      );
      process.exit(1);
    }

    const client = await Client.create({
      user_ref: user._id,
      name,
      phone_number: phone,
      status: "expired",
      days_remaining: 0,
    });

    console.log("Client created:", {
      id: client._id.toString(),
      name: client.name,
      phone: client.phone_number,
    });

    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
};

createClientForUser();
