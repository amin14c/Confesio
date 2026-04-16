importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBw2ToKyklm6KDvDXaxYLGwhMYnAHo5gTA",
  authDomain: "gen-lang-client-0806690920.firebaseapp.com",
  projectId: "gen-lang-client-0806690920",
  storageBucket: "gen-lang-client-0806690920.firebasestorage.app",
  messagingSenderId: "632846839546",
  appId: "1:632846839546:web:86b816691f8d3fd2e02343"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: '/vite.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
