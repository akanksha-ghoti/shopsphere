import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, register, user, loading } = useAuth();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (isRegister) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }

      navigate('/');
    } catch (err) {
      const error = err as { code?: string };

      const messages: Record<string, string> = {
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/email-already-in-use': 'This email is already registered.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/user-not-found': 'Account not found.',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
        'auth/network-request-failed': 'Network error. Check your connection.',
      };

      setError(
        messages[error.code || ''] || 'Authentication failed. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  if (user) {
    return (
      <div className="p-10 text-center">
        You are already logged in.
        <button
          onClick={() => navigate('/')}
          className="ml-3 text-blue-600"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-center text-3xl font-bold text-gray-900">
          ShopSphere
        </h1>

        <p className="mb-8 text-center text-gray-500">
          {isRegister ? 'Create your account' : 'Welcome back'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegister && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                Full Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                placeholder="Enter your name"
                className="w-full rounded-lg border p-3 outline-none focus:border-blue-500"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">
              Email Address
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              className="w-full rounded-lg border p-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Enter your password"
              className="w-full rounded-lg border p-3 outline-none focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-100 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting
              ? 'Please wait...'
              : isRegister
                ? 'Create Account'
                : 'Login'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          {isRegister
            ? 'Already have an account?'
            : "Don't have an account?"}

          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="ml-2 font-semibold text-blue-600"
          >
            {isRegister ? 'Login' : 'Register'}
          </button>
        </p>
      </div>
    </div>
  );
}