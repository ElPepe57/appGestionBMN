import React, { useState } from 'react';
import {
  Title, Button, Drawer, TextInput, Textarea, Group, Text, Paper, Divider, Loader, Table, Badge, Select, ActionIcon, List, ThemeIcon, ScrollArea,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase-config';
import { useFirestore } from '../../shared/hooks/useFirestore';
import { Plus, Trash2, Eye, X } from 'lucide-react';

// --- Componente para el Formulario (reutilizable) ---
const RequirementForm = ({ onSave, onCancel }) => {
  const [source, setSource] = useState('');
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

    const requirementData = {
      source,
      contactInfo,
      notes: generalNotes,
      status: 'pending_review',
      createdAt: serverTimestamp(),
      items: validItems.map(item => ({ ...item, status: 'pending_review' })),
    };
    
    await onSave(requirementData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <ScrollArea style={{ height: 'calc(100vh - 120px)' }} p="md">
        <Title order={4}>Información General</Title>
        <Select label="Origen del Requerimiento" placeholder="Selecciona un origen" value={source} onChange={setSource} data={['Cliente', 'Vendedor', 'Gerencia', 'Otro']} required />
        <TextInput label="Información de Contacto" placeholder="Ej: Juan Pérez - 999888777" value={contactInfo} onChange={(e) => setContactInfo(e.currentTarget.value)} mt="md" />
        <Textarea label="Notas Generales" placeholder="El cliente quiere una cotización para estos productos..." value={generalNotes} onChange={(e) => setGeneralNotes(e.currentTarget.value)} mt="md" />
        
        <Divider my="xl" label="Productos Solicitados" labelPosition="center" />
        
        {items.map((item, index) => (
          <Paper key={index} p="sm" withBorder mb="sm" style={{ borderColor: '#e9ecef' }}>
            <Group position="apart">
              <Text fw={500}>Producto #{index + 1}</Text>
              {items.length > 1 && (<ActionIcon color="red" onClick={() => handleRemoveItem(index)}><Trash2 size={16} /></ActionIcon>)}
            </Group>
            <TextInput label="Producto Solicitado" placeholder="Ej: Melatonina" value={item.requestedProduct} onChange={(e) => handleItemChange(index, 'requestedProduct', e.currentTarget.value)} required />
            <Group grow mt="xs">
              <TextInput label="Marca" placeholder="Ej: Natrol" value={item.brand} onChange={(e) => handleItemChange(index, 'brand', e.currentTarget.value)} />
              <TextInput label="Presentación" placeholder="Ej: Tabletas" value={item.presentation} onChange={(e) => handleItemChange(index, 'presentation', e.currentTarget.value)} />
            </Group>
            <Group grow mt="xs">
              <TextInput label="Dosis" placeholder="Ej: 5mg" value={item.dosage} onChange={(e) => handleItemChange(index, 'dosage', e.currentTarget.value)} />
              <TextInput label="Cantidad" placeholder="Ej: 200 unidades" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.currentTarget.value)} />
            </Group>
          </Paper>
        ))}
        <Button leftIcon={<Plus size={16} />} variant="light" onClick={handleAddItem} mt="md">Añadir otro Producto</Button>
      </ScrollArea>
      
      <Group position="right" p="md" style={{ borderTop: '1px solid #dee2e6', position: 'absolute', bottom: 0, left: 0, right: 0, background: 'white' }}>
        <Button variant="default" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">Guardar Requerimiento</Button>
      </Group>
    </form>
  );
};

// --- Componente para los Detalles (solo lectura) ---
const RequirementDetails = ({ requirement }) => (
    <ScrollArea style={{ height: 'calc(100vh - 60px)' }} p="md">
        <Group position="apart" mb="md">
            <Title order={4}>Detalles del Requerimiento</Title>
            {/* El botón de cerrar ahora está en el componente principal */}
        </Group>

        <Text><strong>Origen:</strong> {requirement.source}</Text>
        {requirement.contactInfo && <Text><strong>Contacto:</strong> {requirement.contactInfo}</Text>}
        {requirement.notes && <Text mt="sm"><strong>Notas:</strong> {requirement.notes}</Text>}
        
        <Divider my="xl" label="Productos del Requerimiento" labelPosition="center" />

        <List spacing="sm" size="sm">
            {requirement.items.map((item, index) => (
                <List.Item key={index}
                    icon={
                        <ThemeIcon color={item.status === 'pending_review' ? 'orange' : (item.status === 'classified' ? 'blue' : 'green')} size={24} radius="xl">
                            <Eye size={16} />
                        </ThemeIcon>
                    }>
                    <Text fw={500}>{item.requestedProduct}</Text>
                    <Text size="xs" color="dimmed">
                        {[item.brand, item.presentation, item.dosage, item.quantity].filter(Boolean).join(' / ')}
                    </Text>
                    <Badge size="sm" mt={4} color={item.status === 'pending_review' ? 'orange' : 'gray'}>{item.status.replace('_', ' ').toUpperCase()}</Badge>
                </List.Item>
            ))}
        </List>
    </ScrollArea>
);


// --- Componente Principal ---
const RequirementsManagement = () => {
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
  const [viewMode, setViewMode] = useState(null); // 'create' o 'details'
  const [selectedRequirement, setSelectedRequirement] = useState(null);

  const { data: requirements, loading, error } = useFirestore('requirements');

  const handleOpenCreate = () => {
    setSelectedRequirement(null);
    setViewMode('create');
    openDrawer();
  };

  const handleOpenDetails = (req) => {
    setSelectedRequirement(req);
    setViewMode('details');
    openDrawer();
  };

  const handleCloseDrawer = () => {
    closeDrawer();
    // Pequeño delay para que la animación de cierre termine antes de limpiar el estado
    setTimeout(() => {
        setViewMode(null);
        setSelectedRequirement(null);
    }, 300);
  }

  const handleCreateRequirement = async (requirementData) => {
    try {
      await addDoc(collection(db, 'requirements'), requirementData);
      alert('Requerimiento añadido con éxito.');
      handleCloseDrawer();
    } catch (e) {
      console.error("Error al crear el requerimiento: ", e);
      alert("Hubo un error al crear el requerimiento.");
    }
  };
  
  const getDrawerTitle = () => {
    if (viewMode === 'create') return 'Añadir Nuevo Requerimiento';
    if (viewMode === 'details' && selectedRequirement) return `Requerimiento de: ${selectedRequirement.source}`;
    return 'Gestión de Requerimientos';
  }

  return (
    <div style={{ padding: '2rem' }}>
        {/* --- SIDEBAR (DRAWER) --- */}
        <Drawer
            opened={drawerOpened}
            onClose={handleCloseDrawer}
            title={getDrawerTitle()}
            position="right"
            size="xl"
            padding={0}
            overlayProps={{ opacity: 0.5, blur: 4 }}
            closeButtonProps={{ icon: <X size={20} />, size: 'lg', 'aria-label': 'Cerrar panel' }}
            >
            {viewMode === 'create' && <RequirementForm onSave={handleCreateRequirement} onCancel={handleCloseDrawer} />}
            {viewMode === 'details' && selectedRequirement && <RequirementDetails requirement={selectedRequirement} />}
        </Drawer>

        {/* --- CONTENIDO PRINCIPAL --- */}
        <Group position="apart" mb="lg">
            <Title order={1}>Gestión de Requerimientos</Title>
            <Button onClick={handleOpenCreate} leftIcon={<Plus size={18} />}>
                Añadir Requerimiento
            </Button>
        </Group>

        <Paper withBorder shadow="md" p="md" mt="xl">
            <Title order={3} mb="md">Bandeja de Entrada de Requerimientos</Title>
            {loading && <Loader />}
            {error && <Text color="red">Error: {error.message}</Text>}
            {!loading && !error && (
                <Table striped highlightOnHover verticalSpacing="sm">
                    <thead>
                        <tr>
                            <th>Origen</th>
                            <th># de Productos</th>
                            <th>Estado General</th>
                            <th>Items Pendientes</th>
                            <th style={{ textAlign: 'right' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requirements.length > 0 ? requirements.map(req => {
                            const pendingItems = req.items?.filter(i => i.status === 'pending_review' || i.status === 'classified').length || 0;
                            const totalItems = req.items?.length || 0;
                            let statusBadge;
                            if (pendingItems === 0) {
                                statusBadge = <Badge color="green" variant='light'>Completado</Badge>;
                            } else if (pendingItems < totalItems) {
                                statusBadge = <Badge color="blue" variant='light'>En Proceso</Badge>;
                            } else {
                                statusBadge = <Badge color="orange" variant='light'>Pendiente</Badge>;
                            }
                            return (
                                <tr key={req.id}>
                                    <td>
                                        <Text fw={500}>{req.source}</Text>
                                        <Text size="xs" color="dimmed">{req.contactInfo}</Text>
                                    </td>
                                    <td><Text align="center">{totalItems}</Text></td>
                                    <td>{statusBadge}</td>
                                    <td><Text align="center">{pendingItems}</Text></td>
                                    <td style={{ textAlign: 'right' }}>
                                        <Button 
                                            variant="subtle" 
                                            size="sm"
                                            leftIcon={<Eye size={16} />} 
                                            onClick={() => handleOpenDetails(req)}
                                        >
                                            Ver Detalles
                                        </Button>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={5}>
                                    <Text color="dimmed" align="center" p="md">No hay requerimientos para mostrar.</Text>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            )}
        </Paper>
    </div>
  );
};

export default RequirementsManagement;