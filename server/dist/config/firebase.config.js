import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
export const initializeFirebase = () => {
    if (getApps().length > 0) {
        return getApp();
    }
    try {
        // In production, you would typically load credentials from env vars
        // For local development, ensure FIREBASE_SERVICE_ACCOUNT is set
        const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (serviceAccountJson) {
            const serviceAccount = JSON.parse(serviceAccountJson);
            return initializeApp({
                credential: cert(serviceAccount),
            });
        }
        else {
            console.warn('FIREBASE_SERVICE_ACCOUNT environment variable is not set. Firebase Admin cannot be initialized.');
            // Fallback for development if needed, though it won't be able to send real notifications
            return initializeApp();
        }
    }
    catch (error) {
        console.error('Failed to initialize Firebase Admin:', error);
        return null;
    }
};
//# sourceMappingURL=firebase.config.js.map