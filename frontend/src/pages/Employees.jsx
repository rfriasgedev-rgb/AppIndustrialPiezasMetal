import { useState, useEffect } from 'react';
import { hrService } from '../services/hr.service';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';

export default function Employees() {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [roles, setRoles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  
  const initialForm = { id: null, first_name: '', last_name: '', email: '', phone: '', department_id: '', shift_id: '', employee_role_id: '', is_active: true };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const [empData, deptData, schData, roleData] = await Promise.all([
        hrService.getEmployees(),
        hrService.getDepartments(),
        hrService.getSchedules(),
        hrService.getEmployeeRoles()
      ]);
      setEmployees(empData);
      setDepartments(deptData);
      setSchedules(schData);
      setRoles(roleData);
    } catch (error) {
      toast.error(t('employees.loadError'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await hrService.updateEmployee(formData.id, formData);
        toast.success(t('employees.updateSuccess'));
      } else {
        await hrService.createEmployee(formData);
        toast.success(t('employees.createSuccess'));
      }
      setShowModal(false);
      loadAllData();
    } catch (error) {
       toast.error(error.response?.data?.error || t('employees.saveError'));
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: t('employees.deleteConfirmTitle'),
      text: t('employees.deleteConfirmText'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('employees.btnYesDelete'),
      cancelButtonText: t('employees.btnCancel')
    });

    if (result.isConfirmed) {
      try {
        await hrService.deleteEmployee(id);
        toast.success(t('employees.deleteSuccess'));
        loadAllData();
      } catch (error) {
        toast.error(t('employees.deleteError'));
      }
    }
  };

  const openForm = (item = null) => {
    if (item) {
      setFormData({
        ...item,
        is_active: item.is_active === 1 || item.is_active === true
      });
    } else {
      setFormData(initialForm);
    }
    setShowModal(true);
  };

  return (
    <div className="container-fluid fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold m-0"><i className="fas fa-users-cog me-2"></i> {t('employees.pageTitle')}</h2>
        <button className="btn btn-primary shadow-sm" onClick={() => openForm()}>
          <i className="fas fa-user-plus me-1"></i> {t('employees.btnNew')}
        </button>
      </div>

      <div className="card shadow-sm border-0 rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-4">{t('employees.colName')}</th>
                  <th>{t('employees.colEmail')}</th>
                  <th>{t('employees.colPhone')}</th>
                  <th>{t('employees.colDept')}</th>
                  <th>{t('employees.colRole')}</th>
                  <th>{t('employees.colShift')}</th>
                  <th>{t('employees.colStatus')}</th>
                  <th className="text-end pe-4">{t('employees.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((item) => (
                  <tr key={item.id}>
                    <td className="ps-4 fw-medium">
                        {item.first_name} {item.last_name}
                    </td>
                    <td className="small">{item.email || <span className="text-muted">{t('employees.na')}</span>}</td>
                    <td className="small">{item.phone || <span className="text-muted">{t('employees.na')}</span>}</td>
                    <td>{item.department_name}</td>
                    <td><span className="badge bg-secondary">{item.role_name}</span></td>
                    <td>{item.shift_name} <br/><small className="text-muted">{item.start_time} - {item.end_time}</small></td>
                    <td>
                        {item.is_active ? 
                           <span className="badge bg-success bg-opacity-10 text-success border border-success">{t('employees.statusActive')}</span> : 
                           <span className="badge bg-danger bg-opacity-10 text-danger border border-danger">{t('employees.statusInactive')}</span>}
                    </td>
                    <td className="text-end pe-4">
                      <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => openForm(item)}>
                        <i className="fas fa-edit"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(item.id)}>
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr><td colSpan="8" className="text-center py-4 text-muted">{t('employees.noRecords')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-bottom-0 pb-0">
                <h5 className="modal-title fw-bold">{formData.id ? t('employees.modalEditTitle') : t('employees.modalNewTitle')}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSubmit}>
                  <div className="row mb-3">
                    <div className="col-md-6">
                        <label className="form-label fw-medium">{t('employees.lblFirstName')}</label>
                        <input type="text" className="form-control" required value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label fw-medium">{t('employees.lblLastName')}</label>
                        <input type="text" className="form-control" required value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
                    </div>
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-md-6">
                        <label className="form-label fw-medium">{t('employees.lblEmail')}</label>
                        <input type="email" className="form-control" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="ejemplo@correo.com" />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label fw-medium">{t('employees.lblPhone')}</label>
                        <input type="text" className="form-control" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="809-000-0000" />
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                        <label className="form-label fw-medium">{t('employees.lblDept')}</label>
                        <select className="form-select" required value={formData.department_id} onChange={e => setFormData({...formData, department_id: e.target.value})}>
                            <option value="">{t('employees.selectPlaceholder')}</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                    <div className="col-md-6">
                        <label className="form-label fw-medium">{t('employees.lblRole')}</label>
                        <select className="form-select" required value={formData.employee_role_id} onChange={e => setFormData({...formData, employee_role_id: e.target.value})}>
                            <option value="">{t('employees.selectPlaceholder')}</option>
                            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>
                  </div>

                  <div className="row mb-4">
                     <div className="col-md-6">
                        <label className="form-label fw-medium">{t('employees.lblShift')}</label>
                        <select className="form-select" required value={formData.shift_id} onChange={e => setFormData({...formData, shift_id: e.target.value})}>
                            <option value="">{t('employees.selectPlaceholder')}</option>
                            {schedules.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start_time}-{s.end_time})</option>)}
                        </select>
                    </div>
                     <div className="col-md-6 d-flex align-items-end">
                        <div className="form-check form-switch fs-5 pb-1">
                            <input className="form-check-input" type="checkbox" role="switch" id="activeSwitch" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
                            <label className="form-check-label fs-6 pt-1 ms-2" htmlFor="activeSwitch">{t('employees.lblActiveEmployee')}</label>
                        </div>
                    </div>
                  </div>

                  <div className="d-flex gap-2 justify-content-end mt-4">
                    <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>{t('employees.btnCancel')}</button>
                    <button type="submit" className="btn btn-primary px-4">{t('employees.btnSave')}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
