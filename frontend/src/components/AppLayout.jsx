import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const navItems = [
    { path: '/', icon: 'fas fa-tachometer-alt', label: 'Dashboard', roles: null },
    { path: '/work-queue', icon: 'fas fa-clipboard-check', label: 'Mi Estación', roles: null },
    { path: '/planning', icon: 'fas fa-calendar-alt', label: 'Planificación M.R.P', roles: ['ADMIN', 'SUPERVISOR', 'VENTAS'] },
    { path: '/production', icon: 'fas fa-industry', label: 'Órdenes Producción', roles: null },
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
            <nav className="main-header navbar navbar-expand navbar-light bg-white" style={{ borderBottom: '1px solid #e2e8f0' }}>
                <ul className="navbar-nav">
                    <li className="nav-item">
                        <a className="nav-link text-secondary" data-widget="pushmenu" href="#"><i className="fas fa-bars"></i></a>
                    </li>
                    <li className="nav-item d-none d-sm-inline-block">
                        <span className="nav-link" style={{ color: '#4f46e5', fontWeight: 700 }}>
                            <i className="fas fa-cubes mr-1"></i>MetalERP
                        </span>
                    </li>
                </ul>
                <ul className="navbar-nav ml-auto">
                    <li className="nav-item">
                        <span className="nav-link" style={{ color: '#64748b' }}>
                            <i className="fas fa-user-circle mr-1"></i>
                            <span className="font-weight-medium text-dark mr-1">{user?.fullName}</span>
                            <span className="badge badge-light border ml-1" style={{ fontSize: '0.7rem', color: '#64748b' }}>{user?.role}</span>
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
            <aside className="main-sidebar sidebar-light-primary elevation-0" style={{ background: '#ffffff', borderRight: '1px solid #e2e8f0' }}>
                <a href="/" className="brand-link" style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                    <i className="fas fa-layer-group brand-image mt-1" style={{ color: '#4f46e5', marginLeft: '16px', fontSize: '1.4rem' }}></i>
                    <span className="brand-text font-weight-bold ml-2" style={{ color: '#0f172a', letterSpacing: '-0.02em' }}>Metal<span style={{ color: '#4f46e5' }}>ERP</span></span>
                </a>
                <div className="sidebar">
                    <nav className="mt-2">
                        <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
                            {navItems.map(item => {
                                if (item.roles && !hasRole(...item.roles)) return null;
                                const active = location.pathname === item.path;
                                return (
                                    <li className="nav-item" key={item.path}>
                                        <Link
                                            to={item.path}
                                            className={`nav-link ${active ? 'active' : ''}`}
                                            style={active ? { background: '#eef2ff', color: '#4338ca', fontWeight: 600, borderRadius: '8px', margin: '0 8px' } : { color: '#64748b', margin: '0 8px' }}
                                        >
                                            <i className={`${item.icon} nav-icon`} style={active ? { color: '#4f46e5' } : {}}></i>
                                            <p>{item.label}</p>
                                        </Link>
                                    </li>
                                );
                            })}

                            {/* Configurations Submenu - Only ADMIN */}
                            {hasRole('ADMIN') && (
                                <li className={`nav-item has-treeview ${location.pathname.startsWith('/units') || location.pathname.startsWith('/categories') ? 'menu-open' : ''}`}>
                                    <a href="#" className={`nav-link ${location.pathname.startsWith('/units') || location.pathname.startsWith('/categories') ? 'active' : ''}`} style={location.pathname.startsWith('/units') || location.pathname.startsWith('/categories') ? { background: '#eef2ff', color: '#4338ca', fontWeight: 600, borderRadius: '8px', margin: '0 8px' } : { color: '#64748b', margin: '0 8px' }}>
                                        <i className="nav-icon fas fa-cogs" style={location.pathname.startsWith('/units') || location.pathname.startsWith('/categories') ? { color: '#4f46e5'} : {}}></i>
                                        <p>
                                            Configuraciones
                                            <i className="right fas fa-angle-left"></i>
                                        </p>
                                    </a>
                                    <ul className="nav nav-treeview ml-2">
                                        <li className="nav-item">
                                            <Link to="/categories" className={`nav-link ${location.pathname === '/categories' ? 'active' : ''}`} style={location.pathname === '/categories' ? { color: '#4f46e5', fontWeight: 600 } : { color: '#64748b' }}>
                                                <i className="fas fa-circle nav-icon" style={{ fontSize: '0.5rem', marginTop: '4px' }}></i>
                                                <p>Categorías</p>
                                            </Link>
                                        </li>
                                        <li className="nav-item">
                                            <Link to="/units" className={`nav-link ${location.pathname === '/units' ? 'active' : ''}`} style={location.pathname === '/units' ? { color: '#4f46e5', fontWeight: 600 } : { color: '#64748b' }}>
                                                <i className="fas fa-circle nav-icon" style={{ fontSize: '0.5rem', marginTop: '4px' }}></i>
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

            <footer className="main-footer" style={{ background: '#ffffff', color: '#64748b', borderTop: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                <strong>MetalERP</strong> · Sistema de Producción Industrial · v2.0 Minimalist
            </footer>
        </div>
    );
}
