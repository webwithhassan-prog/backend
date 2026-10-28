const mongoose = require('mongoose');

// Unique indexes left behind by older versions of a model. The "reviews"
// collection once held consultation reviews keyed by consultation_ref; the
// current Review model has no such field, so every review saved null there
// and the second one failed with "E11000 duplicate key … consultation_ref".
const STALE_INDEXES = [{ collection: 'reviews', index: 'consultation_ref_1' }];

const dropStaleIndexes = async (db) => {
  for (const { collection, index } of STALE_INDEXES) {
    try {
      await db.collection(collection).dropIndex(index);
      console.log(`Dropped stale index ${collection}.${index}`);
    } catch (err) {
      // Already gone (or the collection doesn't exist yet) — nothing to do.
      if (err.codeName !== 'IndexNotFound' && err.codeName !== 'NamespaceNotFound') {
        console.error(`Could not drop ${collection}.${index}: ${err.message}`);
      }
    }
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
    await dropStaleIndexes(conn.connection.db);
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;