import React, { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface UserStats {
  uid: string;
  createdAt: number;
  completed_sessions: number;
  confessions: number;
  guardian_sessions: number;
  avg_rating: number;
  lastSeen: number;
}

interface AuthContextType {
  user: UserStats | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Listen to user document
        const unsubDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUser(docSnap.data() as UserStats);
          } else {
            // Create initial user doc
            const initialUser: UserStats = {
              uid: firebaseUser.uid,
              createdAt: Date.now(),
              completed_sessions: 0,
              confessions: 0,
              guardian_sessions: 0,
              avg_rating: 0,
              lastSeen: Date.now()
            };
            setDoc(userRef, initialUser).catch(console.error);
            setUser(initialUser);
          }
          setLoading(false);
        });
        
        return () => unsubDoc();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Error signing in anonymously:", error);
    }
  };

  const logout = () => {
    auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
