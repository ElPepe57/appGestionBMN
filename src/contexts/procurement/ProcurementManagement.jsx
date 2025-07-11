import React, { useState, useMemo } from 'react';
import { 
  Title, 
  Button,
  Modal,
  Autocomplete,
  NumberInput,
  Select,
  Group,
  Text,
  Table,
  Badge,
  Loader,
  Paper,
  ActionIcon,
  Divider // 1. AÑADIR EL COMPONENTE QUE FALTABA
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { collection, addDoc, serverTimestamp, doc, runTransaction, updateDoc, where } from 'firebase/firestore';
import { db } from '../../firebase-config';
import { useFirestore } from '../../shared/hooks/useFirestore';
import { XCircle } from 'lucide-react';

const ProcurementManagement = () => {
  const [opened, { open, close }] = useDisclosure(false);
  
  const { data: skus } = useFirestore('skus');
  const { data: purchaseOrders, loading, error } = useFirestore('purchase_orders');
  const { data: purchaseCandidates } = useFirestore('opportunities', [
      where('status', '==', 'approved_for_catalog')
  ]);

  const skuCatalog = useMemo(() => skus.map(s => ({ value: s.fullName, id: s.id })), [skus]);
  const currentUserId = 'user_test_01';

  const handlePreparePurchaseFromOpp = (opp) => {
    alert(`Preparando orden de compra para: ${opp.productName}`);
    open();
  };

  const handleCreatePurchaseOrder = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const selectedSkuName = formData.get('skuFullName');
    const selectedSku = skus.find(s => s.fullName === selectedSkuName);

    if (!selectedSku) {
        alert("Por favor, selecciona un SKU válido del catálogo.");
        return;
    }

    const purchaseOrderData = {
        skuId: selectedSku.id,
        skuFullName: selectedSku.fullName,
        quantity: Number(formData.get('quantity')),
        costPerItem: Number(formData.get('costPerItem')),
        totalCost: Number(formData.get('quantity')) * Number(formData.get('costPerItem')),
        supplier: formData.get('supplier'),
        status: 'ordered',
        createdAt: serverTimestamp(),
        createdBy: currentUserId,
    };

    try {
        await addDoc(collection(db, 'purchase_orders'), purchaseOrderData);
        alert('¡Orden de compra creada con éxito!');
        form.reset();
        close();
    } catch (e) {
        console.error("Error:", e);
        alert("Hubo un error al crear la orden de compra.");
    }
  };

  const handleReceiveOrder = async (po) => {
    if (!po.skuId) {
        alert("Error: Esta orden de compra no tiene un SKU asociado.");
        return;
    }
    const purchaseOrderRef = doc(db, 'purchase_orders', po.id);
    const skuRef = doc(db, 'skus', po.skuId);

    try {
        await runTransaction(db, async (transaction) => {
            const skuDoc = await transaction.get(skuRef);
            if (!skuDoc.exists()) { throw "¡El SKU ya no existe!"; }
            const newStock = (skuDoc.data().stock || 0) + po.quantity;
            transaction.update(skuRef, { stock: newStock });
            transaction.update(purchaseOrderRef, { status: 'received' });
        });
        alert(`Stock del SKU "${po.skuFullName}" actualizado.`);
    } catch (e) {
        console.error("Error:", e);
        alert("Hubo un error al procesar la recepción.");
    }
  };

  const handleCancelOrder = async (poId) => {
    if (window.confirm("¿Estás seguro de que quieres cancelar esta orden de compra?")) {
      const orderRef = doc(db, 'purchase_orders', poId);
      try {
        await updateDoc(orderRef, { status: 'cancelled' });
        alert('Orden de compra cancelada.');
      } catch (e) { console.error("Error:", e); alert("Error al cancelar."); }
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <Title order={1} mb="lg">Gestión de Compras</Title>

      <Paper withBorder shadow="md" p="md" mt="xl" mb="xl">
        <Title order={3} mb="md">Órdenes de Compra Sugeridas (Desde Oportunidades)</Title>
        {purchaseCandidates && (
          <Table>
            <thead>
              <tr>
                <th>Producto Aprobado</th>
                <th>Costo Objetivo</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {purchaseCandidates.map(opp => (
                <tr key={opp.id}>
                  <td>{opp.productName}</td>
                  <td>S/ {opp.targetPurchasePrice?.toFixed(2) || '0.00'}</td>
                  <td>
                    <Button size="xs" onClick={() => handlePreparePurchaseFromOpp(opp)}>
                      Crear Orden de Compra
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {purchaseCandidates?.length === 0 && <Text mt="md">No hay compras sugeridas pendientes.</Text>}
      </Paper>

      <Divider my="xl" />

      <Button onClick={open}>Crear Orden de Compra Manualmente</Button>

      <Modal opened={opened} onClose={close} title="Crear Orden de Compra">
        <form onSubmit={handleCreatePurchaseOrder}>
            <Autocomplete name="skuFullName" label="SKU a Comprar" placeholder="Busca una variación específica..." data={skuCatalog.map(s => s.value)} required />
            <Group grow mt="md">
                <NumberInput name="quantity" label="Cantidad" placeholder="0" required />
                <NumberInput name="costPerItem" label="Costo por Unidad (S/.)" placeholder="0.00" precision={2} required />
            </Group>
            <Select name="supplier" label="Proveedor" placeholder="Selecciona un proveedor" data={[{ value: 'supplier_a', label: 'Proveedor A' }]} mt="md" required />
            <Button type="submit" fullWidth mt="xl">Guardar Orden de Compra</Button>
        </form>
      </Modal>

      <Paper withBorder shadow="md" p="md" mt="xl">
        <Title order={3} mb="md">Historial de Órdenes de Compra</Title>
        {loading && <Loader />}
        {error && <Text color="red">Error: {error.message}</Text>}
        {!loading && !error && (
            <Table striped highlightOnHover>
                <thead>
                    <tr>
                        <th>SKU</th>
                        <th>Cantidad</th>
                        <th>Costo Total</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {purchaseOrders.map(po => (
                        <tr key={po.id}>
                            <td>{po.skuFullName}</td>
                            <td>{po.quantity}</td>
                            <td>S/ {po.totalCost.toFixed(2)}</td>
                            <td><Badge color={po.status === 'received' ? 'green' : (po.status === 'cancelled' ? 'red' : 'blue')}>{po.status}</Badge></td>
                            <td>
                              <Group spacing="xs">
                                <Button size="xs" disabled={po.status !== 'ordered'} onClick={() => handleReceiveOrder(po)}>Recibido</Button>
                                <ActionIcon color="red" onClick={() => handleCancelOrder(po.id)} disabled={po.status !== 'ordered'}><XCircle size={16} /></ActionIcon>
                              </Group>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        )}
        {!loading && purchaseOrders.length === 0 && <Text mt="md">No hay órdenes de compra.</Text>}
      </Paper>
    </div>
  );
};

export default ProcurementManagement;
