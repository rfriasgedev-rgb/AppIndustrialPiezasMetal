import { useEffect, useState } from 'react';
import API from '../api/client';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

// Los stages se manejan dinámicamente con las traducciones dentro del componente

const NEXT_AVAILABLE_STAGES = {
    DESIGN: ['CUTTING'],
    CUTTING: ['BENDING'],
    BENDING: ['ASSEMBLY', 'WELDING', 'CLEANING'],
    ASSEMBLY: ['WELDING', 'CLEANING'],
    WELDING: ['CLEANING'],
    CLEANING: ['READY'],
};

export default function WorkQueue() {
    const { t } = useTranslation();
    const { user, hasRole } = useAuth();
    const [selectedStage, setSelectedStage] = useState('DESIGN');
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(false);
    const [productionLines, setProductionLines] = useState([]);
    const [selectedLines, setSelectedLines] = useState({});

    const STAGES = {
        DESIGN: t('workQueue.stageDesign'), 
        CUTTING: t('workQueue.stageCutting'),
        BENDING: t('workQueue.stageBending'), 
        ASSEMBLY: t('workQueue.stageAssembly'), 
        WELDING: t('workQueue.stageWelding'), 
        CLEANING: t('workQueue.stageCleaning')
    };
    
    // Si el usuario pertenece a un departamento, pre-seleccionamos su etapa lógica si quisiéramos implementarlo auto,
    // pero permitimos cambiar la tab para flexibilidad.
    
    useEffect(() => {
        loadQueue(selectedStage);
        loadProductionLines();
    }, [selectedStage]);

    const loadProductionLines = async () => {
        try {
            const res = await API.get('/production-lines');
            setProductionLines(res.data);
        } catch (error) {
            console.error(t('workQueue.errorLines'), error);
        }
    };

    const loadQueue = async (stage) => {
        setLoading(true);
        try {
            const res = await API.get(`/production/queue/${stage}`);
            setQueue(res.data);
            setLoading(false);
        } catch (error) {
            toast.error(t('workQueue.errorQueue'));
            setLoading(false);
        }
    };

    const handleAdvance = async (item, nextStage) => {
        if (nextStage === 'READY') {
            const lineId = selectedLines[item.id];
            if (!lineId) {
                toast.warning(t('workQueue.warningLine'));
                return;
            }
        }

        const notes = window.prompt(t('workQueue.promptNotes', { product: item.product_name, stage: STAGES[nextStage] }));
        if (notes === null) return; // Cancelado
        
        try {
            const payload = { to_status: nextStage, notes };
            if (nextStage === 'READY') {
                payload.production_line_id = selectedLines[item.id];
            }
            await API.put(`/production/${item.id}/advance`, payload);
            toast.success(t('workQueue.advanceSuccess'));
            loadQueue(selectedStage);
        } catch (err) {
            toast.error(err.response?.data?.error || t('workQueue.advanceError'));
        }
    };

    const handlePrintRequisition = async (item) => {
        try {
            // 1. Intentar generar o recuperar la requisición
            const genRes = await API.post(`/requisitions/generate/${item.order_id}`);
            const requisitionId = genRes.data.requisitionId;
            
            if (requisitionId) {
                // 2. Abrir el PDF en una nueva pestaña
                const url = `${API.defaults.baseURL}/requisitions/${requisitionId}/pdf`;
                window.open(url, '_blank');
                toast.info(t('workQueue.genPdf'));
            }
        } catch (err) {
            toast.error(err.response?.data?.error || t('workQueue.genPdfError'));
        }
    };

    return (
        <>
            <div className="content-header mb-3">
                <h1 style={{ fontWeight: 700 }}><i className="fas fa-clipboard-check mr-2 text-success"></i>{t('workQueue.pageTitle')}</h1>
                <small className="text-muted">{t('workQueue.pageSubtitle')}</small>
            </div>

            <div className="card mb-3">
                <div className="card-body py-2 d-flex gap-2 flex-wrap" style={{ overflowX: 'auto' }}>
                    {Object.entries(STAGES).map(([k, v]) => (
                        <button 
                            key={k} 
                            className={`btn btn-sm mr-1 mb-1 ${selectedStage === k ? 'btn-success font-weight-bold' : 'btn-outline-secondary'}`} 
                            onClick={() => setSelectedStage(k)}
                        >
                            {v}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? <div className="text-center pt-5"><i className="fas fa-spinner fa-spin fa-2x text-secondary"></i></div> : (
                <div className="row">
                    {queue.length === 0 ? (
                        <div className="col-12 text-center py-5 text-muted">
                            <i className="fas fa-mug-hot fa-3x mb-3 text-light"></i>
                            <h5>{t('workQueue.emptyTitle', { stage: STAGES[selectedStage] })}</h5>
                            <p>{t('workQueue.emptySubtitle')}</p>
                        </div>
                    ) : (
                        queue.map(item => (
                            <div className="col-md-4 mb-4" key={item.id}>
                                <div className="card h-100" style={{ borderLeft: '4px solid #4f46e5' }}>
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between">
                                            <h5 className="font-weight-bold" style={{ color: '#0f172a' }}>{item.product_name}</h5>
                                            <span className="badge badge-light border">{item.quantity} {t('workQueue.units')}</span>
                                        </div>
                                        <p className="text-muted mb-2"><i className="fas fa-hashtag mr-1"></i>{t('workQueue.op')} {item.order_number}</p>
                                        <p className="mb-2 text-sm"><i className="fas fa-building mr-1"></i>{t('workQueue.client')} {item.client_name}</p>
                                        {item.notes && <p className="mb-2 text-sm bg-light p-2 rounded"><i className="fas fa-comment-dots mr-1"></i>{item.notes}</p>}
                                        
                                        <hr />
                                        
                                        <p className="mb-2 font-weight-bold text-sm">{t('workQueue.advanceTo')}</p>
                                        <div className="d-flex flex-wrap gap-2 align-items-center">
                                            {selectedStage === 'CUTTING' && (
                                                <button 
                                                    className="btn btn-sm btn-info mr-2 mb-2"
                                                    onClick={() => handlePrintRequisition(item)}
                                                    title={t('workQueue.btnPrintReqTitle')}
                                                >
                                                    <i className="fas fa-print mr-1"></i> {t('workQueue.btnPrintReq')}
                                                </button>
                                            )}
                                            {(NEXT_AVAILABLE_STAGES[selectedStage] || []).map(next => (
                                                <div key={next} className="d-flex align-items-center mb-2">
                                                    {next === 'READY' && selectedStage === 'CLEANING' && (
                                                        <select 
                                                            className="form-control form-control-sm mr-2" 
                                                            style={{width: '200px', display: 'inline-block'}}
                                                            value={selectedLines[item.id] || ''}
                                                            onChange={(e) => setSelectedLines({...selectedLines, [item.id]: e.target.value})}
                                                        >
                                                            <option value="">{t('workQueue.selectLine')}</option>
                                                            {productionLines.map(pl => (
                                                                <option key={pl.id} value={pl.id}>{pl.name}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                    <button 
                                                        className="btn btn-sm btn-outline-success mr-2"
                                                        onClick={() => handleAdvance(item, next)}
                                                    >
                                                        {next === 'READY' ? t('workQueue.finishProduction') : t('workQueue.moveTo', { stage: STAGES[next] })} <i className="fas fa-arrow-right ml-1"></i>
                                                    </button>
                                                </div>
                                            ))}
                                            {/* El botón Cancelar/Merma ha sido retirado de esta vista */}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </>
    );
}
