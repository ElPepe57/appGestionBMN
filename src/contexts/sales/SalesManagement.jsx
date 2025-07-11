import React, { useState, useMemo } from 'react';
import {
  Title,
  Button,
  Modal,
  TextInput,
  Group,
  ActionIcon,
  Text,
  Paper,
  Divider,
  Loader,
  Table,
  Badge,
  Autocomplete,
  NumberInput,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Plus, Trash2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase-config';
import { useFirestore } from '../../shared/hooks/useFirestore';

const SalesManagement = () => {
  const [opened, { open, close }] = useDisclosure(false);
  
  const [customerName, setCustomerName] = useState('');
  const [items, setItems] = useState([{ skuId: '', fullName: '', quantity: 1, salePrice: 0, stock: 0 }]);

  const { data: skus, loading: skusLoading } = useFirestore('skus');
  const { data: sales, loading: salesLoading, error: salesError } = useFirestore('sales');

  const skuCatalog = useMemo(() => 
    skus
      .filter(s => s.active && s.stock > 0)
      .map(s => ({
        value: s.fullName,
        id: s.id,
        salePrice: s.salePrice,
        stock: s.stock,
      })), 
    [skus]
  );

  const currentUserId = 'user_test_01';

  const handleAddItem = () => {
    setItems([...items, { skuId: '', fullName: '', quantity: 1, salePrice: 0, stock: 0 }]);
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
        currentItem.salePrice = selectedSku.salePrice;
        currentItem.stock = selectedSku.stock;
      } else {
        currentItem.skuId = '';
        currentItem.stock = 0;
      }
    }
    
    setItems(newItems);
  };

  // --- 1. LÓGICA DE LA TRANSACCIÓN CORREGIDA ---
  const handleRegisterSale = async (event) => {
    event.preventDefault();
    const validItems = items.filter(item => item.skuId && item.quantity > 0);
    if (validItems.length === 0) {
      alert("Por favor, añade al menos un SKU válido a la venta.");
      return;
    }

    const saleData = {
      customerName,
      items: validItems.map(item => ({
        skuId: item.skuId,
        fullName: item.fullName,
        quantity: item.quantity,
        salePrice: item.salePrice,
      })),
      totalSale: validItems.reduce((total, item) => total + (item.salePrice * item.quantity), 0),
      status: 'completed',
      createdAt: serverTimestamp(),
      createdBy: currentUserId,
    };

    try {
      // La transacción ahora sigue el orden correcto: leer todo, luego escribir todo.
      await runTransaction(db, async (transaction) => {
        const skuUpdates = [];

        // --- FASE DE LECTURA ---
        // Primero, leemos todos los documentos de SKU y validamos el stock.
        for (const item of validItems) {
          const skuRef = doc(db, 'skus', item.skuId);
          const skuDoc = await transaction.get(skuRef);
          
          if (!skuDoc.exists()) { throw new Error(`El SKU ${item.fullName} no existe.`); }
          
          const currentStock = skuDoc.data().stock;
          if (currentStock < item.quantity) {
            throw new Error(`Stock insuficiente para ${item.fullName}. Disponible: ${currentStock}`);
          }
          
          const newStock = currentStock - item.quantity;
          // Guardamos las actualizaciones necesarias para la fase de escritura.
          skuUpdates.push({ ref: skuRef, newStock: newStock });
        }

        // --- FASE DE ESCRITURA ---
        // Ahora que todas las lecturas están completas, realizamos las escrituras.

        // 1. Crear el documento de la venta.
        const saleRef = doc(collection(db, 'sales'));
        transaction.set(saleRef, saleData);

        // 2. Actualizar el stock de cada SKU.
        for (const update of skuUpdates) {
          transaction.update(update.ref, { stock: update.newStock });
        }
      });

      alert('¡Venta registrada y stock actualizado con éxito!');
      close();
      setCustomerName('');
      setItems([{ skuId: '', fullName: '', quantity: 1, salePrice: 0, stock: 0 }]);

    } catch (e) {
      console.error("Error al registrar la venta: ", e);
      alert(`Hubo un error: ${e.message || e}`);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <Title order={1} mb="lg">Gestión de Ventas</Title>

      <Modal opened={opened} onClose={close} title="Registrar Nueva Venta" size="lg">
        <form onSubmit={handleRegisterSale}>
          <TextInput label="Nombre del Cliente" placeholder="Ej: Cliente Final" value={customerName} onChange={(e) => setCustomerName(e.currentTarget.value)} required />
          <Divider my="lg" label="Productos de la Venta" labelPosition="center" />
          
          {items.map((item, index) => (
            <Paper key={index} p="sm" withBorder mb="sm">
              <Group position="apart">
                <Text fw={500}>Producto #{index + 1}</Text>
                {items.length > 1 && (<ActionIcon color="red" onClick={() => handleRemoveItem(index)}><Trash2 size={16} /></ActionIcon>)}
              </Group>
              <Autocomplete
                label="Buscar SKU"
                placeholder="Busca una variación específica..."
                data={skuCatalog.map(s => s.value)}
                value={item.fullName}
                onChange={(value) => handleItemChange(index, 'fullName', value)}
                onItemSubmit={(selected) => handleItemChange(index, 'fullName', selected.value)}
                required
              />
              <Group grow mt="xs">
                <NumberInput label="Cantidad" value={item.quantity} onChange={(value) => handleItemChange(index, 'quantity', value)} max={item.stock} min={1} required />
                <NumberInput label="Precio de Venta (S/.)" value={item.salePrice} onChange={(value) => handleItemChange(index, 'salePrice', value)} precision={2} required />
              </Group>
              <Group position="apart" mt={4}>
                <Text size="xs" c="dimmed">Stock disponible: {item.stock}</Text>
                <Text size="xs" c="blue">Subtotal: S/ {(item.quantity * item.salePrice).toFixed(2)}</Text>
              </Group>
            </Paper>
          ))}
          
          <Button leftIcon={<Plus size={16} />} variant="light" onClick={handleAddItem} mt="md">Añadir Producto</Button>
          
          <Paper p="md" mt="md" withBorder>
            <Group position="apart">
              <Text fw={600}>Total de la Venta:</Text>
              <Text fw={600} size="lg" c="green">
                S/ {items.reduce((total, item) => total + (item.salePrice * item.quantity), 0).toFixed(2)}
              </Text>
            </Group>
          </Paper>

          <Group position="right" mt="xl">
            <Button type="submit">Guardar Venta y Actualizar Stock</Button>
          </Group>
        </form>
      </Modal>

      <Button onClick={open}>Registrar Nueva Venta</Button>

      <Paper withBorder shadow="md" p="md" mt="xl">
        <Title order={3} mb="md">Historial de Ventas</Title>
        {(salesLoading || skusLoading) && <Loader />}
        {salesError && <Text color="red">Error: {salesError.message}</Text>}
        {!(salesLoading || skusLoading) && !salesError && (
          <Table striped highlightOnHover>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Monto Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {sales.map(sale => (
                <tr key={sale.id}>
                  <td>{sale.customerName}</td>
                  <td>S/ {sale.totalSale?.toFixed(2) || '0.00'}</td>
                  <td><Badge color="green">{sale.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {!salesLoading && sales.length === 0 && <Text mt="md">Aún no se han registrado ventas.</Text>}
      </Paper>
    </div>
  );
};

export default SalesManagement;
