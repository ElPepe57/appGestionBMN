import React, { useState, useMemo } from 'react';
import {
  Title,
  Button,
  Modal,
  TextInput,
  Textarea,
  Group,
  ActionIcon,
  Text,
  Paper,
  Divider,
  Loader,
  Card,
  Badge,
  NumberInput,
  Autocomplete,
  Table,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Plus, Trash2, Lightbulb } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '../../firebase-config';
import { useFirestore } from '../../shared/hooks/useFirestore';

const QuotationManagement = ({ onAnalyzeAsOpportunity }) => {
  const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);
  const [detailModalOpened, { open: openDetailModal, close: closeDetailModal }] = useDisclosure(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [editableItems, setEditableItems] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ skuId: '', fullName: '', quantity: 1, price: 0 }]);
  
  // 1. LEER LAS OPORTUNIDADES APROBADAS PARA COTIZAR
  const { data: pendingQuotes, loading: pendingLoading } = useFirestore('opportunities', [
    where('status', '==', 'approved_for_quotation')
  ]);

  const { data: quotations, loading: quotationsLoading, error: quotationsError } = useFirestore('quotation_requests');
  const { data: skus, loading: skusLoading } = useFirestore('skus');

  // 2. PREPARAR EL CATÁLOGO DE SKUS PARA EL AUTOCOMPLETE
  const skuCatalog = useMemo(() => 
    skus.map(s => ({
      value: s.fullName,
      id: s.id,
      salePrice: s.salePrice,
    })), 
  [skus]);

  const handleAddItem = () => {
    setItems([...items, { skuId: '', fullName: '', quantity: 1, price: 0 }]);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    const currentItem = newItems[index];
    currentItem[field] = value;

    if (field === 'fullName') {
      const selectedSku = skuCatalog.find(s => s.value === value);
      if (selectedSku) {
        currentItem.skuId = selectedSku.id;
        currentItem.price = selectedSku.salePrice;
      } else {
        currentItem.skuId = '';
      }
    }
    setItems(newItems);
  };
  
  const handlePrepareQuoteFromOpp = (opp) => {
    setCustomerName(opp.source === 'Cliente' ? 'Cliente del Requerimiento (ver notas)' : 'N/A');
    setNotes(`Cotización generada desde la oportunidad: ${opp.productName}. Detalles: ${Object.values(opp.specifics).filter(Boolean).join(', ')}`);
    setItems([{
      skuId: '', // Se deja vacío para que el vendedor busque el SKU final
      fullName: opp.productName,
      quantity: 1,
      price: opp.estimatedSalePrice || 0,
    }]);
    openCreateModal();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validItems = items.filter(item => item.fullName && item.quantity);
    if (validItems.length === 0) {
      alert('Por favor, añade al menos un producto válido.');
      return;
    }
    const quotationRequestData = {
      customerName,
      notes,
      items: validItems.map(item => ({
        skuId: item.skuId || null, // Puede que no tenga ID si es un producto no catalogado
        fullName: item.fullName,
        quantity: Number(item.quantity),
        price: Number(item.price),
      })),
      status: 'quoted',
      createdAt: serverTimestamp(),
    };
    try {
      await addDoc(collection(db, 'quotation_requests'), quotationRequestData);
      alert('¡Cotización creada con éxito!');
      closeCreateModal();
      setCustomerName(''); setNotes(''); setItems([{ skuId: '', fullName: '', quantity: 1, price: 0 }]);
    } catch (error) {
      console.error("Error:", error);
      alert('Hubo un error al guardar la cotización.');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <Title order={1} mb="lg">Gestión de Cotizaciones</Title>

      <Paper withBorder shadow="md" p="md" mt="xl" mb="xl">
        <Title order={3} mb="md">Cotizaciones Pendientes por Generar (Desde Oportunidades)</Title>
        {pendingLoading && <Loader />}
        {!pendingLoading && (
          <Table>
            <thead>
              <tr>
                <th>Producto Aprobado</th>
                <th>Origen</th>
                <th>Precio Venta Estimado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {pendingQuotes.map(opp => (
                <tr key={opp.id}>
                  <td>{opp.productName}</td>
                  <td><Badge color="cyan">{opp.source}</Badge></td>
                  <td>S/ {opp.estimatedSalePrice?.toFixed(2) || '0.00'}</td>
                  <td>
                    <Button size="xs" onClick={() => handlePrepareQuoteFromOpp(opp)}>
                      Generar Cotización
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {!pendingLoading && pendingQuotes.length === 0 && <Text mt="md">No hay cotizaciones pendientes por generar.</Text>}
      </Paper>
      
      <Divider my="xl" />

      <Button onClick={openCreateModal}>Crear Cotización Manual</Button>

      <Modal opened={createModalOpened} onClose={closeCreateModal} title="Crear Nueva Cotización" size="lg">
        <form onSubmit={handleSubmit}>
          <TextInput label="Nombre del Cliente" placeholder="Nombre del Cliente SAC" value={customerName} onChange={(e) => setCustomerName(e.currentTarget.value)} required />
          <Textarea label="Notas Adicionales" placeholder="El cliente necesita los productos para fin de mes." value={notes} onChange={(e) => setNotes(e.currentTarget.value)} mt="md" />
          <Divider my="lg" label="Productos a Cotizar" labelPosition="center" />
          {items.map((item, index) => (
            <Paper key={index} p="sm" withBorder mb="sm">
              <Group position="apart">
                <Text fw={500}>Producto #{index + 1}</Text>
                {items.length > 1 && (<ActionIcon color="red" onClick={() => handleRemoveItem(index)}><Trash2 size={16} /></ActionIcon>)}
              </Group>
              <Autocomplete
                label="Nombre del Producto/SKU"
                placeholder="Busca un SKU o escribe un nombre"
                data={skuCatalog.map(s => s.value)}
                value={item.fullName}
                onChange={(value) => handleItemChange(index, 'fullName', value)}
                onItemSubmit={(selected) => handleItemChange(index, 'fullName', selected.value)}
                required
              />
              <Group grow mt="xs">
                <NumberInput label="Cantidad" placeholder="0" value={item.quantity} onChange={(value) => handleItemChange(index, 'quantity', value)} required />
                <NumberInput label="Precio Unitario (S/.)" placeholder="0.00" precision={2} value={item.price} onChange={(value) => handleItemChange(index, 'price', value)} required />
              </Group>
            </Paper>
          ))}
          <Button leftIcon={<Plus size={16} />} variant="light" onClick={handleAddItem} mt="md">Añadir Producto</Button>
          <Group position="right" mt="xl"><Button type="submit">Guardar Cotización</Button></Group>
        </form>
      </Modal>

      <Paper withBorder shadow="md" p="md" mt="xl">
        <Title order={3} mb="md">Historial de Cotizaciones</Title>
        {(quotationsLoading || skusLoading) && <Loader />}
        {quotationsError && <Text color="red">Error: {quotationsError.message}</Text>}
        {!(quotationsLoading || skusLoading) && !quotationsError && (
          <Table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th># Items</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map(quote => (
                <tr key={quote.id}>
                  <td>{quote.customerName}</td>
                  <td>{quote.items?.length || 0}</td>
                  <td><Badge color={quote.status === 'quoted' ? 'green' : 'pink'} variant="light">{quote.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {!quotationsLoading && quotations.length === 0 && <Text mt="md">No hay cotizaciones.</Text>}
      </Paper>
    </div>
  );
};

export default QuotationManagement;
