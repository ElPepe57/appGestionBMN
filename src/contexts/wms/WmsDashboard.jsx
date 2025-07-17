import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase-config'; // Asegúrate que la ruta sea correcta
import { Package, Plane, Warehouse, ArrowRightLeft, Plus, Loader } from 'lucide-react';

// --- SUB-COMPONENTES DE UI (Sin cambios) ---
const StockLocationCard = ({ icon, title, quantity, bgColor, iconColor }) => {
  const Icon = icon;
  return (
    <div className={`p-4 rounded-lg flex items-center gap-4 ${bgColor}`}>
      <div className={`p-2 rounded-full`} style={{ backgroundColor: iconColor + '20' }}>
        <Icon size={20} className="text-white" style={{ color: iconColor }} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-xl font-bold text-gray-800">{quantity.toLocaleString()}</p>
      </div>
    </div>
  );
};


// --- COMPONENTE PRINCIPAL ADAPTADO ---
export default function WmsDashboard({ productId, onBack }) {
  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) {
        setLoading(false);
        return;
    };

    setLoading(true);
    // Creamos una referencia directa al documento del producto en Firestore
    const productRef = doc(db, 'products', productId);

    // onSnapshot escucha cambios en tiempo real en el documento
    const unsubscribe = onSnapshot(productRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Calculamos los totales dinámicamente
        const stock = data.stock || { en_almacen_us: 0, en_transito_peru: 0, la_victoria: 0, smp: 0 };
        const totalStock = Object.values(stock).reduce((sum, val) => sum + val, 0);
        const availableForSale = (stock.la_victoria || 0) + (stock.smp || 0);

        setProductData({
          id: docSnap.id,
          ...data,
          stock, // Usamos el objeto stock normalizado
          totalStock,
          availableForSale,
        });
      } else {
        console.error("No se encontró el producto!");
        setProductData(null);
      }
      setLoading(false);
    }, (error) => {
        console.error("Error al obtener el producto:", error);
        setLoading(false);
    });

    // La función de limpieza se ejecuta cuando el componente se desmonta
    return () => unsubscribe();
  }, [productId]); // El efecto se vuelve a ejecutar si cambia el productId

  if (loading) {
    return <div className="flex justify-center items-center h-96"><Loader className="animate-spin" size={48} /></div>;
  }

  if (!productData) {
    return (
        <div className="text-center p-8">
            <h2 className="text-xl font-semibold">Producto no encontrado</h2>
            <p className="text-gray-500">Por favor, selecciona un producto de la lista para ver su inventario.</p>
            <button onClick={onBack} className="mt-4 bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700">
                Volver a Productos
            </button>
        </div>
    );
  }

  // El resto del JSX es igual, pero usa `productData` del estado
  return (
    <div className="bg-gray-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <button onClick={onBack} className="text-sm font-semibold text-indigo-600 hover:underline mb-4">
            &larr; Volver a la lista de productos
        </button>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{productData.nombre}</h1>
          <p className="text-sm text-gray-500 font-mono mt-1">SKU: {productData.sku}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm text-center">
            <p className="text-base font-semibold text-gray-500">Stock Total</p>
            <p className="text-5xl font-bold text-gray-900 mt-2">{productData.totalStock.toLocaleString()}</p>
          </div>
          <div className="bg-green-600 text-white p-6 rounded-xl shadow-sm text-center">
            <p className="text-base font-semibold text-green-100">Disponible para Venta</p>
            <p className="text-5xl font-bold mt-2">{productData.availableForSale.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Desglose del Inventario</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StockLocationCard icon={Package} title="En Almacén US" quantity={productData.stock.en_almacen_us} bgColor="bg-blue-50" iconColor="#3b82f6"/>
            <StockLocationCard icon={Plane} title="En Tránsito a Perú" quantity={productData.stock.en_transito_peru} bgColor="bg-yellow-50" iconColor="#f59e0b"/>
            <StockLocationCard icon={Warehouse} title="Almacén La Victoria" quantity={productData.stock.la_victoria} bgColor="bg-green-50" iconColor="#16a34a"/>
            <StockLocationCard icon={Warehouse} title="Almacén SMP" quantity={productData.stock.smp} bgColor="bg-green-50" iconColor="#16a34a"/>
          </div>
          <div className="mt-8 border-t pt-6 flex flex-col md:flex-row items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-700">Acciones Rápidas</h3>
            <div className="flex-grow"></div>
            <button className="w-full md:w-auto flex items-center justify-center gap-2 bg-gray-100 text-gray-800 font-semibold px-4 py-2 rounded-lg hover:bg-gray-200">
              <Plus size={16} />
              Registrar Recepción
            </button>
            <button className="w-full md:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700">
              <ArrowRightLeft size={16} />
              Transferir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}