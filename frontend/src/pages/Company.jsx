import { useState, useEffect } from 'react';
import { companyService } from '../services/company.service';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

export default function Company() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    setLoading(true);
    try {
      const data = await companyService.getCompany();
      if (data) {
        setFormData({
          name:  data.name  || '',
          phone: data.phone || '',
          email: data.email || '',
        });
      }
    } catch (error) {
      toast.error(t('company.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await companyService.upsertCompany(formData);
      toast.success(t('company.saveSuccess'));
      // Recargar para refrescar el header si la página lo usa en contexto
      window.dispatchEvent(new Event('company-updated'));
    } catch (error) {
      toast.error(error.response?.data?.error || t('company.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0">
            <i className="fas fa-building me-2" style={{ color: '#4f46e5' }}></i>
            {t('company.pageTitle')}
          </h2>
          <p className="text-muted mb-0 mt-1" style={{ fontSize: '0.9rem' }}>
            {t('company.pageSubtitle')}
          </p>
        </div>
      </div>

      <div className="row justify-content-center">
        <div className="col-12 col-lg-7">
          <div className="card shadow-sm border-0 rounded-4">
            <div className="card-header bg-white border-bottom-0 pt-4 pb-0 px-4">
              <div className="d-flex align-items-center gap-2">
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 42,
                    height: 42,
                    background: '#eef2ff',
                    borderRadius: '10px',
                  }}
                >
                  <i className="fas fa-id-card" style={{ color: '#4f46e5', fontSize: '1.1rem' }}></i>
                </span>
                <div>
                  <h5 className="mb-0 fw-bold">{t('company.cardTitle')}</h5>
                  <small className="text-muted">{t('company.cardSubtitle')}</small>
                </div>
              </div>
              <hr className="mt-3 mb-0" style={{ borderColor: '#e2e8f0' }} />
            </div>

            <div className="card-body p-4">
              {loading ? (
                <div className="text-center py-5 text-muted">
                  <i className="fas fa-spinner fa-spin fa-2x mb-3 d-block" style={{ color: '#4f46e5' }}></i>
                  {t('company.loading')}
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {/* Nombre de la empresa */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">
                      <i className="fas fa-building me-1" style={{ color: '#4f46e5' }}></i>
                      {t('company.lblName')} <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      className="form-control form-control-lg"
                      style={{ borderRadius: '10px', borderColor: '#e2e8f0' }}
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder={t('company.namePlaceholder')}
                    />
                    <small className="text-muted">{t('company.nameHelp')}</small>
                  </div>

                  {/* Teléfono */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">
                      <i className="fas fa-phone me-1" style={{ color: '#4f46e5' }}></i>
                      {t('company.lblPhone')}
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      className="form-control"
                      style={{ borderRadius: '10px', borderColor: '#e2e8f0' }}
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder={t('company.phonePlaceholder')}
                    />
                  </div>

                  {/* Email */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">
                      <i className="fas fa-envelope me-1" style={{ color: '#4f46e5' }}></i>
                      {t('company.lblEmail')}
                    </label>
                    <input
                      type="email"
                      name="email"
                      className="form-control"
                      style={{ borderRadius: '10px', borderColor: '#e2e8f0' }}
                      value={formData.email}
                      onChange={handleChange}
                      placeholder={t('company.emailPlaceholder')}
                    />
                  </div>

                  {/* Info badge */}
                  <div
                    className="alert d-flex align-items-center gap-2 mb-4"
                    style={{
                      background: '#eef2ff',
                      border: '1px solid #c7d2fe',
                      borderRadius: '10px',
                      color: '#4338ca',
                      fontSize: '0.85rem',
                    }}
                  >
                    <i className="fas fa-info-circle flex-shrink-0"></i>
                    <span>{t('company.singletonNote')}</span>
                  </div>

                  <div className="d-flex justify-content-end">
                    <button
                      type="submit"
                      className="btn btn-primary px-5"
                      style={{ borderRadius: '10px', fontWeight: 600 }}
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <i className="fas fa-spinner fa-spin me-2"></i>
                          {t('company.btnSaving')}
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save me-2"></i>
                          {t('company.btnSave')}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
