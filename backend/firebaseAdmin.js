// backend/firebaseAdmin.js
const admin = require("firebase-admin");

// Validate required environment variables
function validateFirebaseEnv() {
  const requiredVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY_ID', 
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_CLIENT_ID'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required Firebase environment variables: ${missing.join(', ')}`);
  }
  
  // Validate email format  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(process.env.FIREBASE_CLIENT_EMAIL)) {
    throw new Error('FIREBASE_CLIENT_EMAIL must be a valid email address');
  }
}

if (!admin.apps.length) {
  try {
    // Validate environment before proceeding
    validateFirebaseEnv();
    
    // Use environment variables for Firebase credentials
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL)}`,
      universe_domain: "googleapis.com"
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    console.warn('⚠️ Server will start without Firebase authentication');
    console.log('💡 To enable Firebase:');
    console.log('   1. Download service account JSON from Firebase Console');
    console.log('   2. Run: node setup-firebase.js');
    console.log('   3. Restart the server');
    // Don't exit process - allow server to start without Firebase
  }
}

module.exports = admin.apps.length > 0 ? admin : null;
