import React, { useState, useMemo } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase-config.js';
import { useFirestore } from '../../shared/hooks/useFirestore.js';
import { useExchangeRate } from '../../shared/hooks/useExchangeRate.js';
import { Loader, AlertCircle, Inbox, FileText, CheckCircle, XCircle, Plus, ChevronDown, Users, TrendingUp, DollarSign, Edit, Trash2, RefreshCw } from 'lucide-react';

// --- Sub-componente para la tabla de oportunidades ---
const OpportunitiesTable = ({ opportunities, stage, onStartAnalysis, onOpenDashboard }) => {
  if (opportunities.length === 0) {
    return (
      <div className="text-center py-16 px-6">
        <div className="mx-auto w-fit bg-gray-100 rounded-full p-4"><Inbox size={32} className="text-gray-400" /></div>
        <h3 className="mt-4 text-lg font-semibold text-gray-800">Bandeja Vacía</h3>
        <p className="mt-1 text-sm text-gray-500">No hay elementos en esta etapa del pipeline.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-600">
        <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
          <tr>
            <th scope="col" className="px-6 py-3 font-semibold tracking-wider">Producto</th>
            <th scope="col" className="px-6 py-3 font-semibold tracking-wider">Origen</th>
            <th scope="col" className="px-6 py-3 font-semibold tracking-wider text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {opportunities.map((opp) => (
            <tr key={opp.id} className="bg-white hover:bg-gray-50/50 transition-colors duration-150">
              <td className="px-6 py-4 font-medium text-gray-800">{opp.productName}</td>
              <td className="px-6 py-4"><span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-800">{opp.source}</span></td>
              <td className="px-6 py-4 text-right">
                {stage === 'requirement' && (<button onClick={() => onStartAnalysis(opp)} className="font-semibold text-indigo-600 hover:text-indigo-800 text-xs">Iniciar Análisis &rarr;</button>)}
                {stage === 'analysis' && (<button onClick={() => onOpenDashboard(opp)} className="font-semibold text-blue-600 hover:text-blue-800 text-xs">Ver Dashboard</button>)}
                {stage === 'approved' && (<button className="font-semibold text-purple-600 hover:text-purple-800 text-xs">Crear SKU en Catálogo</button>)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// --- Componente Principal del Pipeline de Oportunidades con Pestañas ---
export default function OpportunityPipelineTabs() {
  const [isClassificationModalOpen, setClassificationModalOpen] = useState(false);
  const [isAnalysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [classification, setClassification] = useState({ categoryId: '', productId: '' });
  const [activeTab, setActiveTab] = useState('requirement');

  const { data: opportunities, loading: oppsLoading } = useFirestore('opportunities');
  const { data: categories, loading: catsLoading } = useFirestore('categories');
  const { data: products, loading: prodsLoading } = useFirestore('products');
  const { rate: exchangeRate, loading: rateLoading, refreshRate } = useExchangeRate();

  const loading = oppsLoading || catsLoading || prodsLoading;

  const handleUpdateStatus = async (id, newStatus) => {
    const oppRef = doc(db, 'opportunities', id);
    try {
      await updateDoc(oppRef, { status: newStatus });
      if (isAnalysisModalOpen) setAnalysisModalOpen(false);
    } catch (err) { console.error("Error al actualizar el estado: ", err); alert("Hubo un error al actualizar la oportunidad."); }
  };

  const handleStartAnalysis = (opportunity) => {
    setSelectedOpp(opportunity);
    setClassification({ categoryId: '', productId: '' });
    setClassificationModalOpen(true);
  };
  
  const handleSaveClassification = async () => {
    if (!selectedOpp || !classification.productId) { alert("Debes seleccionar una Categoría y una Familia de Producto."); return; }
    const oppRef = doc(db, 'opportunities', selectedOpp.id);
    try {
        await updateDoc(oppRef, {
            status: 'analysis', productId: classification.productId, categoryId: classification.categoryId, classifiedAt: serverTimestamp()
        });
        alert("Producto clasificado. El análisis ha comenzado.");
        setClassificationModalOpen(false);
        setSelectedOpp(null);
    } catch (err) { console.error("Error al guardar la clasificación: ", err); alert("Hubo un error al guardar la clasificación."); }
  };

  const handleOpenDashboard = (opportunity) => {
    setSelectedOpp(opportunity);
    setAnalysisModalOpen(true);
  };
  
  const handleSaveProviderQuote = async (providerData) => {
    if (!selectedOpp) return;
    const quoteWithDefaults = { ...providerData, id: `prov_${Date.now()}`, currency: providerData.currency || 'USD' };
    const updatedQuotes = [...(selectedOpp.providerQuotes || []), quoteWithDefaults];
    const oppRef = doc(db, 'opportunities', selectedOpp.id);
    await updateDoc(oppRef, { providerQuotes: updatedQuotes });
    setSelectedOpp(prev => ({ ...prev, providerQuotes: updatedQuotes }));
  };
  
  const handleSaveCompetitor = async (competitorData) => {
    if (!selectedOpp) return;
    const competitorWithId = { ...competitorData, id: `comp_${Date.now()}` };
    const updatedCompetitors = [...(selectedOpp.competitorAnalysis || []), competitorWithId];
    const oppRef = doc(db, 'opportunities', selectedOpp.id);
    await updateDoc(oppRef, { competitorAnalysis: updatedCompetitors });
    setSelectedOpp(prev => ({ ...prev, competitorAnalysis: updatedCompetitors }));
  };

  const handleDeleteItem = async (type, itemId) => {
    if (!selectedOpp) return;
    if (!window.confirm("¿Estás seguro de que quieres eliminar este item?")) return;
    let updatedArray, fieldToUpdate;
    if (type === 'provider') {
        updatedArray = selectedOpp.providerQuotes.filter(p => p.id !== itemId);
        fieldToUpdate = 'providerQuotes';
    } else {
        updatedArray = selectedOpp.competitorAnalysis.filter(c => c.id !== itemId);
        fieldToUpdate = 'competitorAnalysis';
    }
    const oppRef = doc(db, 'opportunities', selectedOpp.id);
    await updateDoc(oppRef, { [fieldToUpdate]: updatedArray });
    setSelectedOpp(prev => ({ ...prev, [fieldToUpdate]: updatedArray }));
  };

  const categoryOptions = useMemo(() => categories.map(c => ({ value: c.id, label: c.name })), [categories]);
  const productOptions = useMemo(() => {
    if (!classification.categoryId) return [];
    return products.filter(p => p.categoryId === classification.categoryId).map(p => ({ value: p.id, label: p.name }));
  }, [products, classification.categoryId]);

  const pipelineData = useMemo(() => {
    if (!opportunities) return { requirement: [], analysis: [], approved: [], rejected: [] };
    return {
      requirement: opportunities.filter(o => o.status === 'requirement'),
      analysis: opportunities.filter(o => o.status === 'analysis'),
      approved: opportunities.filter(o => o.status === 'approved'),
      rejected: opportunities.filter(o => o.status === 'rejected'),
    };
  }, [opportunities]);

  const tabs = [
    { id: 'requirement', label: 'Bandeja de Entrada', icon: Inbox, data: pipelineData.requirement },
    { id: 'analysis', label: 'En Análisis', icon: FileText, data: pipelineData.analysis },
    { id: 'approved', label: 'Aprobadas', icon: CheckCircle, data: pipelineData.approved },
    { id: 'rejected', label: 'Rechazadas', icon: XCircle, data: pipelineData.rejected },
  ];

  return (
    <>
      {isClassificationModalOpen && <ClassificationModal 
        opportunity={selectedOpp}
        onClose={() => setClassificationModalOpen(false)}
        onSave={handleSaveClassification}
        classification={classification}
        setClassification={setClassification}
        categoryOptions={categoryOptions}
        productOptions={productOptions}
      />}
      {isAnalysisModalOpen && <AnalysisDashboardModal 
        opportunity={selectedOpp}
        onClose={() => setAnalysisModalOpen(false)}
        onSaveProvider={handleSaveProviderQuote}
        onSaveCompetitor={handleSaveCompetitor}
        onDeleteItem={handleDeleteItem}
        onUpdateStatus={handleUpdateStatus}
        exchangeRate={exchangeRate}
        isRateLoading={rateLoading}
        onRefreshRate={refreshRate}
      />}

      <div className="bg-gray-50 p-4 sm:p-6 lg:p-8 font-sans min-h-full">
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Pipeline de Oportunidades</h1>
          <p className="text-gray-600 mt-1 text-sm">Desde la idea inicial hasta la aprobación para el catálogo.</p>
        </header>
        
        {loading ? ( <div className="flex justify-center items-center h-96"><Loader className="animate-spin" size={48} /></div> ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="border-b border-gray-200">
                <nav className="-mb-px flex gap-4 sm:gap-6 px-4 sm:px-6 overflow-x-auto" aria-label="Tabs">
                    {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={` ${isActive ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors focus:outline-none`}>
                        <Icon size={16} />
                        {tab.label}
                        <span className={` ${isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'} ml-2 rounded-full py-0.5 px-2.5 text-xs font-medium`}>{tab.data.length}</span>
                        </button>
                    );
                    })}
                </nav>
                </div>
                <div>
                <OpportunitiesTable opportunities={tabs.find(tab => tab.id === activeTab).data} stage={activeTab} onStartAnalysis={handleStartAnalysis} onOpenDashboard={handleOpenDashboard} />
                </div>
            </div>
        )}
      </div>
    </>
  );
}

// --- MODAL DE CLASIFICACIÓN ---
const ClassificationModal = ({ opportunity, onClose, onSave, classification, setClassification, categoryOptions, productOptions }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Clasificar Oportunidad</h2>
            <p className="text-sm text-gray-600 mb-6">Asigna el producto <span className="font-semibold">{opportunity?.productName}</span> a una categoría y familia existente.</p>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                    <SelectInput options={categoryOptions} value={classification.categoryId} onChange={(value) => setClassification({ categoryId: value, productId: '' })} placeholder="Selecciona una categoría..." />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Familia de Producto</label>
                    <SelectInput options={productOptions} value={classification.productId} onChange={(value) => setClassification(prev => ({ ...prev, productId: value }))} placeholder="Selecciona una familia..." disabled={!classification.categoryId || productOptions.length === 0} />
                </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
                <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
                <button onClick={onSave} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Guardar y Empezar Análisis</button>
            </div>
        </div>
    </div>
);

// --- MODAL DE ANÁLISIS DETALLADO ---
const AnalysisDashboardModal = ({ opportunity, onClose, onSaveProvider, onSaveCompetitor, onDeleteItem, onUpdateStatus, exchangeRate, isRateLoading, onRefreshRate }) => {
    const [activeAnalysisTab, setActiveAnalysisTab] = useState('analysis');
    const [isProviderFormOpen, setProviderFormOpen] = useState(false);
    const [isCompetitorFormOpen, setCompetitorFormOpen] = useState(false);
    const [formData, setFormData] = useState({});

    const analysisData = useMemo(() => {
        if (!opportunity || !opportunity.providerQuotes || opportunity.providerQuotes.length === 0 || !exchangeRate) return { bestProvider: null, bestProviderCostPEN: 0, scenarios: [], recommendation: 'Datos insuficientes', finalMargin: 0 };
        const calculateTotalCostPEN = (p) => ((p.price || 0) + (p.shippingCost || 0)) * (p.currency === 'USD' ? exchangeRate : 1);
        const bestProvider = opportunity.providerQuotes.reduce((best, current) => calculateTotalCostPEN(current) < calculateTotalCostPEN(best) ? current : best);
        const bestProviderCostPEN = calculateTotalCostPEN(bestProvider);
        const salePriceAvg = opportunity.competitorAnalysis?.reduce((sum, c) => sum + (c.salePrice || 0), 0) / (opportunity.competitorAnalysis?.length || 1) || bestProviderCostPEN * 1.8;
        const scenarios = [{ name: 'Competitivo', price: salePriceAvg * 0.85 }, { name: 'Promedio', price: salePriceAvg }, { name: 'Premium', price: salePriceAvg * 1.15 }].map(s => ({ ...s, margin: s.price > 0 ? (((s.price - bestProviderCostPEN) / s.price) * 100) : 0 }));
        const finalMargin = scenarios[1].margin;
        const recommendation = finalMargin > 30 ? 'APROBAR' : 'REVISAR';
        return { bestProvider, bestProviderCostPEN, scenarios, recommendation, finalMargin };
    }, [opportunity, exchangeRate]);

    const handleOpenForm = (type, data = {}) => {
        setFormData(data);
        if (type === 'provider') setProviderFormOpen(true);
        else setCompetitorFormOpen(true);
    };

    const handleSave = async (type) => {
        if (type === 'provider') {
            await onSaveProvider(formData);
            setProviderFormOpen(false);
        } else {
            await onSaveCompetitor(formData);
            setCompetitorFormOpen(false);
        }
    };

    const analysisTabs = [{ id: 'analysis', label: 'Análisis Final', icon: DollarSign }, { id: 'providers', label: 'Proveedores', icon: Users }, { id: 'competitors', label: 'Competencia', icon: TrendingUp }];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
            <div className="bg-gray-50 rounded-xl shadow-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
                <header className="p-6 border-b"><h2 className="text-2xl font-bold text-gray-800">Dashboard de Análisis</h2><p className="text-sm text-gray-600">{opportunity.productName}</p></header>
                <div className="flex-grow flex overflow-hidden">
                    <div className="w-1/4 border-r bg-white p-4"><nav className="flex flex-col gap-2">{analysisTabs.map(tab => (<button key={tab.id} onClick={() => setActiveAnalysisTab(tab.id)} className={`flex items-center gap-3 p-3 rounded-lg text-sm font-semibold transition-colors ${activeAnalysisTab === tab.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}><tab.icon size={18} /><span>{tab.label}</span></button>))}</nav></div>
                    <div className="w-3/4 p-6 overflow-y-auto">
                        {activeAnalysisTab === 'analysis' && (
                            <div>
                                {/* FIX: Using the correct prop name `isRateLoading` instead of `rateLoading` */}
                                {isRateLoading && <Loader />}
                                {!isRateLoading && analysisData.bestProvider ? (
                                    <div className="space-y-6">
                                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                                            <p className="font-bold text-blue-800">Proveedor Recomendado: {analysisData.bestProvider.name}</p>
                                            <p className="text-2xl font-bold text-blue-900">S/ {analysisData.bestProviderCostPEN.toFixed(2)} <span className="text-sm font-normal text-gray-600">(Costo Total en PEN)</span></p>
                                            <div className="text-xs text-gray-500 mt-1">TC actual: {exchangeRate} <button onClick={onRefreshRate} className="ml-2 text-blue-600 hover:underline"><RefreshCw size={12} className="inline-block"/></button></div>
                                        </div>
                                        <div>
                                            <h4 className="font-bold mb-2">Escenarios de Pricing</h4>
                                            <div className="space-y-2">{analysisData.scenarios.map(s => (<div key={s.name} className="flex justify-between items-center p-3 bg-white border rounded-lg"><span className="font-semibold">{s.name}</span><span>S/ {s.price.toFixed(2)}</span><span className={`font-bold text-sm ${s.margin > 0 ? 'text-green-600' : 'text-red-600'}`}>{s.margin.toFixed(1)}% Margen</span></div>))}</div>
                                        </div>
                                        <div className={`p-6 rounded-lg ${analysisData.recommendation === 'APROBAR' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                            <div className="flex justify-between items-center"><p className="text-xl font-bold">Recomendación: <span className={`${analysisData.recommendation === 'APROBAR' ? 'text-green-700' : 'text-red-700'}`}>{analysisData.recommendation}</span></p><p className="text-3xl font-bold">{analysisData.finalMargin.toFixed(1)}%</p></div>
                                        </div>
                                    </div>
                                ) : <p>Añada al menos un proveedor para ver el análisis.</p>}
                            </div>
                        )}
                        {['providers', 'competitors'].includes(activeAnalysisTab) && (
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold">{activeAnalysisTab === 'providers' ? 'Proveedores' : 'Competencia'}</h3>
                                    <button onClick={() => handleOpenForm(activeAnalysisTab === 'providers' ? 'provider' : 'competitor')} className="flex items-center gap-2 text-sm bg-indigo-600 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-700"><Plus size={16}/>Añadir</button>
                                </div>
                                <div className="space-y-3">
                                    {(activeAnalysisTab === 'providers' ? opportunity.providerQuotes : opportunity.competitorAnalysis)?.map(item => (
                                        <div key={item.id} className="bg-white p-3 border rounded-lg flex justify-between items-center">
                                            <div><p className="font-semibold">{item.name}</p><p className="text-xs text-gray-500">{activeAnalysisTab === 'providers' ? `Costo: ${item.price} ${item.currency}` : `Precio Venta: S/ ${item.salePrice}`}</p></div>
                                            <div className="flex gap-2"><button onClick={() => onDeleteItem(activeAnalysisTab === 'providers' ? 'provider' : 'competitor', item.id)}><Trash2 size={16} className="text-gray-400 hover:text-red-500"/></button></div>
                                        </div>
                                    ))}
                                </div>
                                {(isProviderFormOpen && activeAnalysisTab === 'providers') && <ItemForm type="provider" onSave={handleSave} onClose={() => setProviderFormOpen(false)} formData={formData} setFormData={setFormData} />}
                                {(isCompetitorFormOpen && activeAnalysisTab === 'competitors') && <ItemForm type="competitor" onSave={handleSave} onClose={() => setCompetitorFormOpen(false)} formData={formData} setFormData={setFormData} />}
                            </div>
                        )}
                    </div>
                </div>
                <footer className="p-4 border-t bg-white flex justify-between items-center"><button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cerrar</button><div className="flex gap-3"><button onClick={() => onUpdateStatus(opportunity.id, 'rejected')} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700">Rechazar</button><button onClick={() => onUpdateStatus(opportunity.id, 'approved')} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700">Aprobar</button></div></footer>
            </div>
        </div>
    );
};

// --- Formulario Genérico para Proveedores y Competidores ---
const ItemForm = ({ type, onSave, onClose, formData, setFormData }) => (
    <div className="mt-4 p-4 border-t">
        <h4 className="font-semibold mb-2">{type === 'provider' ? 'Añadir Proveedor' : 'Añadir Competidor'}</h4>
        <div className="space-y-3">
            <TextInput label="Nombre" value={formData.name || ''} onChange={(e) => setFormData(p => ({...p, name: e.target.value}))} />
            {type === 'provider' ? (
                <div className="grid grid-cols-2 gap-3">
                    <NumberInput label="Precio" value={formData.price || 0} onChange={(val) => setFormData(p => ({...p, price: val}))} />
                    <SelectInput options={[{value: 'USD', label: 'USD'}, {value: 'PEN', label: 'PEN'}]} value={formData.currency || 'USD'} onChange={(val) => setFormData(p => ({...p, currency: val}))} label="Moneda" />
                    <NumberInput label="Costo Envío" value={formData.shippingCost || 0} onChange={(val) => setFormData(p => ({...p, shippingCost: val}))} />
                </div>
            ) : (
                <NumberInput label="Precio Venta (PEN)" value={formData.salePrice || 0} onChange={(val) => setFormData(p => ({...p, salePrice: val}))} />
            )}
        </div>
        <div className="flex justify-end gap-2 mt-4"><button onClick={onClose} className="text-xs">Cancelar</button><button onClick={() => onSave(type)} className="text-xs bg-gray-800 text-white px-3 py-1 rounded-md">Guardar</button></div>
    </div>
);

// --- Componentes de Formulario Helper ---
const SelectInput = ({ options, value, onChange, placeholder, disabled, label }) => (
    <div>
        {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
        <div className="relative">
            <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="w-full appearance-none bg-white border border-gray-300 rounded-lg py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed">
                <option value="" disabled>{placeholder}</option>
                {options.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"><ChevronDown size={16} /></div>
        </div>
    </div>
);
const TextInput = ({ label, value, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input type="text" value={value} onChange={onChange} className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
    </div>
);
const NumberInput = ({ label, value, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input type="number" value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
    </div>
);
