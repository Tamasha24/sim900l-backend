require('dotenv').config(); // For local testing only - safe to keep
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

// Initialize Express
const app = express();
app.use(express.json());
app.use(cors());

// Enhanced Firebase Initialization
const initializeFirebase = () => {
  try {
    // Method 1: Check for single JSON config first
    if (process.env.FIREBASE_CONFIG) {
      console.log("Initializing Firebase from FIREBASE_CONFIG");
      const config = JSON.parse(process.env.FIREBASE_CONFIG);
      admin.initializeApp({
        credential: admin.credential.cert(config),
        databaseURL: config.databaseURL || `https://${config.project_id}.firebaseio.com`
      });
      return;
    }

    // Method 2: Fallback to individual variables
    console.log("Initializing Firebase from individual env vars");
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    if (!process.env.FIREBASE_PROJECT_ID || !privateKey || !process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error("Missing required Firebase environment variables");
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: privateKey,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
        token_uri: process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL || 
                                    "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL || 
                 `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    });

    console.log("Firebase initialized successfully");
  } catch (error) {
    console.error("FIREBASE INIT ERROR:", error);
    console.error("Current environment variables:", {
      FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
      FIREBASE_CONFIG: !!process.env.FIREBASE_CONFIG
    });
    process.exit(1);
  }
};

initializeFirebase();

// Database reference
const db = admin.firestore();

// SIM900L Data Endpoint
app.post('/sim900l-data', async (req, res) => {
  try {
    const { temperature, humidity, deviceId } = req.body;
    
    if (temperature === undefined || humidity === undefined) {
      return res.status(400).json({ error: "Missing temperature or humidity" });
    }

    const docRef = await db.collection('sensorReadings').add({
      deviceId: deviceId || 'sim900l-default',
      temperature: parseFloat(temperature),
      humidity: parseFloat(humidity),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      location: req.body.location || null
    });

    console.log(`Data saved: ${docRef.id}`);
    res.status(200).json({ success: true, id: docRef.id });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Failed to save data" });
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'active',
    firebase: admin.apps.length > 0 ? 'connected' : 'disconnected',
    endpoints: {
      postData: '/sim900l-data'
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Firebase project: ${process.env.FIREBASE_PROJECT_ID || 'not set'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});