import db from "./db.js";

const setupCollections = async () => {
  try {
    // Create the "users" collection if it doesn't exist
    await db.createCollection("users", { checkExists: false });
    console.log("Created users collection");

    // Create refresh token collection if it doesn't exist
    await db.createCollection("refresh_tokens", { checkExists: false });
    console.log("Created refresh_tokens collection");

    const allCollections = await db.listCollections();
    return allCollections;
  } catch (error) {
    console.error("Error setting up collections:", error);
  }
};

await setupCollections();

