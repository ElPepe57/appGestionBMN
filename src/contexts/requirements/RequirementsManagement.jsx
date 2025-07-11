import React, { useState } from 'react';
import {
  Title,
  Button,
  Modal,
  TextInput,
  Textarea,
  Group,
  Text,
  Paper,
  Divider,
  Loader,
  Table,
  Badge,
  Select,
  ActionIcon,
  List,
  ThemeIcon,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase-config';
import { useFirestore } from '../../shared/hooks/useFirestore';
import { Plus, Trash2, CheckCircle, Clock } from 'lucide-react';

const RequirementsManagement = () => {
  const [opened, { open, close }] = useDisclosure(false);
  const [source, setSource] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [items, setItems] = useState([{ requestedProduct: '', brand: '', presentation: '', dosage: '', quantity: '' }]);

  // 1. LEER TODOS LOS REQUERIMIENTOS, NO SOLO LOS PENDIENTES
  const { data: requirements, loading, error } = useFirestore('requirements');

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

  const handleCreateRequirement = async (event) => {
    event.preventDefault();
    const validItems = items.filter(item => item.requestedProduct);
    if (validItems.length === 0) {
      alert("Por favor, añade al menos un producto al requerimiento.");
      return;
    }

    const requirementData = {
      source,
      contactInfo,
      notes: generalNotes,
      // 2. AÑADIR UN ESTADO GENERAL Y UN ESTADO POR ITEM
      status: 'pending_review',
      createdAt: serverTimestamp(),
      items: validItems.map(item => ({ ...item, status: 'pending_review' })),
    };

    try {
      await addDoc(collection(db, 'requirements'), requirementData);
      alert('Requerimiento añadido con éxito.');
      setSource(''); setContactInfo(''); setGeneralNotes('');
      setItems([{ requestedProduct: '', brand: '', presentation: '', dosage: '', quantity: '' }]);
      close();
    } catch (e) {
      console.error("Error al crear el requerimiento: ", e);
      alert("Hubo un error al crear el requerimiento.");
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <Title order={1} mb="lg">Gestión de Requerimientos (Embudo de Entrada)</Title>

      <Modal opened={opened} onClose={close} title="Añadir Nuevo Requerimiento" size="lg">
        <form onSubmit={handleCreateRequirement}>
          <Title order={4}>Información General del Requerimiento</Title>
          <Select label="Origen del Requerimiento" placeholder="Selecciona un origen" value={source} onChange={setSource} data={['Cliente', 'Vendedor', 'Gerencia', 'Otro']} required />
          <TextInput label="Información de Contacto (Opcional)" placeholder="Ej: Juan Pérez - 999888777" value={contactInfo} onChange={(e) => setContactInfo(e.currentTarget.value)} mt="md" />
          <Textarea label="Notas Generales" placeholder="El cliente quiere una cotización para estos productos..." value={generalNotes} onChange={(e) => setGeneralNotes(e.currentTarget.value)} mt="md" />
          <Divider my="xl" label="Productos Solicitados" labelPosition="center" />
          {items.map((item, index) => (
            <Paper key={index} p="sm" withBorder mb="sm">
              <Group position="apart">
                <Text fw={500}>Producto #{index + 1}</Text>
                {items.length > 1 && (<ActionIcon color="red" onClick={() => handleRemoveItem(index)}><Trash2 size={16} /></ActionIcon>)}
              </Group>
              <TextInput label="Producto Solicitado" placeholder="Ej: Melatonina" value={item.requestedProduct} onChange={(e) => handleItemChange(index, 'requestedProduct', e.currentTarget.value)} required />
              <Group grow mt="xs">
                <TextInput label="Marca (Opcional)" placeholder="Ej: Natrol" value={item.brand} onChange={(e) => handleItemChange(index, 'brand', e.currentTarget.value)} />
                <TextInput label="Presentación (Opcional)" placeholder="Ej: Tabletas" value={item.presentation} onChange={(e) => handleItemChange(index, 'presentation', e.currentTarget.value)} />
              </Group>
              <Group grow mt="xs">
                <TextInput label="Dosis (Opcional)" placeholder="Ej: 5mg" value={item.dosage} onChange={(e) => handleItemChange(index, 'dosage', e.currentTarget.value)} />
                <TextInput label="Cantidad (Opcional)" placeholder="Ej: 200 unidades" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.currentTarget.value)} />
              </Group>
            </Paper>
          ))}
          <Button leftIcon={<Plus size={16} />} variant="light" onClick={handleAddItem} mt="md">Añadir otro Producto</Button>
          <Button type="submit" fullWidth mt="xl">Guardar Requerimiento</Button>
        </form>
      </Modal>

      <Button onClick={open}>Añadir Requerimiento</Button>

      <Paper withBorder shadow="md" p="md" mt="xl">
        <Title order={3} mb="md">Bandeja de Entrada de Requerimientos</Title>
        {loading && <Loader />}
        {error && <Text color="red">Error: {error.message}</Text>}
        {!loading && !error && (
            <Table striped highlightOnHover>
                <thead>
                    <tr>
                        <th>Origen</th>
                        <th># de Productos</th>
                        <th>Estado General</th>
                        <th>Items Pendientes</th>
                    </tr>
                </thead>
                <tbody>
                    {requirements.map(req => {
                        // 3. CALCULAR EL ESTADO DINÁMICAMENTE
                        const pendingItems = req.items?.filter(i => i.status === 'pending_review').length || 0;
                        let statusBadge;
                        if (pendingItems === 0) {
                            statusBadge = <Badge color="green">Completado</Badge>;
                        } else if (pendingItems < req.items?.length) {
                            statusBadge = <Badge color="blue">En Proceso</Badge>;
                        } else {
                            statusBadge = <Badge color="orange">Pendiente</Badge>;
                        }
                        return (
                            <tr key={req.id}>
                                <td>{req.source} ({req.contactInfo})</td>
                                <td>{req.items?.length || 0}</td>
                                <td>{statusBadge}</td>
                                <td>{pendingItems}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </Table>
        )}
        {!loading && requirements.length === 0 && <Text mt="md">No hay requerimientos pendientes de revisión.</Text>}
      </Paper>
    </div>
  );
};

export default RequirementsManagement;
