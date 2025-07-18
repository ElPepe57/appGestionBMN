import React, { useState, useEffect } from 'react';
import { db } from '../../firebase-config'; // RUTA CORREGIDA
import { collection, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore';
import {
    Tabs,
    Table,
    Select,
    Loader,
    Text,
    Paper,
    ScrollArea
} from '@mantine/core';

const OpportunityTable = ({ stage }) => {
    const [opportunities, setOpportunities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'opportunities'), where('stage', '==', stage));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const opps = [];
            querySnapshot.forEach((doc) => {
                opps.push({ id: doc.id, ...doc.data() });
            });
            setOpportunities(opps);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [stage]);

    const handleStageChange = async (id, newStage) => {
        const oppRef = doc(db, 'opportunities', id);
        try {
            await updateDoc(oppRef, { stage: newStage });
        } catch (error) {
            console.error("Error al actualizar la etapa: ", error);
        }
    };

    if (loading) {
        return <Loader />;
    }

    const rows = opportunities.map((element) => (
        <tr key={element.id}>
            <td>{element.name}</td>
            <td>{element.contact}</td>
            <td>
                <Text fw={700}>S/ {Number(element.value).toFixed(2)}</Text>
            </td>
            <td>{new Date(element.closingDate).toLocaleDateString()}</td>
            <td>
                <Select
                    value={element.stage}
                    onChange={(newStage) => handleStageChange(element.id, newStage)}
                    data={['Nuevo', 'Calificación', 'Propuesta', 'Negociación', 'Ganada', 'Perdida']}
                    variant="unstyled"
                    size="xs"
                />
            </td>
        </tr>
    ));

    return (
        <ScrollArea>
            <Table striped highlightOnHover withBorder>
                <thead>
                    <tr>
                        <th>Nombre de Oportunidad</th>
                        <th>Contacto</th>
                        <th>Valor (PEN)</th>
                        <th>Fecha de Cierre</th>
                        <th>Etapa Actual</th>
                    </tr>
                </thead>
                <tbody>{rows.length > 0 ? rows : (
                    <tr>
                        <td colSpan="5">
                            <Text align="center" c="dimmed" mt="md">
                                No hay oportunidades en esta etapa.
                            </Text>
                        </td>
                    </tr>
                )}</tbody>
            </Table>
        </ScrollArea>
    );
};


const OpportunityPipelineTabs = () => {
    const stages = ['Nuevo', 'Calificación', 'Propuesta', 'Negociación', 'Ganada', 'Perdida'];

    return (
        <Paper withBorder shadow="sm" p="md" radius="md">
            <Tabs defaultValue="Nuevo">
                <Tabs.List>
                    {stages.map(stage => (
                        <Tabs.Tab key={stage} value={stage}>
                            {stage}
                        </Tabs.Tab>
                    ))}
                </Tabs.List>

                {stages.map(stage => (
                    <Tabs.Panel key={stage} value={stage} pt="xs">
                        <OpportunityTable stage={stage} />
                    </Tabs.Panel>
                ))}
            </Tabs>
        </Paper>
    );
};

export default OpportunityPipelineTabs;