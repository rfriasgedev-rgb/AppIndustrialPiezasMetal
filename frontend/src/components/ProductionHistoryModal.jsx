import { useEffect, useState } from 'react';
import API from '../api/client';
import { useTranslation } from 'react-i18next';

const STAGE_LABELS = {
    DESIGN:          { label: 'Diseño',             icon: 'fas fa-drafting-compass', color: '#6366f1' },
    PENDING_MATERIAL:{ label: 'Esperando Material', icon: 'fas fa-boxes',            color: '#f59e0b' },
    CUTTING:         { label: 'Corte',              icon: 'fas fa-cut',              color: '#3b82f6' },
    BENDING:         { label: 'Doblado',            icon: 'fas fa-wave-square',      color: '#8b5cf6' },
    ASSEMBLY:        { label: 'Ensamblaje',         icon: 'fas fa-puzzle-piece',     color: '#06b6d4' },
    WELDING:         { label: 'Soldadura',          icon: 'fas fa-fire',             color: '#f97316' },
    CLEANING:        { label: 'Línea de Producción',icon: 'fas fa-industry',         color: '#10b981' },
    PAINTING:        { label: 'Pintura',            icon: 'fas fa-paint-roller',     color: '#ec4899' },
    QUALITY_CHECK:   { label: 'Control Calidad',    icon: 'fas fa-check-double',     color: '#14b8a6' },
    READY:           { label: 'Listo',              icon: 'fas fa-flag-checkered',   color: '#22c55e' },
    CANCELLED:       { label: 'Cancelado',          icon: 'fas fa-ban',              color: '#ef4444' },
};

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('es-MX', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function getDuration(start, end) {
    if (!start || !end) return null;
    const ms = new Date(end) - new Date(start);
    const mins = Math.floor(ms / 60000);
    const hrs  = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (days > 0)  return `${days}d ${hrs % 24}h`;
    if (hrs > 0)   return `${hrs}h ${mins % 60}m`;
    return `${mins}m`;
}

export default function ProductionHistoryModal({ orderId, orderNumber, onClose }) {
    const { t } = useTranslation();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);

    useEffect(() => {
        if (!orderId) return;
        setLoading(true);
        API.get(`/production/${orderId}`)
            .then(res => {
                setData(res.data);
                // Auto-seleccionar el primer item
                if (res.data.items?.length > 0) {
                    setSelectedItem(res.data.items[0].id);
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [orderId]);

    // Filtrar logs del item seleccionado, ordenados cronológicamente
    const itemLogs = (data?.all_logs || [])
        .filter(l => l.order_detail_id === selectedItem)
        .sort((a, b) => new Date(a.stage_started_at) - new Date(b.stage_started_at));

    const currentItem = data?.items?.find(i => i.id === selectedItem);

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                overflowY: 'auto', padding: '30px 16px',
            }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={{
                background: '#fff', borderRadius: 16, width: '100%', maxWidth: 780,
                boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #1e1b4b 0%, #4f46e5 100%)',
                    padding: '20px 28px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <div>
                        <h5 style={{ color: '#fff', margin: 0, fontWeight: 700, fontSize: 18 }}>
                            <i className="fas fa-history mr-2"></i>
                            Historial de Producción
                        </h5>
                        <small style={{ color: '#a5b4fc' }}>
                            {data?.order_number || orderNumber} — {data?.client_name || ''}
                        </small>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.15)', border: 'none',
                            borderRadius: 8, color: '#fff', width: 36, height: 36,
                            cursor: 'pointer', fontSize: 18,
                        }}
                    >×</button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 60 }}>
                        <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#4f46e5' }}></i>
                        <p style={{ marginTop: 12, color: '#6b7280' }}>Cargando historial...</p>
                    </div>
                ) : !data ? (
                    <div style={{ textAlign: 'center', padding: 60, color: '#ef4444' }}>
                        <i className="fas fa-exclamation-circle fa-2x"></i>
                        <p style={{ marginTop: 12 }}>No se pudo cargar el historial.</p>
                    </div>
                ) : (
                    <div>
                        {/* Selector de pieza si hay múltiples */}
                        {data.items?.length > 1 && (
                            <div style={{ padding: '12px 24px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>
                                    Seleccionar Pieza
                                </label>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                                    {data.items.map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => setSelectedItem(item.id)}
                                            style={{
                                                padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                                                border: '2px solid #4f46e5',
                                                background: selectedItem === item.id ? '#4f46e5' : 'transparent',
                                                color: selectedItem === item.id ? '#fff' : '#4f46e5',
                                                fontWeight: 600, transition: 'all 0.2s',
                                            }}
                                        >
                                            {item.product_name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Info de la pieza */}
                        {currentItem && (
                            <div style={{
                                padding: '14px 24px',
                                background: '#f0f4ff',
                                borderBottom: '1px solid #e0e7ff',
                                display: 'flex', gap: 24, flexWrap: 'wrap',
                            }}>
                                <div>
                                    <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Pieza</span>
                                    <div style={{ fontWeight: 700, color: '#1e1b4b' }}>{currentItem.product_name}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Cantidad</span>
                                    <div style={{ fontWeight: 700, color: '#1e1b4b' }}>{currentItem.quantity} und(s)</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Etapa Actual</span>
                                    <div style={{ fontWeight: 700, color: STAGE_LABELS[currentItem.stage]?.color || '#6b7280' }}>
                                        <i className={`${STAGE_LABELS[currentItem.stage]?.icon || 'fas fa-circle'} mr-1`}></i>
                                        {STAGE_LABELS[currentItem.stage]?.label || currentItem.stage}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Timeline */}
                        <div style={{ padding: '24px 28px', maxHeight: 480, overflowY: 'auto' }}>
                            {itemLogs.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                                    <i className="fas fa-inbox fa-2x" style={{ marginBottom: 12 }}></i>
                                    <p>No hay registros de historial para esta pieza.</p>
                                </div>
                            ) : (
                                <div style={{ position: 'relative' }}>
                                    {/* Línea vertical */}
                                    <div style={{
                                        position: 'absolute', left: 19, top: 0, bottom: 0,
                                        width: 2, background: 'linear-gradient(to bottom, #4f46e5, #e5e7eb)',
                                    }}></div>

                                    {itemLogs.map((log, idx) => {
                                        const stageInfo = STAGE_LABELS[log.to_status] || { label: log.to_status, icon: 'fas fa-circle', color: '#6b7280' };
                                        const duration = getDuration(log.stage_started_at, log.stage_completed_at);
                                        const isLast = idx === itemLogs.length - 1;

                                        return (
                                            <div key={log.id} style={{
                                                display: 'flex', gap: 16, marginBottom: isLast ? 0 : 24,
                                                position: 'relative',
                                            }}>
                                                {/* Icono del paso */}
                                                <div style={{
                                                    width: 40, height: 40, borderRadius: '50%',
                                                    background: stageInfo.color,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    flexShrink: 0, zIndex: 1,
                                                    boxShadow: `0 0 0 4px white, 0 0 0 6px ${stageInfo.color}33`,
                                                }}>
                                                    <i className={stageInfo.icon} style={{ color: '#fff', fontSize: 16 }}></i>
                                                </div>

                                                {/* Contenido */}
                                                <div style={{
                                                    flex: 1,
                                                    background: '#f9fafb',
                                                    border: `1px solid ${stageInfo.color}44`,
                                                    borderLeft: `4px solid ${stageInfo.color}`,
                                                    borderRadius: '0 12px 12px 0',
                                                    padding: '14px 16px',
                                                }}>
                                                    {/* Cabecera: etapa + orden + fecha */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                                        <div>
                                                            <span style={{
                                                                background: stageInfo.color,
                                                                color: '#fff', borderRadius: 20,
                                                                padding: '2px 12px', fontSize: 12, fontWeight: 700,
                                                            }}>
                                                                {stageInfo.label}
                                                            </span>
                                                            <span style={{
                                                                marginLeft: 8, fontSize: 12, color: '#6b7280',
                                                                fontFamily: 'monospace',
                                                            }}>
                                                                {data.order_number}
                                                            </span>
                                                        </div>
                                                        <span style={{ fontSize: 12, color: '#9ca3af' }}>
                                                            <i className="fas fa-calendar-alt mr-1"></i>
                                                            {formatDate(log.stage_started_at)}
                                                        </span>
                                                    </div>

                                                    {/* Operador */}
                                                    <div style={{ marginTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <div style={{
                                                                width: 32, height: 32, borderRadius: '50%',
                                                                background: `${stageInfo.color}22`,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            }}>
                                                                <i className="fas fa-user" style={{ color: stageInfo.color, fontSize: 14 }}></i>
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 700, fontSize: 14, color: '#1f2937' }}>
                                                                    {log.operator_name || log.performed_by_name || 'Desconocido'}
                                                                </div>
                                                                <div style={{ fontSize: 12, color: '#6b7280' }}>
                                                                    {log.operator_role || 'Sin rol'}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {duration && (
                                                            <div style={{
                                                                display: 'flex', alignItems: 'center', gap: 6,
                                                                padding: '4px 10px', background: '#fff',
                                                                border: '1px solid #e5e7eb', borderRadius: 20,
                                                                fontSize: 12, color: '#4b5563',
                                                            }}>
                                                                <i className="fas fa-clock" style={{ color: '#4f46e5' }}></i>
                                                                Duración: <strong>{duration}</strong>
                                                            </div>
                                                        )}

                                                        {log.stage_completed_at && (
                                                            <div style={{
                                                                display: 'flex', alignItems: 'center', gap: 6,
                                                                padding: '4px 10px', background: '#f0fdf4',
                                                                border: '1px solid #bbf7d0', borderRadius: 20,
                                                                fontSize: 12, color: '#15803d',
                                                            }}>
                                                                <i className="fas fa-check-circle"></i>
                                                                Completado: {formatDate(log.stage_completed_at)}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Notas */}
                                                    {log.notes && (
                                                        <div style={{
                                                            marginTop: 10, padding: '8px 12px',
                                                            background: '#fff', borderRadius: 8,
                                                            border: '1px solid #e5e7eb',
                                                            fontSize: 13, color: '#374151',
                                                        }}>
                                                            <i className="fas fa-comment-dots mr-1" style={{ color: '#9ca3af' }}></i>
                                                            {log.notes}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div style={{
                    padding: '14px 28px',
                    borderTop: '1px solid #e5e7eb',
                    background: '#f9fafb',
                    display: 'flex', justifyContent: 'flex-end',
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 24px',
                            background: '#4f46e5', color: '#fff',
                            border: 'none', borderRadius: 8,
                            fontWeight: 600, cursor: 'pointer', fontSize: 14,
                        }}
                    >
                        <i className="fas fa-times mr-2"></i>Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
