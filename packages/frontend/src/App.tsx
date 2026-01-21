import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import UserLayout from './layouts/UserLayout';
import AdminLogin from './pages/admin/Login';
import GameList from './pages/admin/GameList';
import GameEdit from './pages/admin/GameEdit';
import GameUpload from './pages/admin/GameUpload';
import InviteCodes from './pages/admin/InviteCodes';
import UserList from './pages/admin/UserList';
import MfaSetup from './pages/admin/MfaSetup';
import FileManager from './pages/admin/FileManager';
import Home from './pages/user/Home';
import GamePlay from './pages/user/GamePlay';
import { useAdminStore } from './stores/adminStore';

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAdminStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<UserLayout />}>
        <Route index element={<Home />} />
        <Route path="play/:id" element={<GamePlay />} />
      </Route>
      
      <Route path="/admin/login" element={<AdminLogin />} />
      
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<Navigate to="/admin/games" replace />} />
        <Route path="games" element={<GameList />} />
        <Route path="games/new" element={<GameUpload />} />
        <Route path="games/:id/edit" element={<GameEdit />} />
        <Route path="games/:id/files" element={<FileManager />} />
        <Route path="invite-codes" element={<InviteCodes />} />
        <Route path="users" element={<UserList />} />
        <Route path="mfa" element={<MfaSetup />} />
      </Route>
    </Routes>
  );
}

export default App;
