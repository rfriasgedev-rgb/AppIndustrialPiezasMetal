import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

export default function Login() {
    const [email, setEmail] = useState('');
    const [pw, setPw] = useState('');
    const [loading, setLoading] = useState(false);
    const [isWakingUp, setIsWakingUp] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();

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
                toast.info(t('login.translating_server_toast'), { autoClose: 20000 });
            }
        }, 5000);

        while (attempts < maxAttempts) {
            try {
                await login(email, pw);
                attemptSucceeded = true;
                clearTimeout(slowResponseTimeout);

                const showingWakeUpUI = attempts > 0 || document.querySelector('.fa-satellite-dish');
                if (showingWakeUpUI) {
                    toast.success(t('login.server_connected'));
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
                            toast.info(t('login.server_waking'), { autoClose: 20000 });
                        }
                    }
                    // Progressive delay to allow the server enough time to boot
                    const waitTime = attempts <= 3 ? 5000 : 8000;
                    await delay(waitTime); 
                } else {
                    attemptSucceeded = true;
                    clearTimeout(slowResponseTimeout);
                    
                    let errorData = err.response?.data?.error;
                    let msg = typeof errorData === 'object' && errorData !== null ? errorData.message : errorData;
                    msg = msg || (isSleepError ? t('login.server_timeout') : t('login.default_error'));
                    
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
                            {t('login.title')}
                        </h5>
                        
                        {errorMsg && (
                            <div className="alert alert-danger" style={{ borderRadius: '8px', fontSize: '0.9rem', padding: '10px' }}>
                                <i className="fas fa-exclamation-circle mr-2"></i> {errorMsg}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="form-group mb-3">
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>{t('login.email')}</label>
                                <div className="input-group">
                                    <input
                                        type="email" className="form-control bg-light" placeholder={t('login.email_placeholder')}
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
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>{t('login.password')}</label>
                                <div className="input-group">
                                    <input
                                        type="password" className="form-control bg-light" placeholder={t('login.password_placeholder')}
                                        value={pw} onChange={e => setPw(e.target.value)} required
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
                                    isWakingUp ? <><i className="fas fa-satellite-dish fa-spin mr-2"></i>{t('login.connecting')}</>
                                        : <><i className="fas fa-spinner fa-spin mr-2"></i>{t('login.verifying')}</>
                                ) : (
                                    <><i className="fas fa-sign-in-alt mr-2"></i>{t('login.login_btn')}</>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
                <p className="text-center text-muted mt-4" style={{ fontSize: '0.8rem', fontWeight: '500' }}>
                    {t('login.footer')}
                </p>
            </div>
        </div>
    );
}
