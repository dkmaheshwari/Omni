import { createContext, useContext, useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import "../firebase"; // Initializes Firebase
import { addUserToDB } from "../utils/firebaseUserSync";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    let tokenRefreshInterval = null;
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("🔄 Auth state changed:", firebaseUser ? `User logged in: ${firebaseUser.email}` : "User logged out");
      
      // Clear any existing interval
      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
        tokenRefreshInterval = null;
      }
      
      if (firebaseUser) {
        try {
          setUser(firebaseUser);
          const idToken = await firebaseUser.getIdToken();
          setToken(idToken);
          localStorage.setItem("token", idToken);
          console.log("✅ Token obtained for:", firebaseUser.email);
          
          // Enhanced token refresh with retry logic
          const refreshToken = async (retryCount = 0) => {
            const maxRetries = 3;
            try {
              console.log('🔄 Refreshing authentication token...');
              const newToken = await firebaseUser.getIdToken(true);
              setToken(newToken);
              localStorage.setItem("token", newToken);
              console.log('✅ Token refreshed successfully');
              
              // Reset retry count on success
              refreshToken.retryCount = 0;
            } catch (error) {
              console.error(`❌ Token refresh failed (attempt ${retryCount + 1}/${maxRetries}):`, error);
              
              // Retry with exponential backoff
              if (retryCount < maxRetries) {
                const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
                console.log(`⏰ Retrying token refresh in ${delay}ms...`);
                setTimeout(() => {
                  refreshToken(retryCount + 1);
                }, delay);
              } else {
                console.error('❌ Max token refresh retries reached, logging out user');
                // If all retries fail, log user out
                await logout();
              }
            }
          };

          // Refresh token every 45 minutes (tokens expire in 1 hour) - more conservative
          tokenRefreshInterval = setInterval(refreshToken, 45 * 60 * 1000);
        } catch (error) {
          console.error("❌ Error getting token:", error);
          setUser(null);
          setToken(null);
          localStorage.removeItem("token");
        }
      } else {
        setUser(null);
        setToken(null);
        localStorage.removeItem("token");
        console.log("🚪 User logged out, token cleared");
      }
      setLoading(false);
      console.log("🏁 Auth loading completed");
    });

    return () => {
      unsubscribe();
      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
      }
    };
  }, []); // Remove user dependency to prevent infinite re-renders

  const login = async (email, password) => {
    try {
      console.log('🔐 Attempting login for:', email);
      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Firebase login successful for:', email);
      
      // Sync user to backend database
      await addUserToDB();
      console.log('✅ User synced to database');
      
      return userCredential;
    } catch (error) {
      console.error('❌ Login failed:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Login failed. Please try again.';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled. Please contact support.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection and try again.';
          break;
      }
      
      // Create enhanced error object
      const enhancedError = new Error(errorMessage);
      enhancedError.code = error.code;
      enhancedError.originalError = error;
      throw enhancedError;
    }
  };

  const signup = async (email, password) => {
    try {
      console.log('📝 Attempting signup for:', email);
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('✅ Firebase signup successful for:', email);
      
      // Sync user to backend database
      await addUserToDB();
      console.log('✅ New user synced to database');
      
      return userCredential;
    } catch (error) {
      console.error('❌ Signup failed:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Account creation failed. Please try again.';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists. Please sign in instead.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters long.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password accounts are not enabled. Please contact support.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection and try again.';
          break;
      }
      
      // Create enhanced error object
      const enhancedError = new Error(errorMessage);
      enhancedError.code = error.code;
      enhancedError.originalError = error;
      throw enhancedError;
    }
  };

  const logout = async () => {
    const auth = getAuth();
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      currentUser: user, 
      loading, 
      login, 
      signup, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
