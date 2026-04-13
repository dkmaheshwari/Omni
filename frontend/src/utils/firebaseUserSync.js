import axios from "../axios";
import { getAuth } from "firebase/auth";

export const addUserToDB = async () => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) return;

  try {
    await axios.post("/users", {
      uid: user.uid,
      email: user.email,
    });
    console.log("✅ User synced to backend");
  } catch (error) {
    const backendError =
      error?.response?.data?.error || error?.message || "";

    if (typeof backendError === "string" && backendError.includes("E11000 duplicate key error")) {
      console.log("ℹ️ User already exists in backend, continuing");
      return;
    }

    console.error(
      "❌ Failed to sync user:",
      error.response?.data || error.message
    );
  }
};
