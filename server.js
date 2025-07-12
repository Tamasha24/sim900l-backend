// 1. Import required libraries
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors'); // Optional: Only add if you get CORS errors

// 2. Initialize Express app
const app = express();

// 3. Enable CORS (if needed)
app.use(cors()); // Uncomment this line if you test from a browser

// 4. Parse JSON requests (SIM900L will send JSON)
app.use(express.json());

// 5. Initialize Firebase (using environment variables)
admin.initializeApp({
  credential: admin.credential.cert(require('./firebase-key.json')),
  databaseURL: "https://air-quality-monitoring-6019d-default-rtdb.firebaseio.com"
});
const db = admin.firestore();

// 6. Define SIM900L endpoint
app.post('/sim900l-data', async (req, res) => {
  try {
    const { temperature, humidity } = req.body;
    
    // Save to Firebase
    await db.collection('sensorData').add({
      temperature,
      humidity,
      timestamp: new Date()
    });

    res.status(200).send("Data saved!");
  } catch (error) {
    console.error("Firebase error:", error);
    res.status(500).send("Error saving data");
  }
});

// 7. Start server (critical Render-specific part)
const PORT = process.env.PORT || 3000; // Render controls the PORT
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});