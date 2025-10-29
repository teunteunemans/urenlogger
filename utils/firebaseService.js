const admin = require("firebase-admin");

// Initialize Firebase Admin
let db;

function initializeFirebase() {
  if (!db) {
    try {
      // Option 1: Using service account key file
      // const serviceAccount = require('../serviceAccountKey.json');
      // admin.initializeApp({
      //   credential: admin.credential.cert(serviceAccount)
      // });

      // Option 2: Using environment variables
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      });

      db = admin.firestore();
      console.log("✓ Firebase initialized successfully");
    } catch (error) {
      console.error("✗ Error initializing Firebase:", error);
      throw error;
    }
  }
  return db;
}

/**
 * Log work hours to Firebase
 */
async function logHours(data) {
  const firestore = initializeFirebase();

  try {
    const docRef = await firestore.collection("hours").add({
      userId: data.userId,
      username: data.username,
      hours: data.hours,
      description: data.description,
      date: data.date,
      timestamp: data.timestamp,
    });

    console.log(`✓ Hours logged with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error("✗ Error logging hours:", error);
    throw error;
  }
}

/**
 * Get hours by user ID with optional date range
 */
async function getHoursByUser(userId, startDate = null, endDate = null) {
  const firestore = initializeFirebase();

  try {
    let query = firestore.collection("hours").where("userId", "==", userId);

    if (startDate) {
      query = query.where("date", ">=", startDate.toISOString());
    }

    if (endDate) {
      query = query.where("date", "<=", endDate.toISOString());
    }

    query = query.orderBy("date", "desc");

    const snapshot = await query.get();
    const hours = [];

    snapshot.forEach((doc) => {
      hours.push({ id: doc.id, ...doc.data() });
    });

    return hours;
  } catch (error) {
    console.error("✗ Error fetching hours:", error);
    throw error;
  }
}

/**
 * Get all hours within a date range
 */
async function getAllHours(startDate, endDate) {
  const firestore = initializeFirebase();

  try {
    const snapshot = await firestore
      .collection("hours")
      .where("date", ">=", startDate.toISOString())
      .where("date", "<=", endDate.toISOString())
      .orderBy("date", "desc")
      .get();

    const hours = [];
    snapshot.forEach((doc) => {
      hours.push({ id: doc.id, ...doc.data() });
    });

    return hours;
  } catch (error) {
    console.error("✗ Error fetching all hours:", error);
    throw error;
  }
}

module.exports = {
  initializeFirebase,
  logHours,
  getHoursByUser,
  getAllHours,
};
