import React, { useState, useEffect, Fragment } from 'react';
import { db, auth } from '../../firebase-config';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { useFirestore } from '../../shared/hooks/useFirestore';
import { useDisclosure } from '@mantine/hooks';
import { NewPotentialCustomerForm } from './NewPotentialCustomerForm';
import {
    TextInput, Textarea, Select, Button, Group, Title, Paper, Stack, Notification, Fieldset,
    ActionIcon, rem, Text, Drawer, Table, Badge, Tooltip, Loader, Center, Collapse, Box, ThemeIcon, Autocomplete
} from '@mantine/core';
import {
    IconCheck, IconPlus, IconTrash, IconPencil, IconInbox, IconChevronDown,
    IconUserCircle, IconUser, IconBuilding, IconHistory, IconRocket
} from '@tabler/icons-react';

// --- Simulación de Usuario Logueado ---
const currentUser = { name: auth.currentUser?.displayName || "Usuario de Prueba", uid: auth.currentUser?.uid || "test_user_id" };

// --- Componente 1: El Formulario (Completo y Funcional) ---
const RequirementForm = ({ initialData, onSave, onCancel }) => {
    const [source, setSource] = useState('');
    const [contactType, setContactType] = useState('potencial');
    const [selectedContactId, setSelectedContactId] = useState('');
    const [newPotentialCustomer, setNewPotentialCustomer] = useState({});
    const [generalNotes, setGeneralNotes] = useState('');
    const [items, setItems] = useState([{ product: '', brand: '', presentation: '', dosage: '', quantityByPresentation: '' }]);
    const isEditing = !!initialData;
    
    const { data: employees, loading: loadingEmployees } = useFirestore('employees');
    const { data: customers, loading: loadingCustomers } = useFirestore('customers');

    useEffect(() => {
        if (isEditing && initialData) {
            setSource(initialData.source || '');
            setGeneralNotes(initialData.notes || '');
            setItems(initialData.items?.map(item => ({ ...item })) || []);
            if (initialData.contact) {
                const contactId = initialData.contact.id || '';
                setSelectedContactId(contactId);
                if (initialData.source === 'Cliente') {
                    const customer = customers.find(c => c.id === contactId);
                    setContactType(customer?.type || 'existente');
                }
            }
        } else {
            setSource(''); setContactType('potencial'); setSelectedContactId('');
            setNewPotentialCustomer({}); setGeneralNotes('');
            setItems([{ product: '', brand: '', presentation: '', dosage: '', quantityByPresentation: '' }]);
        }
    }, [initialData, isEditing, customers]);

    const handleSubmit = (event) => {
        event.preventDefault();
        const requirementData = { source, notes: generalNotes, items: items.map(item => ({ ...item, status: item.status || 'pending_analysis' })) };
        onSave(requirementData, { contactType, selectedContactId, newPotentialCustomer });
    };
    
    const handleItemChange = (index, field, value) => {
        const newItems = [...items]; newItems[index][field] = value; setItems(newItems);
    };
    const addRequirementItem = () => {
        setItems([...items, { product: '', brand: '', presentation: '', dosage: '', quantityByPresentation: '', status: 'pending_analysis' }]);
    };
    const removeRequirementItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };

    return (
        <form onSubmit={handleSubmit} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Stack p="md" gap="xl" style={{ flex: 1, overflowY: 'auto' }}>
                <Title order={3}>{isEditing ? 'Editar Requerimiento' : 'Registrar Nuevo Requerimiento'}</Title>
                <Fieldset legend="Información del Solicitante">
                    <Stack>
                        <Select label="Origen del Requerimiento" placeholder="Selecciona..." value={source} onChange={setSource} data={['Cliente', 'Vendedor', 'Gerencia', 'Interno']} required withAsterisk/>
                        {source === 'Cliente' && (<Select label="Tipo de Cliente" value={contactType} onChange={setContactType} data={[{value: 'potencial', label: 'Cliente Potencial (Nuevo)'}, {value: 'existente', label: 'Cliente Existente'}]} />)}
                        {source === 'Cliente' && contactType === 'existente' && (<Autocomplete label="Cliente Existente" placeholder="Busca por nombre..." data={customers.map(c => ({value: c.id, label: c.name}))} value={selectedContactId} onChange={setSelectedContactId} limit={5} leftSection={loadingCustomers ? <Loader size="xs" /> : null} />)}
                        {source === 'Cliente' && contactType === 'potencial' && (<NewPotentialCustomerForm customerData={newPotentialCustomer} onDataChange={setNewPotentialCustomer} />)}
                        {['Vendedor', 'Gerencia', 'Interno'].includes(source) && (<Autocomplete label="Colaborador" placeholder="Busca por nombre..." data={employees.map(e => ({value: e.id, label: e.name}))} value={selectedContactId} onChange={setSelectedContactId} limit={5} leftSection={loadingEmployees ? <Loader size="xs" /> : null}/>)}
                    </Stack>
                </Fieldset>
                <Fieldset legend="Productos Solicitados">
                    <Stack>
                        {items.map((item, index) => (<RequirementItem key={index} item={item} index={index} onUpdate={handleItemChange} onRemove={() => removeRequirementItem(index)} />))}
                        <Button onClick={addRequirementItem} variant="light" leftSection={<IconPlus size={14} />}>Añadir Otro Producto</Button>
                    </Stack>
                </Fieldset>
                <Textarea label="Notas Generales Adicionales" value={generalNotes} onChange={(e) => setGeneralNotes(e.currentTarget.value)} autosize minRows={2} />
            </Stack>
            <Group p="md" justify="flex-end" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
                <Button variant="default" onClick={onCancel}>Cancelar</Button>
                <Button type="submit">{isEditing ? 'Guardar Cambios' : 'Crear Requerimiento'}</Button>
            </Group>
        </form>
    );
};

// --- Componente 2: El Item de Producto ---
const RequirementItem = ({ item, index, onUpdate, onRemove }) => (
    <Paper withBorder p="md" radius="sm">
        <Stack>
            <Group justify="space-between">
                <Text fw={500}>Producto #{index + 1}</Text>
                {index > 0 && <Tooltip label="Eliminar Producto"><ActionIcon color="red" onClick={onRemove} variant="subtle"><IconTrash style={{ width: rem(16), height: rem(16) }} /></ActionIcon></Tooltip>}
            </Group>
            <TextInput label="Nombre del Producto" value={item.product} onChange={(e) => onUpdate(index, 'product', e.currentTarget.value)} required withAsterisk />
            <TextInput label="Marca" placeholder="Ej: Now, Solgar" value={item.brand} onChange={(e) => onUpdate(index, 'brand', e.currentTarget.value)} />
            <Group grow><TextInput label="Presentación" placeholder="Ej: Frasco x 100 tabletas" value={item.presentation} onChange={(e) => onUpdate(index, 'presentation', e.currentTarget.value)} /><TextInput label="Dosaje" placeholder="Ej: 1000mg" value={item.dosage} onChange={(e) => onUpdate(index, 'dosage', e.currentTarget.value)} /></Group>
            <TextInput label="Cantidad por Presentación" placeholder="Ej: 500 (frascos)" value={item.quantityByPresentation} onChange={(e) => onUpdate(index, 'quantityByPresentation', e.currentTarget.value)} />
        </Stack>
    </Paper>
);

// --- Componente 3: El Taller de Análisis Desplegable (que pasará a Oportunidades) ---
// Por ahora lo dejamos como una visualización simple
const RequirementDetail = ({ requirement }) => {
    return (
        <Box p="md" bg="gray.0">
            <Title order={5} mb="sm">Productos Solicitados</Title>
            <Stack>
                {requirement.items.map((item, index) => (
                    <Paper withBorder p="sm" radius="sm" key={index}>
                         <Text fw={500}>{item.product}</Text>
                         <Text size="sm" c="dimmed">{`Marca: ${item.brand || 'N/A'}, Cantidad: ${item.quantityByPresentation || 'N/A'}`}</Text>
                    </Paper>
                ))}
            </Stack>
        </Box>
    );
};

// --- Componente 4: El Componente Principal "Maestro" ---
const RequirementsManagement = () => {
    const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
    const [expandedReqId, setExpandedReqId] = useState(null);
    const [selectedReq, setSelectedReq] = useState(null);
    const [showSuccess, setShowSuccess] = useState({ show: false, message: '' });
    const { data: requirements, loading } = useFirestore('requirements');
    const { data: customers } = useFirestore('customers');
    const { data: employees } = useFirestore('employees');

    const handleOpenDrawer = (req = null) => { setSelectedReq(req); openDrawer(); };
    const handleCloseDrawer = () => { setSelectedReq(null); closeDrawer(); };

    const handleSaveRequirement = async (reqData, contactData) => {
        try {
            await runTransaction(db, async (transaction) => {
                let contactInfoForReq = {};
                if (reqData.source === 'Cliente') {
                    if (contactData.contactType === 'potencial' && contactData.newPotentialCustomer.name) {
                        const contactRef = doc(collection(db, 'customers'));
                        const newCustomerData = { ...contactData.newPotentialCustomer, type: 'potencial', createdAt: serverTimestamp() };
                        transaction.set(contactRef, newCustomerData);
                        contactInfoForReq = { id: contactRef.id, name: newCustomerData.name };
                    } else if (contactData.selectedContactId) {
                        const customer = customers.find(c => c.id === contactData.selectedContactId);
                        contactInfoForReq = { id: customer?.id || '', name: customer?.name || 'Cliente no encontrado' };
                    }
                } else {
                    const employee = employees.find(e => e.id === contactData.selectedContactId);
                    contactInfoForReq = { id: employee?.id || '', name: employee?.name || contactData.selectedContactId };
                }
                
                if (selectedReq) {
                    const reqDoc = doc(db, 'requirements', selectedReq.id);
                    transaction.update(reqDoc, { ...reqData, contact: contactInfoForReq, updatedAt: serverTimestamp() });
                } else {
                    const finalReqData = { ...reqData, contact: contactInfoForReq, createdBy: currentUser.name, creatorUid: currentUser.uid, status: 'pending_analysis', createdAt: serverTimestamp() };
                    const newReqRef = doc(collection(db, 'requirements'));
                    transaction.set(newReqRef, finalReqData);
                }
            });
            setShowSuccess({ show: true, message: 'Requerimiento guardado con éxito.' });
            setTimeout(() => setShowSuccess({ show: false, message: '' }), 3000);
            handleCloseDrawer();
        } catch (e) { console.error("Error en la transacción:", e); }
    };
    
    const handleDeleteRequirement = async (id) => {
        if (window.confirm('¿Estás seguro?')) { await deleteDoc(doc(db, 'requirements', id)); }
    };

    const handleCreateOpportunity = async (requirement) => {
        if (!requirement || !requirement.id || requirement.status === 'in_opportunity') {
            alert("Este requerimiento ya ha sido procesado.");
            return;
        }

        const opportunityItems = requirement.items.map(item => ({
            ...item, analysisStatus: 'pending', catalog: { familyId: '', variantId: '' },
            financialAnalysis: { competitors: '', suppliers: '', margins: { estimatedCost: 0, estimatedSalePrice: 0, estimatedMargin: 0 }},
            approval: { status: 'pending_decision', approvedBy: '', approvalDate: null }
        }));

        const newOpportunity = {
            sourceRequirementId: requirement.id, name: `Oportunidad desde Req. de ${requirement.contact?.name || requirement.source}`,
            contact: requirement.contact || {}, status: 'analysis_pending', items: opportunityItems,
            createdAt: serverTimestamp(), createdBy: currentUser.name,
        };

        try {
            await runTransaction(db, async (transaction) => {
                const newOppRef = doc(collection(db, 'opportunities'));
                transaction.set(newOppRef, newOpportunity);
                const reqRef = doc(db, 'requirements', requirement.id);
                transaction.update(reqRef, { status: 'in_opportunity', opportunityId: newOppRef.id });
            });
            setShowSuccess({ show: true, message: '¡Requerimiento convertido a Oportunidad!' });
            setTimeout(() => setShowSuccess({ show: false, message: '' }), 3000);
        } catch (error) { console.error("Error al crear la oportunidad:", error); }
    };

    const statusBadgeConfig = {
        pending_analysis: { color: 'yellow', label: 'Pendiente' },
        in_opportunity: { color: 'green', label: 'En Oportunidad' },
    };

    return (
        <>
            <Drawer opened={drawerOpened} onClose={handleCloseDrawer} position="right" size="xl"><RequirementForm initialData={selectedReq} onSave={handleSaveRequirement} onCancel={handleCloseDrawer} /></Drawer>
            {showSuccess.show && <Notification pos="fixed" bottom={20} right={20} icon={<IconCheck size="1.2rem" />} color="teal" title="¡Éxito!" onClose={() => setShowSuccess({ show: false, message: '' })}>{showSuccess.message}</Notification>}
            <Stack>
                <Group justify="space-between"><Title order={2}>Gestión de Requerimientos</Title><Button onClick={() => handleOpenDrawer()} leftSection={<IconPlus size={16} />}>Nuevo Requerimiento</Button></Group>
                <Paper withBorder shadow="sm" radius="md" p="md">
                    {loading && <Center p="xl"><Loader /></Center>}
                    {!loading && requirements.length === 0 && <Center p="xl"><Group><IconInbox /><Text>No hay requerimientos.</Text></Group></Center>}
                    {!loading && requirements.length > 0 && (
                        <Table verticalSpacing="sm" striped highlightOnHover>
                            <Table.Thead>
                                <Table.Tr><Table.Th /><Table.Th>Creado por</Table.Th><Table.Th>Origen / Solicitante</Table.Th><Table.Th># Productos</Table.Th><Table.Th>Estado</Table.Th><Table.Th style={{ textAlign: 'right' }}>Acciones</Table.Th></Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {requirements.map(req => (
                                    <Fragment key={req.id}>
                                        <Table.Tr onClick={() => setExpandedReqId(expandedReqId === req.id ? null : req.id)} style={{ cursor: 'pointer' }}>
                                            <Table.Td><ThemeIcon variant="subtle" radius="xl" color={expandedReqId === req.id ? 'blue' : 'gray'}><IconChevronDown style={{ transform: expandedReqId === req.id ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} /></ThemeIcon></Table.Td>
                                            <Table.Td><Group gap="xs"><IconUserCircle size={16} /><Text size="sm">{req.createdBy || 'N/A'}</Text></Group></Table.Td>
                                            <Table.Td>
                                                <Group gap="xs" align="flex-start">
                                                    {req.source === 'Cliente' ? <IconUser size={16} /> : <IconBuilding size={16} />}
                                                    <Stack gap={0}>
                                                        <Text size="sm" fw={500}>{req.source}</Text>
                                                        <Text size="xs" c="dimmed">{req.contact?.name || 'Sin especificar'}</Text>
                                                    </Stack>
                                                </Group>
                                            </Table.Td>
                                            <Table.Td>{req.items?.length || 0}</Table.Td>
                                            <Table.Td><Badge color={statusBadgeConfig[req.status]?.color || 'gray'} variant="light">{statusBadgeConfig[req.status]?.label || req.status}</Badge></Table.Td>
                                            <Table.Td>
                                                <Group gap={0} justify="flex-end">
                                                    <Tooltip label="Crear Oportunidad"><ActionIcon variant="subtle" color="blue" disabled={req.status === 'in_opportunity'} onClick={(e) => { e.stopPropagation(); handleCreateOpportunity(req); }}><IconRocket size={16} /></ActionIcon></Tooltip>
                                                    <Tooltip label="Editar"><ActionIcon variant="subtle" onClick={(e) => { e.stopPropagation(); handleOpenDrawer(req); }}><IconPencil size={16} /></ActionIcon></Tooltip>
                                                    <Tooltip label="Eliminar"><ActionIcon variant="subtle" color="red" onClick={(e) => { e.stopPropagation(); handleDeleteRequirement(req.id); }}><IconTrash size={16} /></ActionIcon></Tooltip>
                                                </Group>
                                            </Table.Td>
                                        </Table.Tr>
                                        <Table.Tr>
                                            <Table.Td colSpan={6} p={0} style={{ border: 'none' }}><Collapse in={expandedReqId === req.id}><RequirementDetail requirement={req} /></Collapse></Table.Td>
                                        </Table.Tr>
                                    </Fragment>
                                ))}
                            </Table.Tbody>
                        </Table>
                    )}
                </Paper>
            </Stack>
        </>
    );
};
export default RequirementsManagement;