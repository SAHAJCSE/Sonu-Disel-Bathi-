import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function main() {
  try {
    const querySnapshot = await getDocs(collection(db, 'products'));
    querySnapshot.forEach((doc) => {
      console.log(`${doc.id} =>`, doc.data());
    });
    process.exit(0);
  } catch (error) {
    console.error('Error reading Firestore:', error);
    process.exit(1);
  }
}

main();
