import React, { useState, useEffect } from 'react';
import { db } from '../../firebase-config';
import { collection, addDoc } from 'firebase/firestore';
import { useFirestore } from '../../shared/hooks/useFirestore';
import { Drawer, Title, Stack, Button, Group, ScrollArea } from '@mantine/core';
import { ProductAnalysisCard } from './ProductAnalysisCard';
import { ContactModal } from './ContactModal';

export const OpportunityDetail = ({ opportunity, opened, onClose, onSave }) => {
    const [updatedOpportunity, setUpdatedOpportunity] = useState(null);
    const [isModalOpened, setModalOpened] = useState(false);
    const [contactTypeToCreate, setContactTypeToCreate] = useState('supplier');
    const [initialContactName, setInitialContactName] = useState('');

    // Obtenemos las bases de datos completas de proveedores y competidores
    const { data: suppliersDB } = useFirestore('suppliers');
    const { data: competitorsDB } = useFirestore('competitors');

    useEffect(() => {
        // Clonamos la oportunidad en un estado local para poder editarla sin afectar la lista principal
        setUpdatedOpportunity(opportunity ? { ...opportunity } : null);
    }, [opportunity]);

    // Función para actualizar un item específico en el estado local
    const handleItemUpdate = (itemIndex, updatedItem) => {
        if (!updatedOpportunity) return;
        const newItems = updatedOpportunity.items.map((item, index) =>
            index === itemIndex ? updatedItem : item
        );
        setUpdatedOpportunity({ ...updatedOpportunity, items: newItems });
    };

    // Función para abrir el modal de creación de contactos
    const handleOpenContactModal = (type, initialName) => {
        setContactTypeToCreate(type);
        setInitialContactName(initialName);
        setModalOpened(true);
    };

    // Función que realmente guarda el nuevo contacto en Firestore
    const handleCreateContact = async (data, type) => {
        const collectionName = type === 'supplier' ? 'suppliers' : 'competitors';
        try {
            await addDoc(collection(db, collectionName), data);
            // El hook useFirestore se encargará de actualizar la lista de proveedores/competidores automáticamente
        } catch (error) {
            console.error(`Error al crear ${type}:`, error);
        }
    };

    // Si no hay oportunidad, no renderizamos nada para evitar errores
    if (!updatedOpportunity) return null;

    return (
        <>
            <ContactModal
                opened={isModalOpened}
                onClose={() => setModalOpened(false)}
                contactType={contactTypeToCreate}
                onSave={handleCreateContact}
                initialName={initialContactName}
                zIndex={1001} // Asegura que el Modal aparezca sobre el Drawer
            />

            <Drawer
                opened={opened}
                onClose={onClose}
                position="right"
                size="80%"
                title={<Title order={3}>Análisis de Oportunidad: {updatedOpportunity.name}</Title>}
            >
                <Stack style={{ height: '100%' }}>
                    <ScrollArea style={{ flex: 1 }}>
                        <Stack p="md">
                            {updatedOpportunity.items.map((item, index) => (
                                <ProductAnalysisCard
                                    key={index}
                                    item={item}
                                    onItemUpdate={(updatedItem) => handleItemUpdate(index, updatedItem)}
                                    suppliersDB={suppliersDB}
                                    competitorsDB={competitorsDB}
                                    onContactCreate={handleOpenContactModal}
                                />
                            ))}
                        </Stack>
                    </ScrollArea>
                    <Group justify="flex-end" p="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
                        <Button variant="default" onClick={onClose}>Cancelar</Button>
                        <Button onClick={() => onSave(updatedOpportunity)}>Guardar Cambios del Análisis</Button>
                    </Group>
                </Stack>
            </Drawer>
        </>
    );
};
