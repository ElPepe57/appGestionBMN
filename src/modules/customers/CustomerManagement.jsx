import React, { useState, useEffect } from 'react';
import { db } from '../../firebase-config';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useFirestore } from '../../shared/hooks/useFirestore';
import { useDisclosure } from '@mantine/hooks';
import {
    Title, Text, Button, Group, Stack, Paper, Table, Tabs, ActionIcon,
    Drawer, TextInput, Select, Tooltip, Loader, Center
} from '@mantine/core';
import { IconPlus, IconUser, IconBuilding, IconPencil, IconTrash } from '@tabler/icons-react';

// --- Formulario para Crear/Editar un Contacto (Cliente o Empleado) ---
const ContactForm = ({ initialData, onSave, onCancel }) => {
    const [name, setName] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [type, setType] = useState('potencial'); // Para clientes
    const [role, setRole] = useState('Vendedor');   // Para empleados
    const isEditing = !!initialData?.id;
    const contactType = initialData?.role ? 'employee' : 'customer';

    useEffect(() => {
        if (isEditing) {
            setName(initialData.name || '');
            if (contactType === 'customer') {
                setType(initialData.type || 'potencial');
                setContactPerson(initialData.contactPerson || '');
                setPhone(initialData.phone || '');
                setEmail(initialData.email || '');
            } else {
                setRole(initialData.role || 'Vendedor');
                setEmail(initialData.email || '');
            }
        } else {
            // Limpiar el formulario para un nuevo contacto
            setName('');
            setContactPerson('');
            setPhone('');
            setEmail('');
            setType(initialData?.type || 'potencial');
            setRole(initialData?.role || 'Vendedor');
        }
    }, [initialData, isEditing, contactType]);

    const handleSubmit = () => {
        let data;
        if (contactType === 'customer') {
            data = { name, type, contactPerson, phone, email };
        } else {
            data = { name, role, email };
        }
        onSave(data, contactType);
    };

    return (
        <Stack p="md" gap="lg">
            <Title order={4}>{isEditing ? `Editando a ${name}` : `Nuevo ${contactType === 'customer' ? 'Cliente' : 'Empleado'}`}</Title>
            
            <TextInput label="Nombre Completo o Razón Social" value={name} onChange={(e) => setName(e.currentTarget.value)} required />
            <TextInput label="Correo Electrónico" type="email" value={email} onChange={(e) => setEmail(e.currentTarget.value)} />
            
            {contactType === 'customer' && (
                <>
                    <Select label="Tipo de Cliente" value={type} onChange={setType} data={[{value: 'potencial', label: 'Potencial'}, {value: 'existente', label: 'Existente'}]} />
                    <TextInput label="Persona de Contacto" value={contactPerson} onChange={(e) => setContactPerson(e.currentTarget.value)} />
                    <TextInput label="Teléfono" value={phone} onChange={(e) => setPhone(e.currentTarget.value)} />
                </>
            )}

            {contactType === 'employee' && (
                <Select label="Rol o Cargo" value={role} onChange={setRole} data={['Vendedor', 'Gerencia', 'Logística', 'Administración']} />
            )}

            <Group justify="flex-end" mt="xl">
                <Button variant="default" onClick={onCancel}>Cancelar</Button>
                <Button onClick={handleSubmit}>{isEditing ? 'Guardar Cambios' : 'Crear Contacto'}</Button>
            </Group>
        </Stack>
    );
};

// --- Componente Principal de Gestión de Contactos ---
const CustomerManagement = () => {
    const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
    const [selectedContact, setSelectedContact] = useState(null);

    const { data: customers, loading: loadingCustomers } = useFirestore('customers');
    const { data: employees, loading: loadingEmployees } = useFirestore('employees');

    const handleOpenDrawer = (contact = null) => {
        setSelectedContact(contact);
        openDrawer();
    };

    const handleCloseDrawer = () => {
        setSelectedContact(null);
        closeDrawer();
    };

    const handleSaveContact = async (data, contactType) => {
        const collectionName = contactType === 'customer' ? 'customers' : 'employees';
        try {
            if (selectedContact && selectedContact.id) {
                await updateDoc(doc(db, collectionName, selectedContact.id), data);
            } else {
                await addDoc(collection(db, collectionName), data);
            }
            handleCloseDrawer();
        } catch (error) {
            console.error("Error al guardar el contacto:", error);
        }
    };

    const handleDelete = async (contact, contactType) => {
        const collectionName = contactType === 'customer' ? 'customers' : 'employees';
        if(window.confirm(`¿Estás seguro de eliminar a ${contact.name}?`)) {
            try {
                await deleteDoc(doc(db, collectionName, contact.id));
            } catch (error) {
                console.error("Error al eliminar el contacto:", error);
            }
        }
    }

    return (
        <>
            <Drawer opened={drawerOpened} onClose={handleCloseDrawer} position="right" size="lg">
                <ContactForm initialData={selectedContact} onSave={handleSaveContact} onCancel={handleCloseDrawer} />
            </Drawer>

            <Stack>
                <Group justify="space-between">
                    <Title order={2}>Gestión de Contactos</Title>
                    <Group>
                        <Button onClick={() => handleOpenDrawer({ type: 'potencial' })} variant="light" leftSection={<IconUser size={16} />}>Nuevo Cliente</Button>
                        <Button onClick={() => handleOpenDrawer({ role: 'Vendedor' })} variant="light" leftSection={<IconBuilding size={16} />}>Nuevo Empleado</Button>
                    </Group>
                </Group>
                
                <Tabs defaultValue="customers">
                    <Tabs.List>
                        <Tabs.Tab value="customers" leftSection={<IconUser size={14} />}>Clientes</Tabs.Tab>
                        <Tabs.Tab value="employees" leftSection={<IconBuilding size={14} />}>Empleados</Tabs.Tab>
                    </Tabs.List>
                    
                    <Tabs.Panel value="customers" pt="xs">
                        <Paper withBorder p="md" radius="md">
                            {loadingCustomers ? <Center><Loader /></Center> :
                            <Table striped highlightOnHover verticalSpacing="sm">
                                <Table.Thead>
                                    <Table.Tr><Table.Th>Nombre</Table.Th><Table.Th>Tipo</Table.Th><Table.Th>Contacto Principal</Table.Th><Table.Th>Teléfono</Table.Th><Table.Th style={{textAlign: 'right'}}>Acciones</Table.Th></Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {customers.map(c => (
                                        <Table.Tr key={c.id}>
                                            <Table.Td>{c.name}</Table.Td>
                                            <Table.Td>{c.type}</Table.Td>
                                            <Table.Td>{c.contactPerson}</Table.Td>
                                            <Table.Td>{c.phone}</Table.Td>
                                            <Table.Td>
                                                <Group gap="xs" justify="flex-end">
                                                    <Tooltip label="Editar"><ActionIcon variant="subtle" onClick={() => handleOpenDrawer(c)}><IconPencil size={16} /></ActionIcon></Tooltip>
                                                    <Tooltip label="Eliminar"><ActionIcon variant="subtle" color="red" onClick={() => handleDelete(c, 'customer')}><IconTrash size={16} /></ActionIcon></Tooltip>
                                                </Group>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                            }
                        </Paper>
                    </Tabs.Panel>
                    
                    <Tabs.Panel value="employees" pt="xs">
                        <Paper withBorder p="md" radius="md">
                        {loadingEmployees ? <Center><Loader /></Center> :
                            <Table striped highlightOnHover verticalSpacing="sm">
                                <Table.Thead>
                                    <Table.Tr><Table.Th>Nombre</Table.Th><Table.Th>Rol</Table.Th><Table.Th>Email</Table.Th><Table.Th style={{textAlign: 'right'}}>Acciones</Table.Th></Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {employees.map(e => (
                                        <Table.Tr key={e.id}>
                                            <Table.Td>{e.name}</Table.Td>
                                            <Table.Td>{e.role}</Table.Td>
                                            <Table.Td>{e.email}</Table.Td>
                                            <Table.Td>
                                                <Group gap="xs" justify="flex-end">
                                                    <Tooltip label="Editar"><ActionIcon variant="subtle" onClick={() => handleOpenDrawer(e)}><IconPencil size={16} /></ActionIcon></Tooltip>
                                                    <Tooltip label="Eliminar"><ActionIcon variant="subtle" color="red" onClick={() => handleDelete(e, 'employee')}><IconTrash size={16} /></ActionIcon></Tooltip>
                                                </Group>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>}
                        </Paper>
                    </Tabs.Panel>
                </Tabs>
            </Stack>
        </>
    );
};

export default CustomerManagement;