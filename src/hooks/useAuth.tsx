import React, { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged, signInAnonymously, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { handleFirestoreError } from '../App';

enum OperationType {
  GET = 'get',
}

interface UserStats {
  uid: string;
  createdAt: number;
  credits: number;
  dailyPoints: number;
  lastPointDate: string;
  badges: string[];
  completed_sessions: number;
  confessions: number;
  guardian_sessions: number;
  avg_rating: number;
  lastSeen: number;
  email?: string;
  name?: string;
  photoUrl?: string;
}

interface AuthContextType {
  user: UserStats | null;
  loading: boolean;
  login: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  isBanned: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserStats | null>(null);
  const [isBanned, setIsBanned] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubDoc: (() => void) | undefined;
    let unsubBan: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous listeners if auth state changes
      if (unsubDoc) unsubDoc();
      if (unsubBan) unsubBan();

      if (firebaseUser) {
        
        // Listen to ban status
        const banRef = doc(db, 'banned_users', firebaseUser.uid);
        unsubBan = onSnapshot(banRef, (snap) => {
          setIsBanned(snap.exists());
        }, () => {});

        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Listen to user document
        unsubDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUser(docSnap.data() as UserStats);
          } else {
            // Create initial user doc
            const initialUser: UserStats = {
              uid: firebaseUser.uid,
              createdAt: Date.now(),
              credits: 0,
              dailyPoints: 0,
              lastPointDate: new Date().toISOString().split('T')[0],
              badges: ['Listener Basic'],
              completed_sessions: 0,
              confessions: 0,
              guardian_sessions: 0,
              avg_rating: 0,
              lastSeen: Date.now(),
              ...(firebaseUser.email ? { email: firebaseUser.email } : {}),
              ...(firebaseUser.displayName ? { name: firebaseUser.displayName } : {}),
              ...(firebaseUser.photoURL ? { photoUrl: firebaseUser.photoURL } : {})
            };
            setDoc(userRef, initialUser).catch(console.error);
            setUser(initialUser);
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          setLoading(false); // Make sure we stop loading on error as well
        });
        
      } else {
        setUser(null);
        setIsBanned(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubDoc) unsubDoc();
      if (unsubBan) unsubBan();
    };
  }, []);

  const login = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Error signing in anonymously:", error);
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const logout = () => {
    auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, logout, isBanned }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
