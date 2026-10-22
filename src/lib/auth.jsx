import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, usernameToEmail } from './firebase';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(
    () =>
      onAuthStateChanged(auth, async (u) => {
        if (!u) { setUser(null); setLoading(false); return; }
        // Only users with an admins/{uid} doc may use the CMS.
        const snap = await getDoc(doc(db, 'admins', u.uid)).catch(() => null);
        if (snap?.exists()) setUser({ uid: u.uid, username: snap.data().username || u.displayName });
        else { await signOut(auth); setUser(null); }
        setLoading(false);
      }),
    [],
  );

  const login = (username, password) => signInWithEmailAndPassword(auth, usernameToEmail(username), password);
  const logout = () => signOut(auth);
  return <AuthCtx.Provider value={{ user, loading, login, logout }}>{children}</AuthCtx.Provider>;
}
