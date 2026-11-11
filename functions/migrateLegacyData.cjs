const admin = require("firebase-admin");

const ownerUid = process.env.LEGACY_OWNER_UID;
const ownerEmail = process.env.LEGACY_OWNER_EMAIL;
if (!ownerUid && !ownerEmail) {
  throw new Error("Set LEGACY_OWNER_EMAIL or LEGACY_OWNER_UID for the account that owns the existing records.");
}
if (process.env.CONFIRM_LEGACY_OWNER !== "yes") {
  throw new Error("Confirm that every unowned legacy record belongs to this account by setting CONFIRM_LEGACY_OWNER=yes.");
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: process.env.GCLOUD_PROJECT || "loanrecoverapp",
});

async function main() {
  const user = ownerUid
    ? await admin.auth().getUser(ownerUid)
    : await admin.auth().getUserByEmail(ownerEmail);
  const ownerId = user.uid;
  console.log(`Assigning unowned legacy records to ${user.email || user.uid}.`);
  const db = admin.firestore();
  const collections = ["customers", "payments", "adjustments", "smsHistory"];
  let updatedCount = 0;

  for (const collectionName of collections) {
    const snapshot = await db.collection(collectionName).get();
    let batch = db.batch();
    let batchSize = 0;
    let collectionUpdates = 0;

    for (const record of snapshot.docs) {
      if (record.get("ownerId")) continue;
      batch.update(record.ref, { ownerId });
      batchSize += 1;
      collectionUpdates += 1;
      if (batchSize === 450) {
        await batch.commit();
        batch = db.batch();
        batchSize = 0;
      }
    }

    if (batchSize) await batch.commit();
    updatedCount += collectionUpdates;
    console.log(`${collectionName}: assigned ${collectionUpdates} records.`);
  }

  console.log(`Done. Assigned ${updatedCount} records.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
