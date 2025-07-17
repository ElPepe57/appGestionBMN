import React, { useState, useMemo } from 'react';
import { collection, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../../firebase-config';
import { useFirestore } from '../../shared/hooks/useFirestore';
import { Plus, Trash2, Eye, X, Inbox, Loader, AlertCircle } from 'lucide-react';

// --- Componente para el Formulario de Creación ---
const RequirementForm = ({ onSave, onCancel }) => {
  const [source, setSource] = useState('Interno');
  const [contactInfo, setContactInfo] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [items, setItems] = useState([{ requestedProduct: '', brand: '', presentation: '', dosage: '', quantity: '' }]);

  const handleAddItem = () => {
    setItems([...items, { requestedProduct: '', brand: '', presentation: '', dosage: '', quantity: '' }]);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validItems = items.filter(item => item.requestedProduct.trim());
    if (validItems.length === 0) {
      alert("Por favor, añade al menos un producto al requerimiento.");
      return;
    }
    
    // This function creates a single "requirement" document that contains multiple items.
    const requirementData = {
        source: source,
        contactInfo: contactInfo,
        notes: generalNotes,
        items: validItems.map(item => ({ ...item, status: 'pending_review' })), // Each item starts as pending
        status: 'pending_review', // The overall status of the requirement
        createdAt: serverTimestamp(),
    };
    await onSave(requirementData);
  };

  return (
    <form onSubmit={handleSubmit} className="h-full flex flex-col">
      <div className="p-6 overflow-y-auto flex-grow">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Información General</h2>
        <div className="space-y-4">
          <SelectInput label="Origen del Requerimiento" value={source} onChange={(e) => setSource(e.target.value)} options={['Cliente', 'Vendedor', 'Gerencia', 'Interno']} required />
          <TextInput label="Información de Contacto" placeholder="Ej: Juan Pérez - 999888777" value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} />
          <TextareaInput label="Notas Generales" placeholder="El cliente quiere una cotización para estos productos..." value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} />
        </div>
        
        <hr className="my-6" />
        <h3 className="text-lg font-bold text-gray-800 mb-4">Productos Solicitados</h3>
        
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg border">
              <div className="flex justify-between items-center mb-2">
                <p className="font-semibold text-gray-700">Producto #{index + 1}</p>
                {items.length > 1 && (<button type="button" onClick={() => handleRemoveItem(index)}><Trash2 size={16} className="text-gray-400 hover:text-red-500" /></button>)}
              </div>
              <TextInput label="Producto Solicitado" placeholder="Ej: Melatonina" value={item.requestedProduct} onChange={(e) => handleItemChange(index, 'requestedProduct', e.target.value)} required />
              <div className="grid grid-cols-2 gap-4 mt-2">
                <TextInput label="Marca" placeholder="Ej: Natrol" value={item.brand} onChange={(e) => handleItemChange(index, 'brand', e.target.value)} />
                <TextInput label="Presentación" placeholder="Ej: Tabletas" value={item.presentation} onChange={(e) => handleItemChange(index, 'presentation', e.target.value)} />
                <TextInput label="Dosis" placeholder="Ej: 5mg" value={item.dosage} onChange={(e) => handleItemChange(index, 'dosage', e.target.value)} />
                <TextInput label="Cantidad" placeholder="Ej: 200 unidades" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} />
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="flex items-center gap-2 text-sm text-indigo-600 font-semibold mt-4 hover:text-indigo-800" onClick={handleAddItem}>
          <Plus size={16} /> Añadir otro Producto
        </button>
      </div>
      
      <div className="p-4 bg-white border-t flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
        <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Guardar Requerimiento</button>
      </div>
    </form>
  );
};

// --- Componente Principal ---
const RequirementsManagement = () => {
  const [drawerOpened, setDrawerOpened] = useState(false);
  
  // FIX: Fetching from the 'requirements' collection now.
  const { data: requirements, loading, error } = useFirestore('requirements');

  const handleCreateRequirement = async (requirementData) => {
    try {
      // FIX: The form now saves to the 'requirements' collection.
      await addDoc(collection(db, 'requirements'), requirementData);
      alert('Requerimiento creado con éxito.');
    } catch (e) {
      console.error("Error al crear el requerimiento: ", e);
      alert("Hubo un error al crear el requerimiento.");
    }
    setDrawerOpened(false);
  };

  return (
    <>
      {/* --- SIDEBAR (DRAWER) --- */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${drawerOpened ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-xl font-bold">Añadir Nuevo Requerimiento</h2>
            <button onClick={() => setDrawerOpened(false)} className="p-2 rounded-full hover:bg-gray-100"><X size={20} /></button>
        </div>
        <RequirementForm onSave={handleCreateRequirement} onCancel={() => setDrawerOpened(false)} />
      </div>
      
      {drawerOpened && <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setDrawerOpened(false)}></div>}

      {/* --- CONTENIDO PRINCIPAL --- */}
      <div className="bg-gray-50 p-4 sm:p-6 lg:p-8 font-sans min-h-full">
        <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Gestión de Requerimientos (Embudo de Entrada)</h1>
                <p className="text-gray-600 mt-1 text-sm">Crea y gestiona las solicitudes iniciales antes de que se conviertan en oportunidades.</p>
            </div>
            <button onClick={() => setDrawerOpened(true)} className="mt-4 sm:mt-0 flex items-center gap-2 bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm w-full sm:w-auto justify-center">
                <Plus size={16} />
                Añadir Requerimiento
            </button>
        </header>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-800">Bandeja de Entrada de Requerimientos</h2>
                <p className="text-sm text-gray-500 mt-1">Todas las solicitudes nuevas y en proceso de revisión.</p>
            </div>
            {loading ? (
                <div className="p-8 text-center"><Loader /></div>
            ) : error ? (
                <div className="p-8 text-center text-red-500"><AlertCircle className="mx-auto mb-2" />Error al cargar datos.</div>
            ) : requirements.length === 0 ? (
                <div className="text-center py-16 px-6">
                    <div className="mx-auto w-fit bg-gray-100 rounded-full p-4"><Inbox size={32} className="text-gray-400" /></div>
                    <h3 className="mt-4 text-lg font-semibold text-gray-800">Bandeja Vacía</h3>
                    <p className="mt-1 text-sm text-gray-500">Usa el botón "Añadir Requerimiento" para empezar.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50/50 text-left">
                            <tr>
                                <th className="px-6 py-3 font-semibold text-gray-600">Origen</th>
                                <th className="px-6 py-3 font-semibold text-gray-600 text-center"># de Productos</th>
                                <th className="px-6 py-3 font-semibold text-gray-600">Estado General</th>
                                <th className="px-6 py-3 font-semibold text-gray-600 text-center">Items Pendientes</th>
                                <th className="px-6 py-3 font-semibold text-gray-600 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {requirements.map(req => {
                                const totalItems = req.items?.length || 0;
                                const pendingItems = req.items?.filter(i => i.status === 'pending_review').length || 0;
                                const isCompleted = pendingItems === 0 && totalItems > 0;
                                return (
                                    <tr key={req.id} className="hover:bg-gray-50/50">
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-gray-800">{req.source}</p>
                                            <p className="text-xs text-gray-500">{req.contactInfo}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center font-medium">{totalItems}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${isCompleted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {isCompleted ? 'Completado' : 'Pendiente'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center font-medium">{pendingItems}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="flex items-center gap-1.5 text-sm text-indigo-600 font-semibold hover:text-indigo-800">
                                                <Eye size={16} /> Ver Detalles
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      </div>
    </>
  );
};

// --- Componentes Helper de Formulario con Tailwind ---
const TextInput = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input type="text" {...props} className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
    </div>
);
const TextareaInput = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <textarea {...props} rows="3" className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
    </div>
);
const SelectInput = ({ label, options, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <select {...props} className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

export default RequirementsManagement;
