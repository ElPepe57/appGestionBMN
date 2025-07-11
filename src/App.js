import React, { useState } from 'react';
import { Tabs, Title, Box } from '@mantine/core';
import { FileText, Lightbulb, Package, ShoppingCart, DollarSign, Inbox } from 'lucide-react'; // 1. Importar nuevo ícono
import OpportunityManagement from './contexts/opportunities/OpportunityManagement';
import QuotationManagement from './contexts/quotations/QuotationManagement';
import ProductManagement from './contexts/products/ProductManagement';
import ProcurementManagement from './contexts/procurement/ProcurementManagement';
import SalesManagement from './contexts/sales/SalesManagement';
import RequirementsManagement from './contexts/requirements/RequirementsManagement'; // 2. Importar nuevo componente
import './App.css';

function App() {
  // 3. Establecer "Requerimientos" como la pestaña inicial
  const [activeTab, setActiveTab] = useState('requirements'); 
  
  const [opportunityModal, setOpportunityModal] = useState({
    opened: false,
    initialProductName: '',
  });

  const handleAnalyzeAsOpportunity = (productName) => {
    setOpportunityModal({
      opened: true,
      initialProductName: productName,
    });
    setActiveTab('opportunities');
  };

  const closeOpportunityModal = () => {
    setOpportunityModal({ opened: false, initialProductName: '' });
  };

  const handleTabChange = (value) => {
    if (value) {
      setActiveTab(value);
    }
  };

  return (
    <div className="App">
      <Box p="md">
        <Title order={2} align="center" mb="xl">
          Sistema de Gestión de Negocio
        </Title>
        
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tabs.List grow>
            {/* 4. Añadir la nueva pestaña de Requerimientos al principio */}
            <Tabs.Tab value="requirements" icon={<Inbox size={16} />}>
              Requerimientos
            </Tabs.Tab>
            <Tabs.Tab value="opportunities" icon={<Lightbulb size={16} />}>
              Oportunidades
            </Tabs.Tab>
            <Tabs.Tab value="products" icon={<Package size={16} />}>
              Productos
            </Tabs.Tab>
            <Tabs.Tab value="procurement" icon={<ShoppingCart size={16} />}>
              Compras
            </Tabs.Tab>
            <Tabs.Tab value="sales" icon={<DollarSign size={16} />}>
              Ventas
            </Tabs.Tab>
             <Tabs.Tab value="quotations" icon={<FileText size={16} />}>
              Cotizaciones
            </Tabs.Tab>
          </Tabs.List>

          {/* 5. Añadir el panel para el nuevo componente */}
          <Tabs.Panel value="requirements" pt="xs">
            <RequirementsManagement />
          </Tabs.Panel>
          <Tabs.Panel value="opportunities" pt="xs">
            <OpportunityManagement
              isCreateModalOpened={opportunityModal.opened}
              closeCreateModal={closeOpportunityModal}
              initialProductName={opportunityModal.initialProductName}
            />
          </Tabs.Panel>
          <Tabs.Panel value="products" pt="xs">
            <ProductManagement />
          </Tabs.Panel>
          <Tabs.Panel value="procurement" pt="xs">
            <ProcurementManagement />
          </Tabs.Panel>
          <Tabs.Panel value="sales" pt="xs">
            <SalesManagement />
          </Tabs.Panel>
           <Tabs.Panel value="quotations" pt="xs">
            <QuotationManagement onAnalyzeAsOpportunity={handleAnalyzeAsOpportunity} />
          </Tabs.Panel>
        </Tabs>
      </Box>
    </div>
  );
}

export default App;
