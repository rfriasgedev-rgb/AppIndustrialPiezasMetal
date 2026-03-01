import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Error al iniciar sesión.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', minHeight: '100vh' }}>
            <div className="login-box" style={{ marginTop: 0 }}>
                <div className="login-logo">
                    <a href="#" style={{ color: '#e94560' }}>
                        <i className="fas fa-cogs mr-2"></i>
                        <b>Metal</b>ERP
                    </a>
                </div>
                <div className="card" style={{ borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
                    <div className="card-body login-card-body">
                        <p className="login-box-msg" style={{ fontSize: '0.9rem', color: '#666' }}>
                            Sistema de Producción Industrial
                        </p>
                        <form onSubmit={handleSubmit}>
                            <div className="input-group mb-3">
                                <input
                                    type="email" className="form-control" placeholder="Correo electrónico"
                                    value={email} onChange={e => setEmail(e.target.value)} required
                                    style={{ borderRadius: '8px 0 0 8px' }}
                                />
                                <div className="input-group-append">
                                    <div className="input-group-text" style={{ borderRadius: '0 8px 8px 0' }}>
                                        <span className="fas fa-envelope text-muted"></span>
                                    </div>
                                </div>
                            </div>
                            <div className="input-group mb-3">
                                <input
                                    type="password" className="form-control" placeholder="Contraseña"
                                    value={password} onChange={e => setPassword(e.target.value)} required
                                    style={{ borderRadius: '8px 0 0 8px' }}
                                />
                                <div className="input-group-append">
                                    <div className="input-group-text" style={{ borderRadius: '0 8px 8px 0' }}>
                                        <span className="fas fa-lock text-muted"></span>
                                    </div>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-12">
                                    <button
                                        type="submit" className="btn btn-block"
                                        disabled={loading}
                                        style={{ background: '#e94560', color: '#fff', borderRadius: '8px', fontWeight: 600, padding: '10px' }}
                                    >
                                        {loading ? <><i className="fas fa-spinner fa-spin mr-2"></i>Ingresando...</> : <>
                                            <i className="fas fa-sign-in-alt mr-2"></i>Ingresar al Sistema</>}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontSize: '0.75rem', marginTop: '12px' }}>
                    MetalERP v1.0 · Producción Industrial
                </p>
            </div>
        </div>
    );
}
