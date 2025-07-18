import React from 'react';
import { AppShell, Burger, Group, NavLink, Stack, Title } from '@mantine/core';
import { FileText, Lightbulb, Package, ShoppingCart, DollarSign, Inbox, Users as IconUsers } from 'lucide-react';

// Restauramos la estructura con ambos módulos
const navLinksData = [
  { icon: <Inbox size={16} />, label: 'Requerimientos', value: 'requirements' },
  { icon: <Lightbulb size={16} />, label: 'Oportunidades', value: 'opportunities' }, // <-- Módulo de Oportunidades
  { icon: <Package size={16} />, label: 'Productos', value: 'products' },
  { icon: <ShoppingCart size={16} />, label: 'Compras', value: 'procurement' },
  { icon: <DollarSign size={16} />, label: 'Ventas', value: 'sales' },
  { icon: <FileText size={16} />, label: 'Cotizaciones', value: 'quotations' },
  { icon: <IconUsers size={16} />, label: 'Contactos', value: 'customers' },
];

export function AppLayout({ children, activeTab, onNavClick, navbarOpened, toggleNavbar }) {
  const links = navLinksData.map((link) => (
    <NavLink
      key={link.label}
      active={link.value === activeTab}
      label={link.label}
      leftSection={link.icon}
      onClick={() => {
        onNavClick(link.value);
        if (navbarOpened) {
          toggleNavbar();
        }
      }}
      variant="filled"
      radius="md"
    />
  ));

  return (
    <AppShell
      padding="md"
      header={{ height: 60 }}
      navbar={{
        width: 250,
        breakpoint: 'sm',
        collapsed: { mobile: !navbarOpened },
      }}
    >
      <AppShell.Header bg="blue.7" c="white">
        <Group h="100%" px="md">
          <Burger
            opened={navbarOpened}
            onClick={toggleNavbar}
            hiddenFrom="sm"
            size="sm"
            color="white"
          />
          <Title order={3}>Sistema de Gestión</Title>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <Stack gap="sm">
          {links}
        </Stack>
      </AppShell.Navbar>
      <AppShell.Main bg="gray.0">
        {children}
      </AppShell.Main>
    </AppShell>
  );
}

export default AppLayout;