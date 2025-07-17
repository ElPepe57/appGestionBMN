import React, { useState } from 'react';
import { AppLayout } from './AppLayout'; 
// FIX: Importing the new OpportunityPipelineTabs component
import OpportunityPipelineTabs from './contexts/opportunities/OpportunityPipelineTabs'; 
import ProcurementManagement from './contexts/procurement/ProcurementManagement';
import ProductManagement from './contexts/products/ProductManagement';
import QuotationManagement from './contexts/quotations/QuotationManagement';
import RequirementsManagement from './contexts/requirements/RequirementsManagement';
import SalesManagement from './contexts/sales/SalesManagement';
import WmsDashboard from './contexts/wms/WmsDashboard';

function App() {
  // Set the default view to the new opportunities pipeline
  const [activeComponent, setActiveComponent] = useState('opportunities');
  const [selectedProductId, setSelectedProductId] = useState(null);

  const handleNavigateToWms = (productId) => {
    setSelectedProductId(productId);
    setActiveComponent('wms');
  };

  const handleNavClick = (componentName) => {
    setActiveComponent(componentName);
  };

  const renderComponent = () => {
    switch (activeComponent) {
      // FIX: This case now renders the new pipeline component
      case 'opportunities':
        return <OpportunityPipelineTabs />;
      case 'procurement':
        return <ProcurementManagement />;
      case 'products':
        return <ProductManagement onProductSelect={handleNavigateToWms} />;
      case 'quotations':
        return <QuotationManagement />;
      case 'requirements':
        return <RequirementsManagement />;
      case 'sales':
        return <SalesManagement />;
      case 'wms':
        return <WmsDashboard 
                  productId={selectedProductId} 
                  onBack={() => setActiveComponent('products')} 
               />;
      default:
        return <OpportunityPipelineTabs />;
    }
  };

  return (
    <AppLayout onNavClick={handleNavClick} activeComponent={activeComponent}>
      {renderComponent()}
    </AppLayout>
  );
}

export default App;
