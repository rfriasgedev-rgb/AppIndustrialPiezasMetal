import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isWakingUp, setIsWakingUp] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setIsWakingUp(false);
        setErrorMsg('');

        let attempts = 0;
        const maxAttempts = 12; // Max retries
        let attemptSucceeded = false;

        // Alert user if the very first request hangs (Railway proxy holding connection)
        const slowResponseTimeout = setTimeout(() => {
            if (!attemptSucceeded) {
                setIsWakingUp(true);
                toast.info('El servidor está en hibernación. Despertando la base de datos y máquina... (puede tomar más de un minuto)', { autoClose: 20000 });
            }
        }, 5000);

        while (attempts < maxAttempts) {
            try {
                await login(email, password);
                attemptSucceeded = true;
                clearTimeout(slowResponseTimeout);

                const showingWakeUpUI = attempts > 0 || document.querySelector('.fa-satellite-dish');
                if (showingWakeUpUI) {
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
                    if (attempts === 1 && attemptSucceeded === false) {
                        // Make sure we show the toast if not already shown by the setTimeout
                        if (!document.querySelector('.fa-satellite-dish')) {
                            setIsWakingUp(true);
                            toast.info('Servidor en hibernación, activando sistema...', { autoClose: 20000 });
                        }
                    }
                    // Progressive delay to allow the server enough time to boot
                    const waitTime = attempts <= 3 ? 5000 : 8000;
                    await delay(waitTime); 
                } else {
                    attemptSucceeded = true;
                    clearTimeout(slowResponseTimeout);
                    const msg = err.response?.data?.error || (isSleepError ? 'El servidor tardó demasiado en iniciar.' : 'Credenciales inválidas o error de conexión.');
                    toast.error(msg);
                    setErrorMsg(msg);
                    setLoading(false);
                    setIsWakingUp(false);
                    return; // Exit loop on normal error
                }
            }
        }
    };

    return (
        <div className="login-page d-flex justify-content-center align-items-center" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
            <div className="login-box" style={{ width: '400px' }}>
                <div className="login-logo text-center mb-4">
                    <a href="#" style={{ color: '#4f46e5', fontSize: '2.5rem', fontWeight: '800', textDecoration: 'none' }}>
                        <i className="fas fa-cogs mr-2 text-indigo"></i>
                        <b>Metal</b>ERP
                    </a>
                </div>
                <div className="card border-0" style={{ borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.06)' }}>
                    <div className="card-body p-5">
                        <h5 className="text-center mb-4 font-weight-bold" style={{ color: '#0f172a' }}>
                            Sistema de Producción
                        </h5>
                        
                        {errorMsg && (
                            <div className="alert alert-danger" style={{ borderRadius: '8px', fontSize: '0.9rem', padding: '10px' }}>
                                <i className="fas fa-exclamation-circle mr-2"></i> {errorMsg}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="form-group mb-3">
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>CORREO ELECTRÓNICO</label>
                                <div className="input-group">
                                    <input
                                        type="email" className="form-control bg-light" placeholder="tu@correo.com"
                                        value={email} onChange={e => setEmail(e.target.value)} required
                                        style={{ border: 'none', borderRadius: '8px 0 0 8px', padding: '12px' }}
                                    />
                                    <div className="input-group-append">
                                        <div className="input-group-text bg-light border-0" style={{ borderRadius: '0 8px 8px 0' }}>
                                            <span className="fas fa-envelope text-muted"></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="form-group mb-4">
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>CONTRASEÑA</label>
                                <div className="input-group">
                                    <input
                                        type="password" className="form-control bg-light" placeholder="••••••••"
                                        value={password} onChange={e => setPassword(e.target.value)} required
                                        style={{ border: 'none', borderRadius: '8px 0 0 8px', padding: '12px' }}
                                    />
                                    <div className="input-group-append">
                                        <div className="input-group-text bg-light border-0" style={{ borderRadius: '0 8px 8px 0' }}>
                                            <span className="fas fa-lock text-muted"></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="submit" className="btn btn-block w-100"
                                disabled={loading}
                                style={{ background: '#4f46e5', color: '#fff', borderRadius: '8px', fontWeight: 600, padding: '12px', transition: 'all 0.2s' }}
                            >
                                {loading ? (
                                    isWakingUp ? <><i className="fas fa-satellite-dish fa-spin mr-2"></i>Conectando Servidor...</>
                                        : <><i className="fas fa-spinner fa-spin mr-2"></i>Verificando...</>
                                ) : (
                                    <><i className="fas fa-sign-in-alt mr-2"></i>Ingresar a MetalERP</>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
                <p className="text-center text-muted mt-4" style={{ fontSize: '0.8rem', fontWeight: '500' }}>
                    MetalERP v1.0 · Diseño Minimalista
                </p>
            </div>
        </div>
    );
}
