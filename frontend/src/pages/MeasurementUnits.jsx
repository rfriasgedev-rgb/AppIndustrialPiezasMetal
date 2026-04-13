import { useEffect, useState } from 'react';
import API from '../api/client';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

export default function MeasurementUnits() {
    const { t } = useTranslation();
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(true);
    const { hasRole } = useAuth();

    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({ id: null, name: '', abbreviation: '' });

    const fetchData = () => {
        API.get('/units').then(res => {
            setUnits(res.data);
            setLoading(false);
        }).catch(() => {
            Swal.fire(t('measurementUnits.saveErrorTitle'), t('measurementUnits.loadError'), 'error');
            setLoading(false);
        });
    };

    useEffect(() => { fetchData(); }, []);

    const openCreateModal = () => {
        setIsEditing(false);
        setForm({ id: null, name: '', abbreviation: '' });
        setShowModal(true);
    };

    const openEditModal = (unit) => {
        setIsEditing(true);
        setForm({ id: unit.id, name: unit.name, abbreviation: unit.abbreviation });
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await API.put(`/units/${form.id}`, form);
                Swal.fire(t('measurementUnits.updateSuccessTitle'), t('measurementUnits.updateSuccessText'), 'success');
            } else {
                await API.post('/units', form);
                Swal.fire(t('measurementUnits.createSuccessTitle'), t('measurementUnits.createSuccessText'), 'success');
            }
            setShowModal(false);
            fetchData();
        } catch (err) {
            Swal.fire(t('measurementUnits.saveErrorTitle'), err.response?.data?.error || t('measurementUnits.saveErrorText'), 'error');
        }
    };

    const handleDelete = async (unit) => {
        const result = await Swal.fire({
            title: t('measurementUnits.deleteConfirmTitle'),
            text: t('measurementUnits.deleteConfirmText', { name: unit.name }),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: t('measurementUnits.btnYesDelete'),
            cancelButtonText: t('measurementUnits.btnCancel')
        });

        if (result.isConfirmed) {
            try {
                await API.delete(`/units/${unit.id}`);
                Swal.fire(t('measurementUnits.deleteSuccessTitle'), t('measurementUnits.deleteSuccessText'), 'success');
                fetchData();
            } catch (err) {
                Swal.fire(t('measurementUnits.deleteErrorTitle'), err.response?.data?.error || t('measurementUnits.deleteErrorText'), 'error');
            }
        }
    };

    if (!hasRole('ADMIN')) return <div className="p-5 text-center text-danger">{t('measurementUnits.accessDenied')}</div>;

    return (
        <>
            <div className="content-header mb-3 d-flex align-items-center justify-content-between">
                <div>
                    <h1 style={{ fontWeight: 700 }}><i className="fas fa-ruler-combined mr-2 text-danger"></i>{t('measurementUnits.pageTitle')}</h1>
                    <small className="text-muted">{t('measurementUnits.pageSubtitle')}</small>
                </div>
                <button className="btn btn-danger" onClick={openCreateModal}>
                    <i className="fas fa-plus mr-1"></i> {t('measurementUnits.btnNew')}
                </button>
            </div>

            {loading ? <div className="text-center pt-5"><i className="fas fa-spinner fa-spin fa-3x text-secondary"></i></div> : (
                <div className="card shadow-sm" style={{ borderRadius: '12px' }}>
                    <div className="card-body p-0">
                        <table className="table table-hover mb-0">
                            <thead style={{ background: '#1a1a2e', color: '#fff' }}>
                                <tr>
                                    <th>{t('measurementUnits.colUnit')}</th>
                                    <th>{t('measurementUnits.colAbbr')}</th>
                                    <th className="text-center">{t('measurementUnits.colActions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {units.map(u => (
                                    <tr key={u.id}>
                                        <td className="align-middle"><strong>{u.name}</strong></td>
                                        <td className="align-middle"><code className="px-2 py-1 bg-light text-dark rounded">{u.abbreviation}</code></td>
                                        <td className="text-center align-middle">
                                            <button className="btn btn-sm btn-outline-primary mr-2" onClick={() => openEditModal(u)}><i className="fas fa-edit"></i></button>
                                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(u)}><i className="fas fa-trash"></i></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content" style={{ borderRadius: '12px' }}>
                            <div className="modal-header" style={{ background: '#1a1a2e', color: '#fff', borderRadius: '12px 12px 0 0' }}>
                                <h5 className="modal-title">{isEditing ? t('measurementUnits.modalEditTitle') : t('measurementUnits.modalNewTitle')}</h5>
                                <button type="button" className="close text-white" onClick={() => setShowModal(false)}><span>&times;</span></button>
                            </div>
                            <form onSubmit={handleSave}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label>{t('measurementUnits.lblName')} <span className="text-danger">*</span></label>
                                        <input type="text" className="form-control" required placeholder={t('measurementUnits.namePlaceholder')}
                                            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('measurementUnits.lblAbbr')} <span className="text-danger">*</span></label>
                                        <input type="text" className="form-control" required placeholder={t('measurementUnits.abbrPlaceholder')}
                                            value={form.abbreviation} onChange={e => setForm({ ...form, abbreviation: e.target.value })} />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('measurementUnits.btnCancel')}</button>
                                    <button type="submit" className="btn btn-danger"><i className="fas fa-save mr-1"></i>{isEditing ? t('measurementUnits.btnSaveEdit') : t('measurementUnits.btnCreate')}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
