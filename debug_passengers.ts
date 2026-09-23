import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import config from './firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function scan() {
  const collections = ['passengers', 'users', 'riders'];
  console.log('--- Scanning collections for new passengers ---');
  for (const name of collections) {
    try {
      const snap = await getDocs(collection(db, name));
      console.log(`Collection '${name}' has ${snap.size} docs.`);
      snap.forEach(d => {
        console.log(` - ID: ${d.id}, Data:`, JSON.stringify(d.data()).slice(0, 100));
      });
    } catch (e: any) {
      console.error(`Error scanning '${name}':`, e.message);
    }
  }
}

scan().then(() => process.exit(0)).catch(console.error);
