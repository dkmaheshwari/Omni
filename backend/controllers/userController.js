// backend/controllers/userController.js
const User = require("../models/User");

exports.upsertUser = async (req, res) => {
  try {
    const { uid, email } = req.body;

    // 1) basic sanity check
    if (!uid || !email) {
      return res
        .status(400)
        .json({ error: "Missing uid or email in request body" });
    }

    // 2) idempotent upsert by either uid or email
    // This avoids duplicate key failures when a user already exists by email.
    await User.findOneAndUpdate(
      { $or: [{ uid }, { email }] },
      {
        $set: {
          uid,
          email,
          'activity.lastSeen': new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.sendStatus(200);
  } catch (err) {
    if (err?.code === 11000) {
      // Handle rare race conditions where two requests attempt first insert.
      try {
        const { uid, email } = req.body;
        await User.updateOne(
          { $or: [{ uid }, { email }] },
          {
            $set: {
              uid,
              email,
              'activity.lastSeen': new Date(),
            },
          }
        );
        return res.sendStatus(200);
      } catch (retryErr) {
        console.error('User upsert retry failed:', retryErr);
        return res.status(500).json({ error: retryErr.message });
      }
    }

    console.error("User upsert failed:", err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const { uid } = req.user;
    
    const user = await User.findOne({ uid }).select('-__v');
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      uid: user.uid,
      email: user.email,
      profile: user.profile || {},
      activity: user.activity || {},
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (err) {
    console.error("Get profile failed:", err);
    return res.status(500).json({ error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { uid } = req.user;
    const profileData = req.body;

    // Check if profile completion criteria are met
    const isProfileComplete = !!(
      profileData.displayName &&
      profileData.university &&
      profileData.major &&
      profileData.year
    );

    const updateData = {
      ...profileData,
      isProfileComplete
    };

    const user = await User.findOneAndUpdate(
      { uid },
      { 
        $set: { 
          profile: updateData,
          'activity.lastSeen': new Date()
        }
      },
      { new: true, upsert: true }
    ).select('-__v');

    return res.json({
      success: true,
      profile: user.profile,
      message: isProfileComplete ? "Profile completed successfully" : "Profile updated successfully"
    });
  } catch (err) {
    console.error("Update profile failed:", err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getPreferences = async (req, res) => {
  try {
    const { uid } = req.user;
    
    const user = await User.findOne({ uid }).select('preferences');
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      preferences: user.preferences || {
        notifications: {
          email: true,
          push: true,
          mentions: true,
          threadActivity: true
        },
        theme: 'system',
        ai: {
          enabled: true,
          responseStyle: 'adaptive',
          autoRespond: true
        }
      }
    });
  } catch (err) {
    console.error("Get preferences failed:", err);
    return res.status(500).json({ error: err.message });
  }
};

exports.updatePreferences = async (req, res) => {
  try {
    const { uid } = req.user;
    const preferencesData = req.body;

    const user = await User.findOneAndUpdate(
      { uid },
      { 
        $set: { 
          preferences: preferencesData,
          'activity.lastSeen': new Date()
        }
      },
      { new: true, upsert: true }
    ).select('preferences');

    return res.json({
      success: true,
      preferences: user.preferences,
      message: "Preferences updated successfully"
    });
  } catch (err) {
    console.error("Update preferences failed:", err);
    return res.status(500).json({ error: err.message });
  }
};
