import React, { useState, useEffect } from 'react';
import { Modal, Stack, TextInput, Button, Group, Title, Textarea } from '@mantine/core';

export const ContactModal = ({ opened, onClose, onSave, contactType, initialName = '' }) => {
    const [name, setName] = useState(initialName);
    const [website, setWebsite] = useState('');
    const [notes, setNotes] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [phone, setPhone] = useState('');

    useEffect(() => {
        // Limpiar el formulario cada vez que se abre
        if (opened) {
            setName(initialName);
            setWebsite('');
            setNotes('');
            setContactPerson('');
            setPhone('');
        }
    }, [opened, initialName]);

    const handleSave = () => {
        const data = { name, website, notes, contactPerson, phone };
        // El tipo ('supplier' o 'competitor') se pasa como prop
        onSave(data, contactType);
        onClose();
    };

    const title = `Crear Nuevo ${contactType === 'supplier' ? 'Proveedor' : 'Competidor'}`;

    return (
        <Modal opened={opened} onClose={onClose} title={<Title order={4}>{title}</Title>} centered>
            <Stack>
                <TextInput
                    label="Nombre"
                    placeholder={`Nombre del ${contactType}`}
                    value={name}
                    onChange={(e) => setName(e.currentTarget.value)}
                    required
                />
                <TextInput
                    label="Página Web (Opcional)"
                    placeholder="https://ejemplo.com"
                    value={website}
                    onChange={(e) => setWebsite(e.currentTarget.value)}
                />
                 {contactType === 'supplier' && (
                    <>
                        <TextInput
                            label="Persona de Contacto (Opcional)"
                            placeholder="Ej: Juan Pérez"
                            value={contactPerson}
                            onChange={(e) => setContactPerson(e.currentTarget.value)}
                        />
                        <TextInput
                            label="Teléfono (Opcional)"
                            placeholder="Ej: 999 888 777"
                            value={phone}
                            onChange={(e) => setPhone(e.currentTarget.value)}
                        />
                    </>
                 )}
                <Textarea
                    label="Notas (Opcional)"
                    placeholder="Información relevante..."
                    value={notes}
                    onChange={(e) => setNotes(e.currentTarget.value)}
                    autosize
                    minRows={2}
                />
                <Group justify="flex-end" mt="md">
                    <Button variant="default" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={!name}>Guardar</Button>
                </Group>
            </Stack>
        </Modal>
    );
};