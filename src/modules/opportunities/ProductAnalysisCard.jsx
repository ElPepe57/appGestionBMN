import React, { useState, useEffect } from 'react';
import {
    Paper, Title, Stack, Group, Text, Fieldset, NumberInput, Select, Textarea
} from '@mantine/core';
import { SupplierAnalysis } from './SupplierAnalysis';
import { CompetitorAnalysis } from './CompetitorAnalysis';

export const ProductAnalysisCard = ({ item, onItemUpdate, suppliersDB, competitorsDB, onContactCreate }) => {
    // Estado para guardar los valores calculados del resumen financiero
    const [financialSummary, setFinancialSummary] = useState({
        selectedSupplierCost: 0,
        benchmarkCompetitorPrice: 0,
        grossMargin: 0,
        marginPercentage: 0
    });

    // LÓGICA AUTOMÁTICA PARA EL ANÁLISIS FINANCIERO INTEGRAL
    useEffect(() => {
        // 1. Calcula el costo total del proveedor seleccionado
        const selectedSupplier = item.supplierAnalysis?.find(s => s.isSelected);
        const totalSupplierCost = selectedSupplier ? (selectedSupplier.price || 0) + (selectedSupplier.shippingCost || 0) : 0;
        
        // 2. Encuentra el precio más bajo de la competencia
        const competitorPrices = item.competitorAnalysis?.map(c => c.price).filter(p => p > 0) || [];
        const lowestCompetitorPrice = competitorPrices.length > 0 ? Math.min(...competitorPrices) : 0;

        // 3. Calcula el margen
        let margin = 0;
        let marginPercentage = 0;
        if (lowestCompetitorPrice > 0 && totalSupplierCost > 0) {
            margin = lowestCompetitorPrice - totalSupplierCost;
            marginPercentage = (margin / lowestCompetitorPrice) * 100;
        }

        // 4. Actualiza el estado del resumen financiero
        const newSummary = {
            selectedSupplierCost: totalSupplierCost,
            benchmarkCompetitorPrice: lowestCompetitorPrice,
            grossMargin: margin,
            marginPercentage: marginPercentage
        };
        setFinancialSummary(newSummary);

        // 5. Propaga el resumen al componente padre para que se pueda guardar
        // Se combina con las notas existentes para no perderlas
        onItemUpdate({
            ...item,
            financialSummary: {
                ...item.financialSummary, // Mantiene las notas
                ...newSummary // Actualiza los valores calculados
            }
        });

    }, [item.supplierAnalysis, item.competitorAnalysis]);

    // Función genérica para actualizar los datos de análisis (proveedores o competencia)
    const handleAnalysisUpdate = (analysisType, data) => {
        onItemUpdate({
            ...item,
            [analysisType]: data
        });
    };

    // Función para actualizar la decisión de aprobación
    const handleApprovalChange = (status) => {
        onItemUpdate({
            ...item,
            approval: {
                ...item.approval,
                status: status
            }
        });
    };
    
    // Función para actualizar las notas finales
    const handleNotesChange = (notes) => {
        onItemUpdate({
            ...item,
            financialSummary: {
                ...item.financialSummary,
                finalDecisionNotes: notes
            }
        });
    };

    return (
        <Paper withBorder p="md" radius="md" shadow="sm">
            <Stack>
                <Title order={4}>{item.product}</Title>
                <Text size="sm" c="dimmed">{`Marca: ${item.brand || 'N/A'} - Cant. Requerida: ${item.quantityByPresentation || 'N/A'}`}</Text>
                
                <Fieldset legend="Análisis de Proveedores">
                    <SupplierAnalysis
                        analysisData={item.supplierAnalysis || []}
                        onUpdate={(data) => handleAnalysisUpdate('supplierAnalysis', data)}
                        suppliersDB={suppliersDB}
                        onContactCreate={onContactCreate}
                    />
                </Fieldset>

                <Fieldset legend="Análisis de Competencia">
                     <CompetitorAnalysis
                        analysisData={item.competitorAnalysis || []}
                        onUpdate={(data) => handleAnalysisUpdate('competitorAnalysis', data)}
                        competitorsDB={competitorsDB}
                        onContactCreate={onContactCreate}
                    />
                </Fieldset>
                
                <Fieldset legend="Análisis Financiero Integral (Automático)">
                     <Group grow>
                        <NumberInput label="Costo Total Proveedor (USD)" value={financialSummary.selectedSupplierCost} readOnly precision={2} />
                        <NumberInput label="Precio Ref. Competencia (USD)" value={financialSummary.benchmarkCompetitorPrice} readOnly precision={2} />
                        <NumberInput label="Margen Bruto Estimado ($)" value={financialSummary.grossMargin} readOnly precision={2} />
                        <NumberInput label="Margen Porcentual Estimado (%)" value={financialSummary.marginPercentage} readOnly precision={2} />
                     </Group>
                     <Textarea
                        label="Notas de la Decisión Final"
                        placeholder="Justificación de la aprobación o rechazo..."
                        value={item.financialSummary?.finalDecisionNotes || ''}
                        onChange={(e) => handleNotesChange(e.currentTarget.value)}
                        mt="md"
                        autosize minRows={2}
                     />
                </Fieldset>

                <Fieldset legend="Decisión de Gerencia">
                     <Select
                        label="Estado de Aprobación"
                        value={item.approval.status}
                        onChange={handleApprovalChange}
                        data={[
                            { value: 'pending_decision', label: 'Pendiente de Decisión' },
                            { value: 'approved', label: 'Aprobado para Adquisición' },
                            { value: 'rejected', label: 'Rechazado' },
                        ]}
                    />
                </Fieldset>
            </Stack>
        </Paper>
    );
};
