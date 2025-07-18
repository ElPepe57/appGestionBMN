import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase-config';
import {
    Paper,
    Text,
    Title,
    Group,
    SimpleGrid,
    Stack,
    Button,
    Loader,
    Center,
    ThemeIcon,
    Box
} from '@mantine/core';
import { Package, Plane, Warehouse, ArrowRightLeft, Plus } from 'lucide-react';

// --- SUB-COMPONENTE DE UI (Adaptado a Mantine) ---
const StockLocationCard = ({ icon: Icon, title, quantity, color }) => {
  return (
    <Paper withBorder p="md" radius="md">
      <Group>
        <ThemeIcon color={color} variant="light" size={38} radius="md">
          <Icon size={20} />
        </ThemeIcon>
        <Stack gap={0}>
          <Text c="dimmed" size="sm">{title}</Text>
          <Text fw={700} size="xl">{quantity.toLocaleString()}</Text>
        </Stack>
      </Group>
    </Paper>
  );
};

// --- COMPONENTE PRINCIPAL (100% Mantine) ---
export default function WmsDashboard({ productId, onBack }) {
  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const productRef = doc(db, 'products', productId);

    const unsubscribe = onSnapshot(productRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const stock = data.stock || { en_almacen_us: 0, en_transito_peru: 0, la_victoria: 0, smp: 0 };
        const totalStock = Object.values(stock).reduce((sum, val) => sum + val, 0);
        const availableForSale = (stock.la_victoria || 0) + (stock.smp || 0);

        setProductData({
          id: docSnap.id,
          ...data,
          stock,
          totalStock,
          availableForSale,
        });
      } else {
        console.error("No se encontró el producto!");
        setProductData(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error al obtener el producto:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [productId]);

  if (loading) {
    return (
      <Center style={{ height: '400px' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!productData) {
    return (
      <Center style={{ height: '400px' }}>
        <Stack align="center">
          <Title order={3}>Producto no encontrado</Title>
          <Text c="dimmed">Por favor, selecciona un producto de la lista para ver su inventario.</Text>
          <Button onClick={onBack} mt="md">
            Volver a Productos
          </Button>
        </Stack>
      </Center>
    );
  }

  return (
    <Box>
      <Button onClick={onBack} variant="subtle" size="sm" mb="md" px={0}>
        &larr; Volver a la lista de productos
      </Button>
      
      <Stack gap="xl">
        {/* Encabezado del Producto */}
        <Box>
          <Title order={1}>{productData.nombre}</Title>
          <Text c="dimmed" size="sm" ff="monospace">SKU: {productData.sku}</Text>
        </Box>

        {/* Totales Principales */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
          <Paper withBorder p="xl" radius="md" style={{ textAlign: 'center' }}>
            <Text size="lg" c="dimmed">Stock Total</Text>
            <Text fz={50} fw={700}>{productData.totalStock.toLocaleString()}</Text>
          </Paper>
          <Paper withBorder p="xl" radius="md" style={{ textAlign: 'center' }} bg="green.8" c="white">
            <Text size="lg" c="green.1">Disponible para Venta</Text>
            <Text fz={50} fw={700}>{productData.availableForSale.toLocaleString()}</Text>
          </Paper>
        </SimpleGrid>

        {/* Desglose de Inventario */}
        <Paper withBorder p="xl" radius="md">
          <Title order={3} mb="lg">Desglose del Inventario</Title>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <StockLocationCard icon={Package} title="En Almacén US" quantity={productData.stock.en_almacen_us || 0} color="blue" />
            <StockLocationCard icon={Plane} title="En Tránsito a Perú" quantity={productData.stock.en_transito_peru || 0} color="yellow" />
            <StockLocationCard icon={Warehouse} title="Almacén La Victoria" quantity={productData.stock.la_victoria || 0} color="green" />
            <StockLocationCard icon={Warehouse} title="Almacén SMP" quantity={productData.stock.smp || 0} color="green" />
          </SimpleGrid>
        </Paper>

        {/* Acciones Rápidas */}
        <Paper withBorder p="lg" radius="md">
            <Group position="apart">
                <Title order={4}>Acciones Rápidas</Title>
                <Group>
                    <Button variant="default" leftIcon={<Plus size={16} />}>
                        Registrar Recepción
                    </Button>
                    <Button leftIcon={<ArrowRightLeft size={16} />}>
                        Transferir
                    </Button>
                </Group>
            </Group>
        </Paper>
      </Stack>
    </Box>
  );
}