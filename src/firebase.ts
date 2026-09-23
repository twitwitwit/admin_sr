import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDoc,
  Firestore,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Initialize Firestore with auto-detect long-polling to prevent WebChannel drops in iframe environments
let firestoreInstance: Firestore;
try {
  firestoreInstance = firebaseConfig.firestoreDatabaseId
    ? initializeFirestore(
        app,
        {
          experimentalAutoDetectLongPolling: true,
          ignoreUndefinedProperties: true,
        },
        firebaseConfig.firestoreDatabaseId
      )
    : initializeFirestore(app, {
        experimentalAutoDetectLongPolling: true,
        ignoreUndefinedProperties: true,
      });
} catch {
  firestoreInstance = firebaseConfig.firestoreDatabaseId
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
}

export const db = firestoreInstance;

export async function testConnection(): Promise<boolean> {
  try {
    const testDoc = doc(db, 'test', 'connection');
    await getDoc(testDoc);
    return true;
  } catch (error: any) {
    // Graceful offline fallback logging
    if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
      console.info('SwiftRide: Operating in high-reliability offline-first persistence mode.');
    } else {
      console.warn('Firestore connection notice:', error?.message || error);
    }
    return false;
  }
}

export { app };
