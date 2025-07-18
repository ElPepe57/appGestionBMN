import React, { useState } from 'react';
import { db } from '../../firebase-config';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '../../shared/hooks/useFirestore';
import { useDisclosure } from '@mantine/hooks';
import { OpportunityDetail } from './OpportunityDetail';
import {
    Title, Paper, Stack, Table, Badge, Loader, Center, Group, Text, ActionIcon, Tooltip
} from '@mantine/core';
import { IconInbox, IconEye } from '@tabler/icons-react';

const OpportunityManagement = () => {
    const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
    const [selectedOpp, setSelectedOpp] = useState(null);
    const { data: opportunities, loading } = useFirestore('opportunities');

    const handleViewOpportunity = (opp) => {
        setSelectedOpp(opp);
        openDrawer();
    };

    const handleSaveChanges = async (updatedOpportunity) => {
        if (!updatedOpportunity) return;
        try {
            const oppRef = doc(db, 'opportunities', updatedOpportunity.id);
            
            // Verificamos si todos los items están decididos para completar la oportunidad
            const allItemsDecided = updatedOpportunity.items.every(item => 
                item.approval.status === 'approved' || item.approval.status === 'rejected'
            );
            const newStatus = allItemsDecided ? 'completed' : 'analysis_in_progress';

            // Actualizamos la oportunidad con los nuevos datos de análisis y una marca de tiempo
            await updateDoc(oppRef, {
                items: updatedOpportunity.items,
                status: newStatus,
                lastUpdatedAt: serverTimestamp()
            });

            closeDrawer();
        } catch (error) {
            console.error("Error al guardar el análisis:", error);
        }
    };

    const statusBadgeConfig = {
        analysis_pending: { color: 'gray', label: 'Análisis Pendiente' },
        analysis_in_progress: { color: 'blue', label: 'En Análisis' },
        completed: { color: 'green', label: 'Completado' },
    };

    return (
        <>
            {/* El detalle ahora se renderiza solo cuando hay una oportunidad seleccionada */}
            {selectedOpp && (
                 <OpportunityDetail
                    opportunity={selectedOpp}
                    opened={drawerOpened}
                    onClose={closeDrawer}
                    onSave={handleSaveChanges}
                />
            )}

            <Stack>
                <Group justify="space-between">
                    <Title order={2}>Análisis de Oportunidades</Title>
                </Group>

                <Paper withBorder shadow="sm" radius="md" p="md">
                    {loading && <Center p="xl"><Loader /></Center>}
                    {!loading && opportunities.length === 0 && <Center p="xl"><Group><IconInbox /><Text>No hay oportunidades para analizar.</Text></Group></Center>}
                    {!loading && opportunities.length > 0 && (
                        <Table verticalSpacing="sm" striped highlightOnHover>
                            <Table.Thead>
                                <Table.Tr><Table.Th>Oportunidad</Table.Th><Table.Th>Solicitante</Table.Th><Table.Th># Productos</Table.Th><Table.Th>Estado</Table.Th><Table.Th style={{ textAlign: 'right' }}>Acciones</Table.Th></Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {opportunities.map(opp => (
                                    <Table.Tr key={opp.id} onClick={() => handleViewOpportunity(opp)} style={{cursor: 'pointer'}}>
                                        <Table.Td><Text fw={500}>{opp.name}</Text><Text size="xs" c="dimmed">Creada: {opp.createdAt?.toDate().toLocaleDateString()}</Text></Table.Td>
                                        <Table.Td>{opp.contact?.name || opp.source || 'N/A'}</Table.Td>
                                        <Table.Td>{opp.items?.length || 0}</Table.Td>
                                        <Table.Td><Badge color={statusBadgeConfig[opp.status]?.color || 'gray'} variant="light">{statusBadgeConfig[opp.status]?.label || opp.status}</Badge></Table.Td>
                                        <Table.Td>
                                            <Group gap="xs" justify="flex-end">
                                                <Tooltip label="Ver y Analizar Detalle"><ActionIcon variant="subtle"><IconEye size={16} /></ActionIcon></Tooltip>
                                            </Group>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    )}
                </Paper>
            </Stack>
        </>
    );
};

export default OpportunityManagement;
