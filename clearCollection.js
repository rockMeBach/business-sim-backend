require("dotenv").config();
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("Connected to MongoDB");
    await mongoose.connection.db.collection('saved_business_plans').drop();
    console.log("Collection 'saved_business_plans' dropped successfully");
    process.exit(0);
  })
  .catch(err => {
    console.log("Error:", err.message);
    process.exit(1);
  });
