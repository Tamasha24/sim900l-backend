
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors'); // Only needed if you have a web frontend

// Initialize Express
const app = express();
app.use(express.json());

// Enable CORS if needed (for browser access)
app.use(cors());

// Initialize Firebase from environment variables
try {
  const firebaseConfig = {
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Fixes newline formatting
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
  };

  admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig),
    databaseURL: process.env.FIREBASE_DATABASE_URL || 
                `https://air-quality-monitoring-6019d-default-rtdb.firebaseio.com/`
  });
  
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error);
  process.exit(1);
}

// Database reference
const db = admin.firestore();

// SIM900L Data Endpoint
app.post('/sim900l-data', async (req, res) => {
  try {
    const { temperature, humidity, deviceId } = req.body;
    
    if (!temperature || !humidity) {
      return res.status(400).send("Missing sensor data");
    }

    // Save to Firestore
    const docRef = await db.collection('sensorReadings').add({
      deviceId: deviceId || 'sim900l-device',
      temperature: parseFloat(temperature),
      humidity: parseFloat(humidity),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      location: req.body.location || null
    });

    console.log(`Data saved with ID: ${docRef.id}`);
    res.status(200).json({ success: true, docId: docRef.id });
  } catch (error) {
    console.error("Error saving data:", error);
    res.status(500).send("Error processing data");
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.send('SIM900L Backend is running');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`SIM900L endpoint: http://localhost:${PORT}/sim900l-data`);
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});