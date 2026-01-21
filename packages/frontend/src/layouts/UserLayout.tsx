import { Outlet } from 'react-router-dom';

export default function UserLayout() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #e4edf5 100%)' }}>
      <Outlet />
    </div>
  );
}
