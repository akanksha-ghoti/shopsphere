import {
  BrowserRouter,
  Routes,
  Route,
  Link,
} from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';

import {
  ProtectedRoute,
  AdminRoute,
} from './routes/ProtectedRoute';

function Home() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 p-10">
      <h1 className="mb-4 text-3xl font-bold">ShopSphere</h1>

      <p>Welcome, {user?.displayName || user?.email}</p>

      <button
        onClick={logout}
        className="mt-5 rounded-lg bg-red-600 px-5 py-2 text-white"
      >
        Logout
      </button>
    </div>
  );
}

function AdminDashboard() {
  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <p>Admin access granted.</p>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Home />} />
      </Route>

      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>

      <Route path="*" element={<NavigateHome />} />
    </Routes>
  );
}

function NavigateHome() {
  return <Link to="/" className="p-10 text-blue-600">Go Home</Link>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;