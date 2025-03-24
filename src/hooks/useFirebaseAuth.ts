import { useState, useEffect } from "react";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInAnonymously,
  onAuthStateChanged,
  signOut,
  User
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp, updateDoc, getDoc } from "firebase/firestore";
import { generateFunkyName } from '@/utils/nameGenerator';

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userRef);
        let nicknameToSet = "";
        const userData = userDoc.data();

        if (userData?.nickname) {
          // If nickname exists in Firestore, use it
          nicknameToSet = userData.nickname;
        } else {
          // Otherwise, fallback to localStorage or generate new
          nicknameToSet = localStorage.getItem("nickname") || generateFunkyName();
        }

        await setDoc(userRef, {
          uid: currentUser.uid,
          available: true,
          lastSeen: serverTimestamp(),
          online: true,
          isAnonymous: currentUser.isAnonymous,
          displayName: nicknameToSet || "Anonymous User", // Use nicknameToSet
          nickname: nicknameToSet, // Use nicknameToSet
          email: currentUser.email || null,
          path: `/users/${currentUser.uid}`,
          createdAt: serverTimestamp()
        }, { merge: true });
      }
      setUser(currentUser);
      setNickname(user?.displayName || ""); // Initialize nickname state
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email?: string, password?: string) => {
    setError(null);
    try {
      if (email && password) {
        // Sign in with email/password
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Sign in anonymously
        const result = await signInAnonymously(auth);
        const nickname = generateFunkyName();
        
        // Store user data with nickname
        await setDoc(doc(db, 'users', result.user.uid), {
          uid: result.user.uid,
          nickname,
          available: true,
          lastSeen: serverTimestamp(),
          online: true,
          isAnonymous: true,
          displayName: nickname,
          email: null,
          path: `/users/${result.user.uid}`,
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    }
  };

  const createAccount = async (email: string, password: string) => {
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    }
  };

  const logOut = async () => {
    setError(null);
    try {
      if (auth.currentUser) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          available: false, // Set available to false on logout
          online: false // Also set online to false on logout
        });
      }
      await signOut(auth);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    }
  };

  const updateNickname = async (newNickname: string) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        nickname: newNickname,
        displayName: newNickname
      }, { merge: true });
      
      // Update local storage
      localStorage.setItem("nickname", newNickname);
    } catch (error) {
      console.error('Update nickname error:', error);
    }
  };

  return {
    user,
    loading,
    error,
    signIn,
    createAccount,
    logOut,
    updateNickname,
    nickname
  };
}
