import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isWakingUp, setIsWakingUp] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setIsWakingUp(false);

        let attempts = 0;
        const maxAttempts = 6; // Max 30 seconds wait

        while (attempts < maxAttempts) {
            try {
                await login(email, password);
                if (attempts > 0) {
                    toast.success('¡Servidor conectado exitosamente!');
                }
                navigate('/');
                return; // Exit on success
            } catch (err) {
                const status = err.response?.status;
                // Railway free tier gives 502/503/504 or network error when cold starting
                const isSleepError = !err.response || status === 502 || status === 503 || status === 504;

                if (isSleepError && attempts < maxAttempts - 1) {
                    attempts++;
                    if (!isWakingUp || attempts === 1) {
                        setIsWakingUp(true);
                        toast.info('Servidor hibernando. Despertando máquina... (puede tomar hasta 30 segundos)', { autoClose: 10000 });
                    }
                    await delay(5000); // 5 seconds interval
                } else {
                    toast.error(err.response?.data?.error || (isSleepError ? 'El servidor tardó demasiado en responder. Intente de nuevo.' : 'Error al iniciar sesión.'));
                    setLoading(false);
                    setIsWakingUp(false);
                    return; // Exit loop on normal error
                }
            }
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
                                        {loading ? (
                                            isWakingUp ? <><i className="fas fa-satellite-dish fa-spin mr-2"></i>Conectando Nube...</>
                                                : <><i className="fas fa-spinner fa-spin mr-2"></i>Ingresando...</>
                                        ) : (
                                            <><i className="fas fa-sign-in-alt mr-2"></i>Ingresar al Sistema</>
                                        )}
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
