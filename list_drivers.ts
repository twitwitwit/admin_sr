import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import config from './firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function listDrivers() {
  const snap = await getDocs(collection(db, 'drivers'));
  snap.forEach(d => {
    console.log(`ID: ${d.id}, isPendingAudit: ${d.data().isPendingAudit}, status: ${d.data().status}`);
  });
}

listDrivers().then(() => process.exit(0)).catch(console.error);
