import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, addDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function seed() {
  console.log('Signing in anonymously...');
  const credential = await signInAnonymously(auth);
  const uid = credential.user.uid;
  console.log('Signed in as', uid);

  // 1. Create a dummy room
  const roomId = 'dummy_room_' + Date.now();
  const roomRef = doc(db, 'rooms', roomId);
  const guardianId = 'guardian_abusive_123';
  
  await setDoc(roomRef, {
    confessorId: uid,
    guardianId: guardianId,
    status: 'active',
    createdAt: Date.now(),
    language: 'ar'
  });
  console.log('Room created:', roomId);

  // 2. Add some messages
  const msgsRef = collection(db, 'rooms', roomId, 'messages');
  await addDoc(msgsRef, {
    senderId: uid,
    text: 'مرحباً، أردت التحدث عن مشكلة أواجهها...',
    timestamp: Date.now() - 60000,
    status: 'read'
  });
  
  await addDoc(msgsRef, {
    senderId: guardianId,
    text: 'أنت تتحدث بكلام لا معنى له، أنت غبي وتستحق ما يحدث لك!',
    timestamp: Date.now() - 30000,
    status: 'read'
  });
  
  await addDoc(msgsRef, {
    senderId: guardianId,
    text: 'لا تراسلني مرة أخرى أيها الفاشل.',
    timestamp: Date.now() - 10000,
    status: 'sent'
  });

  console.log('Messages created.');

  // 3. Create a report
  await addDoc(collection(db, 'reports'), {
    roomId: roomId,
    reportedBy: uid,
    reportedRole: 'guardian',
    reason: 'إساءة لفظية محبطة جداً وسلوك عدواني',
    timestamp: Date.now(),
    status: 'pending'
  });

  console.log('Report 1 created.');

  // Create another room for a different report scenario
  const roomId2 = 'dummy_room_2_' + Date.now();
  await setDoc(doc(db, 'rooms', roomId2), {
    confessorId: uid,
    guardianId: 'guardian_spam_456',
    status: 'ended',
    createdAt: Date.now() - 3600000,
    language: 'ar'
  });

  const msgsRef2 = collection(db, 'rooms', roomId2, 'messages');
  await addDoc(msgsRef2, {
    senderId: 'guardian_spam_456',
    text: 'اشترك الآن في موقعي واربح ملايين الدولارات http://spam.xyz',
    timestamp: Date.now() - 3500000,
    status: 'read'
  });
  await addDoc(msgsRef2, {
    senderId: 'guardian_spam_456',
    text: 'أعطني رقم بطاقتك الائتمانية وسأحل كل مشاكلك!',
    timestamp: Date.now() - 3400000,
    status: 'read'
  });

  await addDoc(collection(db, 'reports'), {
    roomId: roomId2,
    reportedBy: uid,
    reportedRole: 'guardian',
    reason: 'روابط سبام واحتيال مالي صريح',
    timestamp: Date.now() - 100000,
    status: 'pending'
  });

  console.log('Report 2 created.');
  console.log('Seeding complete! You can exit.');
  process.exit(0);
}

seed().catch(console.error);
