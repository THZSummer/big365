import { Link, Outlet, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: '首页' },
  { path: '/biz', label: '业务管理' },
  { path: '/docs', label: '文档' },
];

function Layout() {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #1a73e8, #0d47a1)',
        color: '#fff',
        padding: '0 24px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>
        <Link to="/" style={{ color: '#fff', fontSize: '20px', fontWeight: 700, textDecoration: 'none' }}>
          big365
        </Link>
        <nav style={{ display: 'flex', gap: '8px' }}>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                color: '#fff',
                padding: '6px 16px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '14px',
                background: location.pathname === item.path ? 'rgba(255,255,255,0.2)' : 'transparent',
                transition: 'background 0.2s',
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Breadcrumb */}
      {pathSegments.length > 0 && (
        <div style={{
          padding: '12px 24px',
          fontSize: '13px',
          color: '#666',
          background: '#fff',
          borderBottom: '1px solid #eee',
        }}>
          <Link to="/" style={{ color: '#1a73e8' }}>首页</Link>
          {pathSegments.map((seg, idx) => (
            <span key={idx}>
              {' / '}
              <span style={{ color: idx === pathSegments.length - 1 ? '#333' : '#666' }}>
                {seg}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Content */}
      <main style={{ flex: 1, padding: '24px' }}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '16px',
        fontSize: '12px',
        color: '#999',
        borderTop: '1px solid #eee',
      }}>
        big365 - 开源多维数据服务 MVP
      </footer>
    </div>
  );
}

export default Layout;
