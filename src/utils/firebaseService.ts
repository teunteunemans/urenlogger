import * as admin from "firebase-admin";
import { HourLog, User } from "../types";

// Singleton pattern with Promise to prevent race conditions
let initializationPromise: Promise<admin.firestore.Firestore> | null = null;
let db: admin.firestore.Firestore | null = null;

/**
 * Capitalize the first letter of a string
 */
function capitalizeFirstLetter(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Internal Firebase initialization - only called once
 */
async function initializeFirebaseInternal(): Promise<admin.firestore.Firestore> {
  console.log("Firebase: Initializing...");

  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!serviceAccountPath) {
    throw new Error(
      "GOOGLE_APPLICATION_CREDENTIALS environment variable not set"
    );
  }

  // Load and parse service account
  const serviceAccount = require(`../../${serviceAccountPath}`);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });

  db = admin.firestore();
  console.log("Firebase: Connected successfully");

  return db;
}

/**
 * Get Firestore instance (async, thread-safe)
 * Uses Promise-based singleton to prevent race conditions
 */
export async function getFirestore(): Promise<admin.firestore.Firestore> {
  if (!initializationPromise) {
    initializationPromise = initializeFirebaseInternal();
  }
  return initializationPromise;
}

/**
 * Initialize Firebase Admin SDK (synchronous wrapper for backwards compatibility)
 * Prefer using getFirestore() for new code
 */
export function initializeFirebase(): admin.firestore.Firestore {
  if (db) {
    return db;
  }

  // Synchronous initialization for backwards compatibility
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!serviceAccountPath) {
    throw new Error(
      "GOOGLE_APPLICATION_CREDENTIALS environment variable not set"
    );
  }

  const serviceAccount = require(`../../${serviceAccountPath}`);

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  }

  db = admin.firestore();
  return db;
}

/**
 * Log work hours to Firestore
 */
export async function logHours(data: HourLog): Promise<string> {
  const firestore = initializeFirebase();

  const docRef = await firestore.collection("hour_logs").add({
    discordUserId: data.discordUserId,
    discordUsername: capitalizeFirstLetter(data.discordUsername),
    hours: data.hours,
    date: data.date,
    description: data.description
      ? capitalizeFirstLetter(data.description)
      : null,
    logTimestamp: data.logTimestamp,
  });

  console.log(`Hours logged: ${data.hours}h on ${data.date} for ${data.discordUsername}`);
  return docRef.id;
}

/**
 * Get all hours within a date range (YYYY-MM-DD format)
 */
export async function getHoursByDateRange(
  startDate: string,
  endDate: string
): Promise<HourLog[]> {
  const firestore = initializeFirebase();

  const snapshot = await firestore
    .collection("hour_logs")
    .where("date", ">=", startDate)
    .where("date", "<=", endDate)
    .orderBy("date", "asc")
    .get();

  const hours: HourLog[] = [];
  snapshot.forEach((doc) => {
    hours.push(doc.data() as HourLog);
  });

  return hours;
}

/**
 * Get hours for a specific user within a date range
 */
export async function getHoursByUser(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<HourLog[]> {
  const firestore = initializeFirebase();

  let query: admin.firestore.Query = firestore
    .collection("hour_logs")
    .where("discordUserId", "==", userId);

  if (startDate) {
    query = query.where("date", ">=", startDate);
  }

  if (endDate) {
    query = query.where("date", "<=", endDate);
  }

  query = query.orderBy("date", "desc");

  const snapshot = await query.get();
  const hours: HourLog[] = [];

  snapshot.forEach((doc) => {
    hours.push(doc.data() as HourLog);
  });

  return hours;
}

/**
 * Delete all test logs (logs with username containing "TEST")
 */
export async function deleteTestLogs(): Promise<number> {
  const firestore = initializeFirebase();

  const snapshot = await firestore
    .collection("hour_logs")
    .where("discordUsername", ">=", "TEST")
    .where("discordUsername", "<=", "TEST\uf8ff")
    .get();

  if (snapshot.empty) {
    return 0;
  }

  const batch = firestore.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  return snapshot.size;
}

/**
 * Register a user with their preferred name
 */
export async function registerUser(
  discordUserId: string,
  registeredName: string
): Promise<void> {
  const firestore = initializeFirebase();

  const user: User = {
    discordUserId,
    registeredName: capitalizeFirstLetter(registeredName),
    registeredAt: new Date().toISOString(),
  };

  await firestore.collection("users").doc(discordUserId).set(user);
  console.log(`User registered: ${registeredName} (${discordUserId})`);
}

/**
 * Update a user's registered name
 */
export async function updateUserName(
  discordUserId: string,
  newName: string
): Promise<void> {
  const firestore = initializeFirebase();

  await firestore.collection("users").doc(discordUserId).update({
    registeredName: capitalizeFirstLetter(newName),
    updatedAt: new Date().toISOString(),
  });

  console.log(`User name updated: ${newName} (${discordUserId})`);
}

/**
 * Get a registered user by Discord ID
 */
export async function getUser(discordUserId: string): Promise<User | null> {
  const firestore = initializeFirebase();

  const doc = await firestore.collection("users").doc(discordUserId).get();

  if (!doc.exists) {
    return null;
  }

  return doc.data() as User;
}

/**
 * Get all registered users
 */
export async function getAllUsers(): Promise<User[]> {
  const firestore = initializeFirebase();

  const snapshot = await firestore.collection("users").get();
  const users: User[] = [];

  snapshot.forEach((doc) => {
    users.push(doc.data() as User);
  });

  return users;
}

/**
 * Update user's email address for CC on reports
 */
export async function updateUserEmail(
  discordUserId: string,
  email: string
): Promise<void> {
  const firestore = initializeFirebase();

  await firestore.collection("users").doc(discordUserId).update({
    email: email,
  });

  console.log(`Email updated for user ${discordUserId}`);
}

/**
 * Remove user's email address
 */
export async function removeUserEmail(discordUserId: string): Promise<void> {
  const firestore = initializeFirebase();

  await firestore.collection("users").doc(discordUserId).update({
    email: admin.firestore.FieldValue.delete(),
  });

  console.log(`Email removed for user ${discordUserId}`);
}

/**
 * Get hours for a specific user on a specific day
 */
export async function getHoursByUserAndDay(
  discordUserId: string,
  dateString: string
): Promise<HourLog[]> {
  const firestore = initializeFirebase();

  const snapshot = await firestore
    .collection("hour_logs")
    .where("discordUserId", "==", discordUserId)
    .where("date", "==", dateString)
    .get();

  const logs: HourLog[] = [];
  snapshot.forEach((doc) => {
    logs.push(doc.data() as HourLog);
  });

  return logs;
}

/**
 * Update hours for a specific user on a specific day
 */
export async function updateHoursForDay(
  discordUserId: string,
  dateString: string,
  newHours: number,
  newDescription?: string
): Promise<number> {
  const firestore = initializeFirebase();

  const snapshot = await firestore
    .collection("hour_logs")
    .where("discordUserId", "==", discordUserId)
    .where("date", "==", dateString)
    .get();

  if (snapshot.empty) {
    return 0;
  }

  const batch = firestore.batch();
  let updateCount = 0;

  snapshot.forEach((doc) => {
    const updateData: Partial<HourLog> = {
      hours: newHours,
      logTimestamp: new Date().toISOString(),
    };

    if (newDescription !== undefined) {
      updateData.description = newDescription
        ? capitalizeFirstLetter(newDescription)
        : newDescription;
    }

    batch.update(doc.ref, updateData);
    updateCount++;
  });

  await batch.commit();
  return updateCount;
}

/**
 * Delete all hours for a specific user on a specific day
 */
export async function deleteHoursForDay(
  discordUserId: string,
  dateString: string
): Promise<number> {
  const firestore = initializeFirebase();

  const snapshot = await firestore
    .collection("hour_logs")
    .where("discordUserId", "==", discordUserId)
    .where("date", "==", dateString)
    .get();

  if (snapshot.empty) {
    return 0;
  }

  const batch = firestore.batch();
  let deleteCount = 0;

  snapshot.forEach((doc) => {
    batch.delete(doc.ref);
    deleteCount++;
  });

  await batch.commit();
  return deleteCount;
}
