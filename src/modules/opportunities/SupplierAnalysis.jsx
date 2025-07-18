import React, { useState } from 'react';
import { Paper, Stack, Group, Text, Autocomplete, ActionIcon, Tooltip, NumberInput, Button, TextInput } from '@mantine/core';
import { IconPlus, IconTrash, IconSelect } from '@tabler/icons-react';

// Este componente representa la tarjeta de un solo proveedor en la lista de análisis.
const SupplierCard = ({ data, index, onUpdate, onSelect, onRemove }) => (
    <Paper withBorder p="xs" radius="sm">
        <Stack>
            <Group justify="space-between">
                <Text fw={500}>{data.name}</Text>
                <Group gap="xs">
                    <Tooltip label="Seleccionar como proveedor principal">
                        <Button
                            size="xs"
                            variant={data.isSelected ? "filled" : "outline"}
                            onClick={() => onSelect(index)}
                            leftSection={<IconSelect size={14} />}
                        >
                            {data.isSelected ? 'Seleccionado' : 'Seleccionar'}
                        </Button>
                    </Tooltip>
                    <Tooltip label="Eliminar Proveedor">
                        <ActionIcon color="red" variant="subtle" onClick={() => onRemove(index)}>
                            <IconTrash size={16} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Group>
            <Group grow>
                <TextInput label="URL del Producto" value={data.productURL} onChange={(e) => onUpdate(index, 'productURL', e.currentTarget.value)} />
                <NumberInput label="Precio" value={data.price} onChange={(val) => onUpdate(index, 'price', val)} precision={2} />
            </Group>
            <Group grow>
                <TextInput label="Tiempo de Entrega" placeholder="Ej: 15-20 días" value={data.deliveryTime} onChange={(e) => onUpdate(index, 'deliveryTime', e.currentTarget.value)} />
                <NumberInput label="Costo de Envío" value={data.shippingCost} onChange={(val) => onUpdate(index, 'shippingCost', val)} precision={2} />
            </Group>
        </Stack>
    </Paper>
);

// Este es el componente principal que gestiona la lista de proveedores.
export const SupplierAnalysis = ({ analysisData = [], onUpdate, suppliersDB = [], onContactCreate }) => {
    const [searchValue, setSearchValue] = useState('');

    const handleAddSupplier = (supplierId) => {
        const supplier = suppliersDB.find(s => s.id === supplierId);
        // Evita duplicados
        if (!supplier || analysisData.some(s => s.supplierId === supplierId)) {
            setSearchValue('');
            return;
        }

        const newSupplier = {
            supplierId: supplier.id, name: supplier.name, productURL: '',
            price: 0, shippingCost: 0, deliveryTime: '', isSelected: false
        };
        onUpdate([...analysisData, newSupplier]);
        setSearchValue('');
    };
    
    const handleUpdateSupplier = (index, field, value) => {
        const updatedData = analysisData.map((d, i) => i === index ? { ...d, [field]: value } : d);
        onUpdate(updatedData);
    };

    const handleSelectSupplier = (indexToSelect) => {
        const updatedData = analysisData.map((d, i) => ({ ...d, isSelected: i === indexToSelect }));
        onUpdate(updatedData);
    };
    
    const handleRemoveSupplier = (indexToRemove) => {
        onUpdate(analysisData.filter((_, i) => i !== indexToRemove));
    };

    return (
        <Stack>
            {analysisData.map((data, index) => (
                <SupplierCard
                    key={index}
                    data={data}
                    index={index}
                    onUpdate={handleUpdateSupplier}
                    onSelect={handleSelectSupplier}
                    onRemove={handleRemoveSupplier}
                />
            ))}
            <Group grow align="flex-end">
                <Autocomplete
                    label="Añadir Proveedor Existente"
                    placeholder="Busca por nombre..."
                    data={suppliersDB.map(s => ({ value: s.id, label: s.name }))}
                    value={searchValue}
                    onChange={setSearchValue}
                    onOptionSubmit={handleAddSupplier}
                    limit={5}
                />
                <Button onClick={() => onContactCreate('supplier', searchValue)} variant="light" leftSection={<IconPlus size={14} />}>
                    Crear Proveedor
                </Button>
            </Group>
        </Stack>
    );
};
