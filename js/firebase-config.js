/**
 * Firebase Configuration for SiDini-Tensi
 * Koneksi ke Firestore Database (Cloud)
 */

let firestoreDB = null;
let auth = null;

try {
    const firebaseConfig = {
        apiKey: "AIzaSyB5z-RTgAeTkBbEdmDRCzA0qpvlj6wDo9E",
        authDomain: "sidini-tensi.firebaseapp.com",
        projectId: "sidini-tensi",
        storageBucket: "sidini-tensi.firebasestorage.app",
        messagingSenderId: "750077463914",
        appId: "1:750077463914:web:006106cf36b2380a742913",
        measurementId: "G-E8QV5TP9X0"
    };

    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        firestoreDB = firebase.firestore();
        auth = firebase.auth();

        // Enable offline persistence (hanya jika bukan file:// karena IndexedDB diblokir browser di lokal)
        if (window.location.protocol !== 'file:') {
            firestoreDB.enablePersistence({ synchronizeTabs: true }).catch(err => {
                console.warn('Firestore persistence warning:', err.code);
            });
        } else {
            console.warn('⚠️ Menjalankan via file:// — Offline persistence dinonaktifkan untuk mencegah crash.');
        }

        console.log('🔥 Firebase initialized successfully!');
    } else {
        console.warn('⚠️ Firebase SDK not loaded. Running in offline mode.');
    }
} catch (e) {
    console.warn('⚠️ Firebase initialization failed:', e);
    firestoreDB = null;
    auth = null;
}
