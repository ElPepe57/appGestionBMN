import React from 'react';
import { AppShell, Title, NavLink } from '@mantine/core';
import { FileText, Lightbulb, Package, ShoppingCart, DollarSign, Inbox } from 'lucide-react';

// Lista de los módulos de tu aplicación para la barra de navegación
const navLinks = [
  { icon: <Inbox size={16} />, label: 'Requerimientos', value: 'requirements' },
  { icon: <Lightbulb size={16} />, label: 'Oportunidades', value: 'opportunities' },
  { icon: <Package size={16} />, label: 'Productos', value: 'products' },
  { icon: <ShoppingCart size={16} />, label: 'Compras', value: 'procurement' },
  { icon: <DollarSign size={16} />, label: 'Ventas', value: 'sales' },
  { icon: <FileText size={16} />, label: 'Cotizaciones', value: 'quotations' },
];

export function AppLayout({ children, activeTab, onNavClick }) {
  const links = navLinks.map((link) => (
    <NavLink
      key={link.label}
      active={link.value === activeTab}
      label={link.label}
      leftSection={link.icon}
      onClick={() => onNavClick(link.value)}
      variant="subtle"
      color="blue"
      className="rounded-lg"
    />
  ));

  return (
    <AppShell
      padding="md"
      header={{ height: 60 }}
      navbar={{ width: 250, breakpoint: 'sm' }}
    >
      <AppShell.Header className="bg-blue-700 shadow">
        <Title order={3} p="md" className="text-white">Sistema de Gestión de Negocio</Title>
      </AppShell.Header>

      <AppShell.Navbar p="md" className="bg-white border-r">
        <div className="space-y-2">{links}</div>
      </AppShell.Navbar>

      <AppShell.Main className="bg-gray-50 min-h-screen p-6">
        {children}
      </AppShell.Main>
    </AppShell>
  );
}

export default AppLayout;