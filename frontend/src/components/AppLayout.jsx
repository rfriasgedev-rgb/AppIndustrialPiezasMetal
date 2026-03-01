import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const navItems = [
    { path: '/', icon: 'fas fa-tachometer-alt', label: 'Dashboard', roles: null },
    { path: '/production', icon: 'fas fa-industry', label: 'Producción', roles: null },
    { path: '/inventory', icon: 'fas fa-boxes', label: 'Inventario de Material', roles: null },
    { path: '/products', icon: 'fas fa-layer-group', label: 'Productos (Maestro)', roles: ['ADMIN', 'VENTAS', 'SUPERVISOR'] },
    { path: '/purchases', icon: 'fas fa-shopping-cart', label: 'Compras', roles: ['ADMIN', 'ALMACENISTA', 'SUPERVISOR'] },
    { path: '/clients', icon: 'fas fa-users', label: 'Clientes', roles: null },
    { path: '/users', icon: 'fas fa-user-cog', label: 'Usuarios', roles: ['ADMIN'] },
];

export default function AppLayout({ children }) {
    const { user, logout, hasRole } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        toast.info('Sesión cerrada.');
        navigate('/login');
    };

    return (
        <div className="wrapper">
            {/* Navbar */}
            <nav className="main-header navbar navbar-expand navbar-dark" style={{ background: '#1a1a2e', borderBottom: '2px solid #e94560' }}>
                <ul className="navbar-nav">
                    <li className="nav-item">
                        <a className="nav-link" data-widget="pushmenu" href="#"><i className="fas fa-bars"></i></a>
                    </li>
                    <li className="nav-item d-none d-sm-inline-block">
                        <span className="nav-link" style={{ color: '#e94560', fontWeight: 700 }}>
                            <i className="fas fa-cogs mr-1"></i>MetalERP
                        </span>
                    </li>
                </ul>
                <ul className="navbar-nav ml-auto">
                    <li className="nav-item">
                        <span className="nav-link" style={{ color: '#aaa' }}>
                            <i className="fas fa-user-circle mr-1"></i>
                            {user?.fullName}
                            <span className="badge badge-secondary ml-2" style={{ fontSize: '0.65rem' }}>{user?.role}</span>
                        </span>
                    </li>
                    <li className="nav-item">
                        <button className="btn btn-sm btn-outline-danger ml-2 mt-2" onClick={handleLogout}>
                            <i className="fas fa-sign-out-alt"></i>
                        </button>
                    </li>
                </ul>
            </nav>

            {/* Sidebar */}
            <aside className="main-sidebar sidebar-dark-primary elevation-4" style={{ background: '#16213e' }}>
                <a href="/" className="brand-link" style={{ background: '#1a1a2e', borderBottom: '1px solid #e94560' }}>
                    <i className="fas fa-cogs brand-image" style={{ color: '#e94560', marginLeft: '12px', fontSize: '1.4rem' }}></i>
                    <span className="brand-text font-weight-bold ml-2" style={{ color: '#fff' }}>Metal<span style={{ color: '#e94560' }}>ERP</span></span>
                </a>
                <div className="sidebar">
                    <nav className="mt-2">
                        <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu">
                            {navItems.map(item => {
                                if (item.roles && !hasRole(...item.roles)) return null;
                                const active = location.pathname === item.path;
                                return (
                                    <li className="nav-item" key={item.path}>
                                        <Link
                                            to={item.path}
                                            className={`nav-link ${active ? 'active' : ''}`}
                                            style={active ? { background: '#e94560' } : { color: '#c2c7d0' }}
                                        >
                                            <i className={`${item.icon} nav-icon`}></i>
                                            <p>{item.label}</p>
                                        </Link>
                                    </li>
                                );
                            })}

                            {/* Configurations Submenu - Only ADMIN */}
                            {hasRole('ADMIN') && (
                                <li className={`nav-item ${location.pathname.startsWith('/units') || location.pathname.startsWith('/categories') ? 'menu-open' : ''}`}>
                                    <a href="#" className={`nav-link ${location.pathname.startsWith('/units') || location.pathname.startsWith('/categories') ? 'active' : ''}`} style={location.pathname.startsWith('/units') || location.pathname.startsWith('/categories') ? { background: '#e94560' } : { color: '#c2c7d0' }}>
                                        <i className="nav-icon fas fa-cogs"></i>
                                        <p>
                                            Configuraciones
                                            <i className="right fas fa-angle-left"></i>
                                        </p>
                                    </a>
                                    <ul className="nav nav-treeview" style={{ display: location.pathname.startsWith('/units') || location.pathname.startsWith('/categories') ? 'block' : 'none' }}>
                                        <li className="nav-item">
                                            <Link to="/categories" className={`nav-link ${location.pathname === '/categories' ? 'active' : ''}`} style={location.pathname === '/categories' ? { color: '#1a1a2e', fontWeight: 'bold' } : { color: '#c2c7d0' }}>
                                                <i className="fas fa-cubes nav-icon"></i>
                                                <p>Categorías</p>
                                            </Link>
                                        </li>
                                        <li className="nav-item">
                                            <Link to="/units" className={`nav-link ${location.pathname === '/units' ? 'active' : ''}`} style={location.pathname === '/units' ? { color: '#1a1a2e', fontWeight: 'bold' } : { color: '#c2c7d0' }}>
                                                <i className="fas fa-ruler-combined nav-icon"></i>
                                                <p>Unidades de Medida</p>
                                            </Link>
                                        </li>
                                    </ul>
                                </li>
                            )}
                        </ul>
                    </nav>
                </div>
            </aside>

            {/* Content */}
            <div className="content-wrapper" style={{ background: '#f4f6f9', minHeight: '100vh' }}>
                <div className="content pt-3">
                    <div className="container-fluid">
                        {children}
                    </div>
                </div>
            </div>

            <footer className="main-footer" style={{ background: '#1a1a2e', color: '#666', borderTop: '1px solid #e94560' }}>
                <strong>MetalERP</strong> · Sistema de Producción Industrial · v1.0
            </footer>
        </div>
    );
}
