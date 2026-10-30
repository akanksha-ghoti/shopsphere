import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  getIdToken,
  getIdTokenResult,
  type User,
} from 'firebase/auth';

import { auth } from '../config/firebase';
import api from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const idToken = await getIdToken(firebaseUser);
          const tokenResult = await getIdTokenResult(firebaseUser);

          setUser(firebaseUser);
          setToken(idToken);

          setRole(
            tokenResult.claims.admin === true ||
              tokenResult.claims.role === 'admin'
              ? 'admin'
              : 'customer',
          );
        } else {
          setUser(null);
          setToken(null);
          setRole(null);
        }
      } catch (error) {
        console.error('Authentication state error:', error);
        setUser(null);
        setToken(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  async function syncUser(firebaseUser: User, name?: string) {
    await api.post('/users/sync', {
      email: firebaseUser.email,
      name: name || firebaseUser.displayName || firebaseUser.email?.split('@')[0],
      photoURL: firebaseUser.photoURL,
    });
  }

  async function login(email: string, password: string) {
    const result = await signInWithEmailAndPassword(auth, email, password);

    await syncUser(result.user);
  }

  async function register(
    name: string,
    email: string,
    password: string,
  ) {
    const result = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );

    await updateProfile(result.user, {
      displayName: name,
    });

    await syncUser(result.user, name);
  }

  async function logout() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}