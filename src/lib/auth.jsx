import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { auth, db, usernameToEmail } from './firebase';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const justLoggedIn = useRef(false);

  useEffect(
    () =>
      onAuthStateChanged(auth, async (u) => {
        if (!u) { setUser(null); setLoading(false); return; }
        // Only users with an admins/{uid} doc may use the CMS.
        const snap = await getDoc(doc(db, 'admins', u.uid)).catch(() => null);
        if (snap?.exists()) {
          const displayName = snap.data().displayName || snap.data().username || u.displayName;
          setUser({ uid: u.uid, username: snap.data().username || u.displayName, displayName });
          if (justLoggedIn.current) { justLoggedIn.current = false; toast.success(`Welcome back, ${displayName}`); }
        }
        else { await signOut(auth); setUser(null); }
        setLoading(false);
      }),
    [],
  );

  const login = async (username, password) => {
    justLoggedIn.current = true; // set first: the auth listener can fire before the sign-in promise resolves
    try {
      await signInWithEmailAndPassword(auth, usernameToEmail(username), password);
    } catch (e) {
      justLoggedIn.current = false;
      throw e;
    }
  };
  const logout = async () => {
    await signOut(auth);
    toast.success('You have been logged out');
  };
  return <AuthCtx.Provider value={{ user, loading, login, logout }}>{children}</AuthCtx.Provider>;
}
