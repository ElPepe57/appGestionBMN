import React, { useState } from 'react';
import { useDisclosure } from '@mantine/hooks';
import { AppLayout } from './AppLayout';
import RequirementsManagement from './contexts/requirements/RequirementsManagement';
import OpportunityManagement from './modules/opportunities/OpportunityManagement'; // <-- 1. IMPORTAMOS EL NUEVO MÓDULO
import ProductManagement from './contexts/products/ProductManagement';
import CustomerManagement from './modules/customers/CustomerManagement';
// ... (importa tus otros módulos aquí)

function App() {
  const [navbarOpened, { toggle: toggleNavbar }] = useDisclosure(false);
  const [activeComponent, setActiveComponent] = useState('requirements'); // Empezamos en Requerimientos
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
      case 'requirements':
        return <RequirementsManagement />;
      case 'opportunities': // <-- 2. AÑADIMOS EL CASO PARA RENDERIZAR OPORTUNIDADES
        return <OpportunityManagement />;
      case 'products':
        return <ProductManagement onProductSelect={handleNavigateToWms} />;
      case 'customers':
        return <CustomerManagement />;
      // ... (añade tus otros casos aquí: sales, wms, etc.)
      default:
        return <RequirementsManagement />;
    }
  };

  return (
    <AppLayout
      onNavClick={handleNavClick}
      activeTab={activeComponent}
      navbarOpened={navbarOpened}
      toggleNavbar={toggleNavbar}
    >
      {renderComponent()}
    </AppLayout>
  );
}

export default App;