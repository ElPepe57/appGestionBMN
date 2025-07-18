import React from 'react';
import { TextInput, Textarea, Stack } from '@mantine/core';

// Componente especializado en capturar datos de un nuevo cliente potencial.
export const NewPotentialCustomerForm = ({ customerData, onDataChange }) => {
    return (
        <Stack mt="md" p="md" bg="gray.0" style={{ borderRadius: 'var(--mantine-radius-md)' }}>
            <TextInput
                label="Nombre del Nuevo Cliente"
                placeholder="Ej: Constructora XYZ S.A.C."
                value={customerData.name || ''}
                onChange={(e) => onDataChange({ ...customerData, name: e.currentTarget.value })}
                required
                withAsterisk
            />
            <TextInput
                label="Teléfono de Contacto"
                placeholder="Ej: 999 888 777"
                value={customerData.phone || ''}
                onChange={(e) => onDataChange({ ...customerData, phone: e.currentTarget.value })}
                required
                withAsterisk
            />
            <TextInput
                label="Correo Electrónico (Opcional)"
                placeholder="Ej: contacto@constructora.xyz"
                value={customerData.email || ''}
                onChange={(e) => onDataChange({ ...customerData, email: e.currentTarget.value })}
            />
            <Textarea
                label="Dirección (Opcional)"
                placeholder="Ej: Av. Principal 123, Oficina 404"
                value={customerData.address || ''}
                onChange={(e) => onDataChange({ ...customerData, address: e.currentTarget.value })}
                autosize
                minRows={2}
            />
        </Stack>
    );
};