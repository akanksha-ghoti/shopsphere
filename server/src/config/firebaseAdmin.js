const admin = require('firebase-admin');

let firebaseApp;

function getFirebaseApp() {
if (firebaseApp) {
return firebaseApp;
}

if (admin.apps.length > 0) {
firebaseApp = admin.app();
return firebaseApp;
}

// Use Application Default Credentials in the server environment.
// Never commit service-account JSON keys or private credentials.
firebaseApp = admin.initializeApp({
credential: admin.credential.applicationDefault(),
});

return firebaseApp;
}

async function verifyIdToken(idToken) {
const app = getFirebaseApp();
return app.auth().verifyIdToken(idToken);
}

module.exports = { verifyIdToken };
