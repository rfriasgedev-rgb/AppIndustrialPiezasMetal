import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, roles }) => {
    const { isAuthenticated, hasRole } = useAuth();
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (roles && !hasRole(...roles)) return <Navigate to="/unauthorized" replace />;
    return children;
};

export default PrivateRoute;
