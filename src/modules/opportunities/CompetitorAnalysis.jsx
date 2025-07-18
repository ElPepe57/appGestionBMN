import React, { useState } from 'react';
import { Paper, Stack, Group, Text, Autocomplete, ActionIcon, Tooltip, NumberInput, Button, Textarea, TextInput } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';

// Tarjeta para un solo competidor en la lista de análisis
const CompetitorCard = ({ data, index, onUpdate, onRemove }) => (
    <Paper withBorder p="xs" radius="sm">
        <Stack>
            <Group justify="space-between">
                <Text fw={500}>{data.name}</Text>
                <Tooltip label="Eliminar Competidor">
                    <ActionIcon color="red" variant="subtle" onClick={() => onRemove(index)}>
                        <IconTrash size={16} />
                    </ActionIcon>
                </Tooltip>
            </Group>
            <Group grow>
                <TextInput
                    label="URL del Producto"
                    placeholder="Link de referencia"
                    value={data.productURL}
                    onChange={(e) => onUpdate(index, 'productURL', e.currentTarget.value)}
                />
                <NumberInput
                    label="Precio Competencia"
                    value={data.price}
                    onChange={(val) => onUpdate(index, 'price', val)}
                    precision={2}
                />
            </Group>
            <Textarea
                label="Resumen de Mercado"
                placeholder="Posicionamiento, estrategia del competidor..."
                value={data.marketSummary}
                onChange={(e) => onUpdate(index, 'marketSummary', e.currentTarget.value)}
                autosize
                minRows={2}
            />
        </Stack>
    </Paper>
);

// Componente principal que gestiona la lista de competidores
export const CompetitorAnalysis = ({ analysisData = [], onUpdate, competitorsDB = [], onContactCreate }) => {
    const [searchValue, setSearchValue] = useState('');

    const handleAddCompetitor = (competitorId) => {
        const competitor = competitorsDB.find(c => c.id === competitorId);
        if (!competitor || analysisData.some(c => c.competitorId === competitorId)) {
            setSearchValue('');
            return;
        }

        const newCompetitor = {
            competitorId: competitor.id,
            name: competitor.name,
            productURL: '',
            price: 0,
            marketSummary: ''
        };
        onUpdate([...analysisData, newCompetitor]);
        setSearchValue('');
    };
    
    const handleUpdateCompetitor = (index, field, value) => {
        const updatedData = analysisData.map((d, i) => i === index ? { ...d, [field]: value } : d);
        onUpdate(updatedData);
    };

    const handleRemoveCompetitor = (indexToRemove) => {
        onUpdate(analysisData.filter((_, i) => i !== indexToRemove));
    };

    return (
        <Stack>
            {analysisData.map((data, index) => (
                <CompetitorCard
                    key={index}
                    data={data}
                    index={index}
                    onUpdate={handleUpdateCompetitor}
                    onRemove={handleRemoveCompetitor}
                />
            ))}
            <Group grow align="flex-end">
                <Autocomplete
                    label="Añadir Competidor Existente"
                    placeholder="Busca por nombre..."
                    data={competitorsDB.map(c => ({ value: c.id, label: c.name }))}
                    value={searchValue}
                    onChange={setSearchValue}
                    onOptionSubmit={handleAddCompetitor}
                    limit={5}
                />
                <Button onClick={() => onContactCreate('competitor', searchValue)} variant="light" leftSection={<IconPlus size={14} />}>
                    Crear Competidor
                </Button>
            </Group>
        </Stack>
    );
};
