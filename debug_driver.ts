import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import config from './firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function checkDriver(id: string) {
  const d = await getDoc(doc(db, 'drivers', id));
  if (d.exists()) {
    console.log('Driver data:', d.data());
  } else {
    console.log('Driver not found');
  }
}

const driverId = process.argv[2];
if (!driverId) {
    console.log('Usage: npx ts-node debug_driver.ts <driverId>');
} else {
    checkDriver(driverId).then(() => process.exit(0)).catch(console.error);
}
