// frontend/src/services/firebaseService.js

import { 
  updateProfile, 
  updatePassword, 
  updateEmail, 
  EmailAuthProvider, 
  reauthenticateWithCredential 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { auth, db, storage } from '../firebase';

// User Profile Management
export const updateUserProfile = async (displayName, photoURL = null) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');

    await updateProfile(user, {
      displayName,
      ...(photoURL && { photoURL })
    });

    // Also update in Firestore
    await updateDoc(doc(db, 'users', user.uid), {
      displayName,
      ...(photoURL && { photoURL }),
      updatedAt: new Date()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

export const changeUserPassword = async (currentPassword, newPassword) => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error('No authenticated user');

    // Re-authenticate user before changing password
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update password
    await updatePassword(user, newPassword);

    return { success: true };
  } catch (error) {
    console.error('Error changing password:', error);
    throw error;
  }
};

export const changeUserEmail = async (currentPassword, newEmail) => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error('No authenticated user');

    // Re-authenticate user before changing email
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update email
    await updateEmail(user, newEmail);

    // Update in Firestore
    await updateDoc(doc(db, 'users', user.uid), {
      email: newEmail,
      updatedAt: new Date()
    });

    return { success: true };
  } catch (error) {
    console.error('Error changing email:', error);
    throw error;
  }
};

// Avatar Management
export const uploadAvatar = async (file) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');

    // Create a reference to the avatar
    const avatarRef = ref(storage, `avatars/${user.uid}`);
    
    // Upload the file
    const snapshot = await uploadBytes(avatarRef, file);
    
    // Get the download URL
    const photoURL = await getDownloadURL(snapshot.ref);
    
    // Update user profile with new avatar
    await updateUserProfile(user.displayName || user.email?.split('@')[0], photoURL);

    return { success: true, photoURL };
  } catch (error) {
    console.error('Error uploading avatar:', error);
    throw error;
  }
};

export const removeAvatar = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');

    // Delete from storage
    const avatarRef = ref(storage, `avatars/${user.uid}`);
    try {
      await deleteObject(avatarRef);
    } catch (error) {
      // Avatar might not exist, that's okay
      console.log('Avatar not found in storage, continuing...');
    }

    // Update user profile to remove avatar
    await updateUserProfile(user.displayName || user.email?.split('@')[0], null);

    return { success: true };
  } catch (error) {
    console.error('Error removing avatar:', error);
    throw error;
  }
};

// User Statistics
export const getUserStats = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');

    // Get threads joined (from MongoDB backend)
    const threadsResponse = await fetch('/api/threads', {
      headers: {
        'Authorization': `Bearer ${await user.getIdToken()}`
      }
    });
    
    let threads = [];
    if (threadsResponse.ok) {
      threads = await threadsResponse.json();
    } else {
      console.warn('Failed to fetch threads:', threadsResponse.status, threadsResponse.statusText);
    }

    // Get messages sent (from MongoDB backend)
    const messagesResponse = await fetch('/api/messages/stats', {
      headers: {
        'Authorization': `Bearer ${await user.getIdToken()}`
      }
    });
    
    let messageStats = { messageCount: 0, aiInteractions: 0 };
    if (messagesResponse.ok) {
      messageStats = await messagesResponse.json();
    } else {
      console.warn('Failed to fetch message stats:', messagesResponse.status, messagesResponse.statusText);
    }

    console.log('📊 User stats loaded:', { 
      threadsJoined: threads.length || 0, 
      messagesSent: messageStats.messageCount || 0, 
      aiInteractions: messageStats.aiInteractions || 0 
    });

    return {
      threadsJoined: threads.length || 0,
      messagesSent: messageStats.messageCount || 0,
      aiInteractions: messageStats.aiInteractions || 0
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return {
      threadsJoined: 0,
      messagesSent: 0,
      aiInteractions: 0
    };
  }
};

// Export User Data
export const exportUserData = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');

    // Get all user data
    const stats = await getUserStats();
    
    // Get threads
    const threadsResponse = await fetch('/api/threads', {
      headers: {
        'Authorization': `Bearer ${await user.getIdToken()}`
      }
    });
    const threads = await threadsResponse.json();

      const settings = {
        theme: localStorage.getItem('omninexus-theme') || 'light',
        language: localStorage.getItem('omninexus-language') || 'en',
        notifications: JSON.parse(localStorage.getItem('omninexus-notifications') || '{}'),
        preferences: JSON.parse(localStorage.getItem('omninexus-preferences') || '{}')
      };

    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        createdAt: user.metadata.creationTime,
        lastSignIn: user.metadata.lastSignInTime
      },
      stats,
      threads,
      settings
    };

    // Create and download JSON file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
      a.download = `omninexus-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error('Error exporting user data:', error);
    throw error;
  }
};

// User Settings Management
export const getUserSettings = () => {
  return {
      theme: localStorage.getItem('omninexus-theme') || 'light',
      language: localStorage.getItem('omninexus-language') || 'en',
      notifications: JSON.parse(localStorage.getItem('omninexus-notifications') || JSON.stringify({
        email: true,
        push: false,
        threadUpdates: true,
        aiResponses: true,
        mentions: true
      })),
      preferences: JSON.parse(localStorage.getItem('omninexus-preferences') || JSON.stringify({
        autoSave: true,
        compactMode: false
      }))
  };
};

export const saveUserSettings = (settings) => {
  try {
      localStorage.setItem('omninexus-theme', settings.theme);
      localStorage.setItem('omninexus-language', settings.language);
      localStorage.setItem('omninexus-notifications', JSON.stringify(settings.notifications));
      localStorage.setItem('omninexus-preferences', JSON.stringify(settings.preferences));
    
    // Dispatch custom event for theme changes
    if (settings.theme) {
      window.dispatchEvent(new CustomEvent('themeChange', { detail: settings.theme }));
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
};

// Initialize user document in Firestore
export const initializeUserDocument = async (user) => {
  try {
    const userDoc = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userDoc);
    
    if (!docSnap.exists()) {
      await setDoc(userDoc, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0],
        photoURL: user.photoURL || null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error initializing user document:', error);
    throw error;
  }
};