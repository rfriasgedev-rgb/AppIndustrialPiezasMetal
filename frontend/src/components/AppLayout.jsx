import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { companyService } from '../services/company.service';

const navItems = [
    { path: '/', icon: 'fas fa-tachometer-alt', labelKey: 'dashboard', roles: null },
    { path: '/operator-stats', icon: 'fas fa-chart-bar', labelKey: 'operatorStats', roles: ['ADMIN', 'SUPERVISOR'] },
    { path: '/work-queue', icon: 'fas fa-clipboard-check', labelKey: 'myStation', roles: null },
    { path: '/my-orders', icon: 'fas fa-tasks', labelKey: 'myOrders', roles: null },
    { path: '/planning', icon: 'fas fa-calendar-alt', labelKey: 'mrpPlanning', roles: ['ADMIN', 'SUPERVISOR', 'VENTAS'] },
    { path: '/production', icon: 'fas fa-industry', labelKey: 'productionOrders', roles: null },
    { path: '/inventory', icon: 'fas fa-boxes', labelKey: 'materialInventory', roles: null },
    { path: '/products', icon: 'fas fa-layer-group', labelKey: 'productsMaster', roles: ['ADMIN', 'VENTAS', 'SUPERVISOR'] },
    { path: '/purchases', icon: 'fas fa-shopping-cart', labelKey: 'purchases', roles: ['ADMIN', 'ALMACENISTA', 'SUPERVISOR'] },
    { path: '/clients', icon: 'fas fa-users', labelKey: 'clients', roles: null },
    { path: '/users', icon: 'fas fa-user-cog', labelKey: 'users', roles: ['ADMIN'] },
];

export default function AppLayout({ children }) {
    const { user, logout, hasRole } = useAuth();
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    
    const [configMenuOpen, setConfigMenuOpen] = useState(false);
    const [companyName, setCompanyName] = useState('');

    // Carga el nombre de la empresa para mostrarlo en el header
    const loadCompanyName = async () => {
        try {
            const data = await companyService.getCompany();
            if (data?.name) setCompanyName(data.name);
        } catch (_) { /* silencioso si no hay registro */ }
    };

    useEffect(() => {
        loadCompanyName();
        // Escuchar evento de actualización desde Company.jsx
        window.addEventListener('company-updated', loadCompanyName);
        return () => window.removeEventListener('company-updated', loadCompanyName);
    }, []);

    useEffect(() => {
        const configRoutes = ['/categories', '/units', '/departments', '/schedules', '/employee-roles', '/employees', '/production-lines', '/company'];
        if (configRoutes.some(path => location.pathname.startsWith(path))) {
            setConfigMenuOpen(true);
        }
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        toast.info(t('appLayout.loggedOut'));
        navigate('/login');
    };

    const changeLanguage = (e) => {
        i18n.changeLanguage(e.target.value);
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
                            {companyName && (
                                <>
                                    <span style={{ color: '#94a3b8', fontWeight: 400, margin: '0 6px' }}>—</span>
                                    <span style={{ color: '#0f172a', fontWeight: 600 }}>{companyName}</span>
                                </>
                            )}
                        </span>
                    </li>
                </ul>
                <ul className="navbar-nav ml-auto">
                    <li className="nav-item d-flex align-items-center">
                        <select 
                            className="form-select form-select-sm border-0 mr-3" 
                            style={{ background: '#f8fafc', color: '#475569', fontWeight: 500, borderRadius: '6px', outline: 'none' }}
                            value={i18n.language} 
                            onChange={changeLanguage}
                        >
                            <option value="en">English</option>
                            <option value="es">Español</option>
                        </select>
                    </li>
                    <li className="nav-item">
                        <span className="nav-link" style={{ color: '#64748b' }}>
                            <i className="fas fa-user-circle mr-1"></i>
                            <span className="font-weight-medium text-dark mr-1">{user?.fullName}</span>
                            <span className="badge badge-light border ml-1" style={{ fontSize: '0.7rem', color: '#64748b' }}>{user?.role}</span>
                        </span>
                    </li>
                    <li className="nav-item">
                        <button className="btn btn-sm btn-outline-danger ml-2 mt-2" title={t('appLayout.logout')} onClick={handleLogout}>
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
                                            <p>{t(`appLayout.${item.labelKey}`)}</p>
                                        </Link>
                                    </li>
                                );
                            })}

                            {/* Configurations Submenu - Only ADMIN */}
                            {hasRole('ADMIN') && (
                                <li className={`nav-item has-treeview ${configMenuOpen ? 'menu-open' : ''}`}>
                                    <a href="#" className={`nav-link ${configMenuOpen ? 'active' : ''}`} 
                                       style={configMenuOpen ? { background: '#eef2ff', color: '#4338ca', fontWeight: 600, borderRadius: '8px', margin: '0 8px' } : { color: '#64748b', margin: '0 8px' }}
                                       onClick={(e) => { e.preventDefault(); setConfigMenuOpen(!configMenuOpen); }}
                                    >
                                        <i className="nav-icon fas fa-cogs" style={configMenuOpen ? { color: '#4f46e5'} : {}}></i>
                                        <p>
                                            {t('appLayout.configurations')}
                                            <i className="right fas fa-angle-left"></i>
                                        </p>
                                    </a>
                                    <ul className="nav nav-treeview ml-2" style={{ display: configMenuOpen ? 'block' : 'none' }}>
                                        <li className="nav-item">
                                            <Link to="/categories" className={`nav-link ${location.pathname === '/categories' ? 'active' : ''}`} style={location.pathname === '/categories' ? { color: '#4f46e5', fontWeight: 600 } : { color: '#64748b' }}>
                                                <i className="fas fa-circle nav-icon" style={{ fontSize: '0.5rem', marginTop: '4px' }}></i>
                                                <p>{t('appLayout.categories')}</p>
                                            </Link>
                                        </li>
                                        <li className="nav-item">
                                            <Link to="/units" className={`nav-link ${location.pathname === '/units' ? 'active' : ''}`} style={location.pathname === '/units' ? { color: '#4f46e5', fontWeight: 600 } : { color: '#64748b' }}>
                                                <i className="fas fa-circle nav-icon" style={{ fontSize: '0.5rem', marginTop: '4px' }}></i>
                                                <p>{t('appLayout.measurementUnits')}</p>
                                            </Link>
                                        </li>
                                        <li className="nav-item">
                                            <Link to="/departments" className={`nav-link ${location.pathname === '/departments' ? 'active' : ''}`} style={location.pathname === '/departments' ? { color: '#4f46e5', fontWeight: 600 } : { color: '#64748b' }}>
                                                <i className="fas fa-circle nav-icon" style={{ fontSize: '0.5rem', marginTop: '4px' }}></i>
                                                <p>{t('appLayout.departments')}</p>
                                            </Link>
                                        </li>
                                        <li className="nav-item">
                                            <Link to="/schedules" className={`nav-link ${location.pathname === '/schedules' ? 'active' : ''}`} style={location.pathname === '/schedules' ? { color: '#4f46e5', fontWeight: 600 } : { color: '#64748b' }}>
                                                <i className="fas fa-circle nav-icon" style={{ fontSize: '0.5rem', marginTop: '4px' }}></i>
                                                <p>{t('appLayout.schedules')}</p>
                                            </Link>
                                        </li>
                                        <li className="nav-item">
                                            <Link to="/employee-roles" className={`nav-link ${location.pathname === '/employee-roles' ? 'active' : ''}`} style={location.pathname === '/employee-roles' ? { color: '#4f46e5', fontWeight: 600 } : { color: '#64748b' }}>
                                                <i className="fas fa-circle nav-icon" style={{ fontSize: '0.5rem', marginTop: '4px' }}></i>
                                                <p>{t('appLayout.employeeRoles')}</p>
                                            </Link>
                                        </li>
                                        <li className="nav-item">
                                            <Link to="/employees" className={`nav-link ${location.pathname === '/employees' ? 'active' : ''}`} style={location.pathname === '/employees' ? { color: '#4f46e5', fontWeight: 600 } : { color: '#64748b' }}>
                                                <i className="fas fa-circle nav-icon" style={{ fontSize: '0.5rem', marginTop: '4px' }}></i>
                                                <p>{t('appLayout.employees')}</p>
                                            </Link>
                                        </li>
                                        <li className="nav-item">
                                            <Link to="/production-lines" className={`nav-link ${location.pathname === '/production-lines' ? 'active' : ''}`} style={location.pathname === '/production-lines' ? { color: '#4f46e5', fontWeight: 600 } : { color: '#64748b' }}>
                                                <i className="fas fa-circle nav-icon" style={{ fontSize: '0.5rem', marginTop: '4px' }}></i>
                                                <p>{t('appLayout.productionLines')}</p>
                                            </Link>
                                        </li>
                                        <li className="nav-item">
                                            <Link to="/company" className={`nav-link ${location.pathname === '/company' ? 'active' : ''}`} style={location.pathname === '/company' ? { color: '#4f46e5', fontWeight: 600 } : { color: '#64748b' }}>
                                                <i className="fas fa-circle nav-icon" style={{ fontSize: '0.5rem', marginTop: '4px' }}></i>
                                                <p>{t('appLayout.company')}</p>
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
