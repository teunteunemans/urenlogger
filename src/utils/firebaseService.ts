import * as admin from "firebase-admin";
import { HourLog, User } from "../types";

let db: admin.firestore.Firestore | null = null;

/**
 * Capitalize the first letter of a string
 */
function capitalizeFirstLetter(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Initialize Firebase Admin SDK
 */
export function initializeFirebase(): admin.firestore.Firestore {
  if (!db) {
    try {
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🔧 FIREBASE INITIALIZATION");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      // Initialize using service account key file path from environment
      const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      console.log(`📁 Service Account Path: ${serviceAccountPath}`);

      if (!serviceAccountPath) {
        throw new Error(
          "GOOGLE_APPLICATION_CREDENTIALS environment variable not set"
        );
      }

      // Load and parse service account
      const serviceAccount = require(`../../${serviceAccountPath}`);
      console.log(`📧 Service Account Email: ${serviceAccount.client_email}`);
      console.log(`🔑 Project ID: ${serviceAccount.project_id}`);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });

      db = admin.firestore();
      console.log("✅ Firebase Admin SDK initialized");
      console.log("✅ Firestore database connected");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    } catch (error) {
      console.error("\n❌ FIREBASE INITIALIZATION FAILED");
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("Error:", error);
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      throw error;
    }
  }
  return db;
}

/**
 * Log work hours to Firestore
 */
export async function logHours(data: HourLog): Promise<string> {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📝 LOGGING HOURS TO FIRESTORE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 Data to log:");
  console.log(`   👤 User: ${data.discordUsername} (${data.discordUserId})`);
  console.log(`   ⏰ Hours: ${data.hours}`);
  console.log(`   📅 Date: ${data.date}`);
  console.log(`   📝 Description: ${data.description || "(none)"}`);
  console.log(`   🕐 Timestamp: ${data.logTimestamp}`);

  const firestore = initializeFirebase();

  try {
    console.log("🔄 Attempting to add document to 'hour_logs' collection...");

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

    console.log(`✅ SUCCESS! Document created with ID: ${docRef.id}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    return docRef.id;
  } catch (error) {
    console.error("\n❌ FAILED TO LOG HOURS");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("Error details:", error);
    console.error("\n💡 Possible causes:");
    console.error("   • Firestore database not created in Firebase Console");
    console.error("   • Service account lacks permissions");
    console.error("   • Firestore API not enabled for project");
    console.error("\n🔧 To fix:");
    console.error("   1. Go to https://console.firebase.google.com");
    console.error("   2. Select project: our-hours-ouwe");
    console.error("   3. Click 'Firestore Database' in left menu");
    console.error("   4. Click 'Create database'");
    console.error("   5. Choose 'Start in production mode' or 'Test mode'");
    console.error("   6. Select a location (e.g., europe-west)");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    throw error;
  }
}

/**
 * Get all hours within a date range (YYYY-MM-DD format)
 */
export async function getHoursByDateRange(
  startDate: string,
  endDate: string
): Promise<HourLog[]> {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔍 QUERYING HOURS BY DATE RANGE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📅 Start Date: ${startDate}`);
  console.log(`📅 End Date: ${endDate}`);

  const firestore = initializeFirebase();

  try {
    console.log("🔄 Executing Firestore query...");

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

    console.log(`✅ Retrieved ${hours.length} hour log(s)`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    return hours;
  } catch (error) {
    console.error("\n❌ FAILED TO QUERY HOURS");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("Error:", error);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    throw error;
  }
}

/**
 * Get hours for a specific user within a date range
 */
export async function getHoursByUser(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<HourLog[]> {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔍 QUERYING HOURS BY USER");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`👤 User ID: ${userId}`);
  console.log(`📅 Start Date: ${startDate || "(all time)"}`);
  console.log(`📅 End Date: ${endDate || "(all time)"}`);

  const firestore = initializeFirebase();

  try {
    console.log("🔄 Building query...");

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

    console.log("🔄 Executing query...");
    const snapshot = await query.get();
    const hours: HourLog[] = [];

    snapshot.forEach((doc) => {
      hours.push(doc.data() as HourLog);
    });

    console.log(`✅ Retrieved ${hours.length} hour log(s) for user`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    return hours;
  } catch (error) {
    console.error("\n❌ FAILED TO QUERY USER HOURS");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("Error:", error);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    throw error;
  }
}

/**
 * Delete all test logs (logs with username containing "TEST")
 */
export async function deleteTestLogs(): Promise<number> {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🧹 DELETING TEST LOGS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const firestore = initializeFirebase();

  try {
    console.log("🔄 Querying for test logs...");

    // Query for logs where username contains "TEST"
    const snapshot = await firestore
      .collection("hour_logs")
      .where("discordUsername", ">=", "TEST")
      .where("discordUsername", "<=", "TEST\uf8ff")
      .get();

    if (snapshot.empty) {
      console.log("✅ No test logs found to delete");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      return 0;
    }

    console.log(`🔄 Found ${snapshot.size} test log(s), deleting...`);

    // Delete in batch
    const batch = firestore.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log(`✅ Deleted ${snapshot.size} test log(s)`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    return snapshot.size;
  } catch (error) {
    console.error("\n❌ FAILED TO DELETE TEST LOGS");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("Error:", error);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    throw error;
  }
}

/**
 * Register a user with their preferred name
 */
export async function registerUser(
  discordUserId: string,
  registeredName: string
): Promise<void> {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📝 REGISTERING USER");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`👤 Discord User ID: ${discordUserId}`);
  console.log(`✏️  Registered Name: ${registeredName}`);

  const firestore = initializeFirebase();

  try {
    const user: User = {
      discordUserId,
      registeredName: capitalizeFirstLetter(registeredName),
      registeredAt: new Date().toISOString(),
    };

    await firestore.collection("users").doc(discordUserId).set(user);

    console.log("✅ User registered successfully");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } catch (error) {
    console.error("\n❌ FAILED TO REGISTER USER");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("Error:", error);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    throw error;
  }
}

/**
 * Get a registered user by Discord ID
 */
export async function getUser(discordUserId: string): Promise<User | null> {
  const firestore = initializeFirebase();

  try {
    const doc = await firestore.collection("users").doc(discordUserId).get();

    if (!doc.exists) {
      return null;
    }

    return doc.data() as User;
  } catch (error) {
    console.error("❌ Error fetching user:", error);
    throw error;
  }
}

/**
 * Get all registered users
 */
export async function getAllUsers(): Promise<User[]> {
  const firestore = initializeFirebase();

  try {
    const snapshot = await firestore.collection("users").get();
    const users: User[] = [];

    snapshot.forEach((doc) => {
      users.push(doc.data() as User);
    });

    return users;
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    throw error;
  }
}

/**
 * Get hours for a specific user on a specific day
 */
export async function getHoursByUserAndDay(
  discordUserId: string,
  dateString: string
): Promise<HourLog[]> {
  const firestore = initializeFirebase();

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔍 QUERYING HOURS BY USER AND DAY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`👤 User ID: ${discordUserId}`);
  console.log(`📅 Date: ${dateString}`);

  try {
    const snapshot = await firestore
      .collection("hour_logs")
      .where("discordUserId", "==", discordUserId)
      .where("date", "==", dateString)
      .get();

    const logs: HourLog[] = [];
    snapshot.forEach((doc) => {
      logs.push(doc.data() as HourLog);
    });

    console.log(`✅ Retrieved ${logs.length} hour log(s)`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return logs;
  } catch (error) {
    console.error("❌ Error querying hours:", error);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    throw error;
  }
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

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✏️  UPDATING HOURS FOR DAY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`👤 User ID: ${discordUserId}`);
  console.log(`📅 Date: ${dateString}`);
  console.log(`⏰ New Hours: ${newHours}`);
  console.log(`📝 New Description: ${newDescription || "(none)"}`);

  try {
    const snapshot = await firestore
      .collection("hour_logs")
      .where("discordUserId", "==", discordUserId)
      .where("date", "==", dateString)
      .get();

    if (snapshot.empty) {
      console.log("⚠️  No logs found for this date");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
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

    console.log(`✅ Updated ${updateCount} log(s)`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return updateCount;
  } catch (error) {
    console.error("❌ Error updating hours:", error);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    throw error;
  }
}

/**
 * Delete all hours for a specific user on a specific day
 */
export async function deleteHoursForDay(
  discordUserId: string,
  dateString: string
): Promise<number> {
  const firestore = initializeFirebase();

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🗑️  DELETING HOURS FOR DAY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`👤 User ID: ${discordUserId}`);
  console.log(`📅 Date: ${dateString}`);

  try {
    const snapshot = await firestore
      .collection("hour_logs")
      .where("discordUserId", "==", discordUserId)
      .where("date", "==", dateString)
      .get();

    if (snapshot.empty) {
      console.log("⚠️  No logs found for this date");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      return 0;
    }

    const batch = firestore.batch();
    let deleteCount = 0;

    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
      deleteCount++;
    });

    await batch.commit();

    console.log(`✅ Deleted ${deleteCount} log(s)`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return deleteCount;
  } catch (error) {
    console.error("❌ Error deleting hours:", error);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    throw error;
  }
}
