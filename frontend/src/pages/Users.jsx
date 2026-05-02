import { useEffect, useState } from 'react';
import API from '../api/client';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

export default function Users() {
    const { t } = useTranslation();
    const [users, setUsers] = useState([]);
    const [rolesList, setRolesList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({ id: null, full_name: '', email: '', pw: '', role_id: '', is_active: true });

    useEffect(() => {
        fetchUsers();
        fetchRoles();
    }, []);

    const fetchUsers = () => {
        API.get('/users').then(r => { setUsers(r.data); setLoading(false); });
    };

    const fetchRoles = async () => {
        try {
            const r = await API.get('/users/roles');
            setRolesList(r.data);
        } catch { /* silencioso */ }
    };

    const openCreateModal = () => {
        setIsEditing(false);
        const defaultRole = rolesList.find(r => r.name === 'OPERADOR') || rolesList[0];
        setForm({ id: null, full_name: '', email: '', pw: '', role_id: defaultRole?.id || '', is_active: true });
        setShowModal(true);
    };

    const openEditModal = (user) => {
        setIsEditing(true);
        const roleMatch = rolesList.find(r => r.name === user.role);
        const roleId = roleMatch ? roleMatch.id : (rolesList[0]?.id || '');
        setForm({ id: user.id, full_name: user.full_name, email: user.email, pw: '', role_id: roleId, is_active: user.is_active });
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                const updateData = { full_name: form.full_name, role_id: form.role_id, is_active: form.is_active };
                if (form.pw) updateData.pw = form.pw;
                await API.put(`/users/${form.id}`, updateData);
                toast.success(t('users.updateSuccess'));
            } else {
                await API.post('/users', form);
                toast.success(t('users.createSuccess'));
            }
            setShowModal(false);
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.error || t('users.saveError'));
        }
    };

    const handleDelete = async (user) => {
        if (window.confirm(t('users.deleteConfirm', { name: user.full_name }))) {
            try {
                await API.delete(`/users/${user.id}`);
                toast.success(t('users.deleteSuccess'));
                fetchUsers();
            } catch (err) {
                toast.error(err.response?.data?.error || t('users.deleteError'));
            }
        }
    };

    return (
        <>
            <div className="content-header mb-3 d-flex align-items-center justify-content-between">
                <div>
                    <h1 style={{ fontWeight: 700 }}><i className="fas fa-user-cog mr-2 text-danger"></i>{t('users.pageTitle')}</h1>
                    <small className="text-muted">{t('users.pageSubtitle')}</small>
                </div>
                <button className="btn btn-danger" onClick={openCreateModal}><i className="fas fa-plus mr-1"></i>{t('users.btnNew')}</button>
            </div>

            {loading ? <div className="text-center pt-5"><i className="fas fa-spinner fa-spin fa-3x text-secondary"></i></div> : (
                <div className="card" style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead style={{ background: '#1a1a2e', color: '#fff' }}>
                                    <tr><th>{t('users.colName')}</th><th>{t('users.colEmail')}</th><th>{t('users.colRole')}</th><th>{t('users.colLastLogin')}</th><th>{t('users.colStatus')}</th><th className="text-center">{t('users.colActions')}</th></tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id}>
                                            <td><i className="fas fa-user-circle mr-2 text-secondary"></i><strong>{u.full_name}</strong></td>
                                            <td>{u.email}</td>
                                            <td><span className="badge badge-dark" style={{ padding: '5px 10px', borderRadius: '6px' }}>{u.role}</span></td>
                                            <td>{u.last_login ? new Date(u.last_login).toLocaleString('es') : t('users.never')}</td>
                                            <td><span className={`badge badge-${u.is_active ? 'success' : 'danger'}`}>{u.is_active ? t('users.active') : t('users.inactive')}</span></td>
                                            <td className="text-center">
                                                <button className="btn btn-sm btn-outline-primary mr-2" onClick={() => openEditModal(u)} title={t('users.btnEdit')}>
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(u)} title={t('users.btnDelete')}>
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Crear/Editar Usuario */}
            {showModal && (
                <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content" style={{ borderRadius: '12px' }}>
                            <div className="modal-header" style={{ background: '#1a1a2e', color: '#fff', borderRadius: '12px 12px 0 0' }}>
                                <h5 className="modal-title">{isEditing ? t('users.modalEditTitle') : t('users.modalNewTitle')}</h5>
                                <button type="button" className="close text-white" onClick={() => setShowModal(false)}><span>&times;</span></button>
                            </div>
                            <form onSubmit={handleSave}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label>{t('users.lblName')}</label>
                                        <input className="form-control" required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('users.lblEmail')}</label>
                                        <input type="email" className="form-control" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} disabled={isEditing} />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('users.lblPassword')}</label>
                                        <input type="password" className="form-control" required={!isEditing} minLength={8} value={form.pw} onChange={e => setForm({ ...form, pw: e.target.value })} placeholder={isEditing ? "Dejar en blanco para no cambiar" : ""} />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('users.lblRole')}</label>
                                        <select className="form-control" value={form.role_id} onChange={e => setForm({ ...form, role_id: parseInt(e.target.value) })}>
                                            {rolesList.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </select>
                                    </div>
                                    {isEditing && (
                                        <div className="form-group">
                                            <label>{t('users.lblStatus')}</label>
                                            <select className="form-control" value={form.is_active ? '1' : '0'} onChange={e => setForm({ ...form, is_active: e.target.value === '1' })}>
                                                <option value="1">{t('users.active')}</option>
                                                <option value="0">{t('users.inactive')}</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('users.btnCancel')}</button>
                                    <button type="submit" className="btn btn-danger"><i className="fas fa-save mr-1"></i>{isEditing ? t('users.btnSaveEdit') : t('users.btnCreate')}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
