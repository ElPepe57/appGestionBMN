// src/App.js

import React, { useState } from 'react';
import { AppLayout } from './AppLayout'; // Importamos nuestro nuevo Layout

// Importamos todos los componentes de gestión
import RequirementsManagement from './contexts/requirements/RequirementsManagement';
import OpportunityManagement from './contexts/opportunities/OpportunityManagement';
import ProductManagement from './contexts/products/ProductManagement';
import ProcurementManagement from './contexts/procurement/ProcurementManagement';
import SalesManagement from './contexts/sales/SalesManagement';
import QuotationManagement from './contexts/quotations/QuotationManagement';

import './App.css';

// Mapeo de los componentes a sus identificadores
const componentMap = {
  requirements: <RequirementsManagement />,
  opportunities: <OpportunityManagement />,
  products: <ProductManagement />,
  procurement: <ProcurementManagement />,
  sales: <SalesManagement />,
  quotations: <QuotationManagement />,
};

function App() {
  const [activeTab, setActiveTab] = useState('requirements');

  const handleNavClick = (tabValue) => {
    setActiveTab(tabValue);
  };

  return (
    <div className="App">
      <AppLayout activeTab={activeTab} onNavClick={handleNavClick}>
        {/* Renderiza el componente activo basado en el estado */}
        {componentMap[activeTab]}
      </AppLayout>
    </div>
  );
}

export default App;