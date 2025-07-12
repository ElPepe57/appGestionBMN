import React, { useState, useMemo } from 'react';
import {
  Title, Button, Modal, Text, Paper, Divider, Loader, Table, Badge, Group, List, ThemeIcon, NumberInput, Tabs, ActionIcon, TextInput, Select, Tooltip
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { collection, addDoc, serverTimestamp, doc, updateDoc, where, query, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase-config';
import { useFirestore } from '../../shared/hooks/useFirestore';
import { useExchangeRate } from '../../shared/hooks/useExchangeRate';
import { CheckCircle, Plus, Trash2, Edit, TrendingUp, Users, DollarSign, Link as LinkIcon, Layers, RefreshCw } from 'lucide-react';
import { showNotification } from '@mantine/notifications';

const OpportunityManagement = () => {
  // Hooks para controlar cada modal de forma independiente
  const [reviewModalOpened, { open: openReviewModal, close: closeReviewModal }] = useDisclosure(false);
  const [analysisModalOpened, { open: openAnalysisModal, close: closeAnalysisModal }] = useDisclosure(false);
  const [providerModalOpened, { open: openProviderModal, close: closeProviderModal }] = useDisclosure(false);
  const [competitorModalOpened, { open: openCompetitorModal, close: closeCompetitorModal }] = useDisclosure(false);
  const [classificationModalOpened, { open: openClassificationModal, close: closeClassificationModal }] = useDisclosure(false);
  const [newCategoryModalOpened, { open: openNewCategoryModal, close: closeNewCategoryModal }] = useDisclosure(false);
  const [newProductModalOpened, { open: openNewProductModal, close: closeNewProductModal }] = useDisclosure(false);
  
  // Estados para manejar los objetos seleccionados
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [itemToClassify, setItemToClassify] = useState(null);
  const [formState, setFormState] = useState({});
  const [classificationForm, setClassificationForm] = useState({ categoryId: '', productId: '' });

  // Lectura de datos segura desde Firestore, con arrays vacíos por defecto
  const { data: requirements = [], loading: reqsLoading } = useFirestore('requirements');
  const { data: opportunities = [], loading: oppsLoading } = useFirestore('opportunities');
  const { data: products = [] } = useFirestore('products');
  const { data: categories = [] } = useFirestore('categories');
  const { data: brands = [] } = useFirestore('brands');
  const { rate: exchangeRate, loading: rateLoading, refreshRate } = useExchangeRate();
  const currentUserId = 'user_test_01';

  // ✅ LÍNEA CORREGIDA: Ahora incluye items 'classified' para que no desaparezcan de la bandeja.
  const pendingRequirements = useMemo(() => requirements.filter(r => r.items?.some(i => i.status === 'pending_review' || i.status === 'classified')), [requirements]);
  
  const categoryOptions = useMemo(() => categories.map(c => ({ value: c.id, label: c.name })), [categories]);
  
  const productOptions = useMemo(() => {
    if (!classificationForm.categoryId) return [];
    return products
      .filter(p => p.categoryId === classificationForm.categoryId)
      .map(p => ({ value: p.id, label: p.name }));
  }, [products, classificationForm.categoryId]);

  // --- LÓGICA DE NEGOCIO COMPLETA Y FUNCIONAL ---

  const handleOpenReviewModal = (req) => {
    setSelectedRequirement(req);
    openReviewModal();
  };
  
  const handleOpenClassificationModal = (item, itemIndex) => {
    setItemToClassify({ ...item, index: itemIndex });
    setClassificationForm({ categoryId: '', productId: '' });
    openClassificationModal();
  };

  const handleSaveClassification = async () => {
    if (!itemToClassify || !selectedRequirement || !classificationForm.productId) {
      showNotification({
        title: 'Error',
        message: 'Debes seleccionar una Categoría y una Familia de Producto.',
        color: 'red'
      });
      return;
    }
    
    const reqRef = doc(db, 'requirements', selectedRequirement.id);
    const updatedItems = [...selectedRequirement.items];
    updatedItems[itemToClassify.index].status = 'classified';
    updatedItems[itemToClassify.index].productId = classificationForm.productId;

    try {
      await updateDoc(reqRef, { items: updatedItems });
      showNotification({
        title: 'Éxito',
        message: 'Producto clasificado con éxito. Ahora puedes iniciar el análisis.',
        color: 'green'
      });
      const updatedReq = { ...selectedRequirement, items: updatedItems };
      setSelectedRequirement(updatedReq);
      closeClassificationModal();
    } catch (e) {
      console.error("Error:", e);
      showNotification({
        title: 'Error',
        message: 'Error al clasificar el producto.',
        color: 'red'
      });
    }
  };

  const handleStartAnalysis = async (item) => {
    if (!selectedRequirement || !item || !item.productId) {
        showNotification({
          title: 'Error',
          message: 'El item debe ser clasificado antes de iniciar el análisis.',
          color: 'red'
        });
        return;
    }
    const endGoal = selectedRequirement.source === 'Cliente' ? 'quote_customer' : 'add_to_catalog';
    const opportunityData = {
      requirementId: selectedRequirement.id,
      productName: item.requestedProduct,
      source: selectedRequirement.source,
      specifics: { brand: item.brand || '', presentation: item.presentation || '', dosage: item.dosage || '', quantity: item.quantity || '' },
      status: 'analysis',
      endGoal: endGoal,
      createdAt: serverTimestamp(),
      createdBy: currentUserId,
      providerQuotes: [],
      competitorAnalysis: [],
    };
    try {
      await addDoc(collection(db, 'opportunities'), opportunityData);
      const reqRef = doc(db, 'requirements', selectedRequirement.id);
      const updatedItems = [...selectedRequirement.items];
      const itemIndex = updatedItems.findIndex(i => i.requestedProduct === item.requestedProduct);
      if(itemIndex !== -1) {
        updatedItems[itemIndex].status = 'analysis_started';
        await updateDoc(reqRef, { items: updatedItems });
      }
      showNotification({
        title: 'Análisis iniciado',
        message: `Análisis para "${item.requestedProduct}" iniciado.`,
        color: 'blue'
      });
      closeReviewModal();
    } catch (e) { 
      console.error("Error:", e); 
      showNotification({
        title: 'Error',
        message: 'Hubo un error al iniciar el análisis.',
        color: 'red'
      });
    }
  };
  
  const handleQuickCreateCategory = async (event) => {
    event.preventDefault();
    const newCategoryName = event.currentTarget.categoryName.value;
    if (!newCategoryName) return;
    try {
      const docRef = await addDoc(collection(db, 'categories'), { name: newCategoryName });
      setClassificationForm({ categoryId: docRef.id, productId: '' });
      showNotification({
        title: 'Categoría creada',
        message: `Categoría "${newCategoryName}" creada y seleccionada.`,
        color: 'green'
      });
      closeNewCategoryModal();
    } catch (e) { 
      console.error(e); 
      showNotification({
        title: 'Error',
        message: 'Error al crear categoría.',
        color: 'red'
      });
    }
  };

  const handleQuickCreateProduct = async (event) => {
    event.preventDefault();
    const newProductName = event.currentTarget.productName.value;
    if (!newProductName || !classificationForm.categoryId) return;
    const category = categories.find(c => c.id === classificationForm.categoryId);
    try {
      const docRef = await addDoc(collection(db, 'products'), { 
        name: newProductName, 
        categoryId: classificationForm.categoryId,
        categoryName: category?.name || 'N/A'
      });
      setClassificationForm(prev => ({ ...prev, productId: docRef.id }));
      showNotification({
        title: 'Producto creado',
        message: `Familia de Producto "${newProductName}" creada y seleccionada.`,
        color: 'green'
      });
      closeNewProductModal();
    } catch (e) { 
      console.error(e); 
      showNotification({
        title: 'Error',
        message: 'Error al crear producto.',
        color: 'red'
      });
    }
  };

  const handleOpenAnalysisModal = (opp) => { 
    if (opp && opp.id) { 
      setSelectedOpp(opp); 
      openAnalysisModal(); 
    } else { 
      showNotification({
        title: 'Error',
        message: 'Datos de oportunidad inválidos.',
        color: 'red'
      });
    }
  };
  
  const handleSaveProvider = async (event) => {
    event.preventDefault();
    if (!selectedOpp) return;
    const newProviderQuote = { 
      id: `prov_${Date.now()}`, 
      ...formState, 
      currency: formState.currency || 'USD',
      savedExchangeRate: formState.currency === 'USD' ? exchangeRate : null,
      createdAt: new Date().toISOString()
    };
    const updatedQuotes = [...(selectedOpp.providerQuotes || []), newProviderQuote];
    const oppRef = doc(db, 'opportunities', selectedOpp.id);
    await updateDoc(oppRef, { providerQuotes: updatedQuotes });
    setSelectedOpp(prev => ({ ...prev, providerQuotes: updatedQuotes }));
    closeProviderModal();
  };

  const handleSaveCompetitor = async (event) => {
    event.preventDefault();
    if (!selectedOpp) return;
    const newCompetitor = { 
      id: `comp_${Date.now()}`, 
      ...formState, 
      currency: 'PEN',
      competitorLink: formState.competitorLink || '',
      phoneNumber: formState.phoneNumber || '',
      createdAt: new Date().toISOString()
    };
    const updatedCompetitors = [...(selectedOpp.competitorAnalysis || []), newCompetitor];
    const oppRef = doc(db, 'opportunities', selectedOpp.id);
    await updateDoc(oppRef, { competitorAnalysis: updatedCompetitors });
    setSelectedOpp(prev => ({ ...prev, competitorAnalysis: updatedCompetitors }));
    closeCompetitorModal();
  };

  const handleDeleteItem = async (type, itemId) => {
    if (!selectedOpp) return;
    if (!window.confirm("¿Estás seguro de que quieres eliminar este item?")) return;
    let updatedArray, fieldToUpdate;
    if (type === 'provider') {
        updatedArray = selectedOpp.providerQuotes.filter(p => p.id !== itemId);
        fieldToUpdate = 'providerQuotes';
    } else {
        updatedArray = selectedOpp.competitorAnalysis.filter(c => c.id !== itemId);
        fieldToUpdate = 'competitorAnalysis';
    }
    const oppRef = doc(db, 'opportunities', selectedOpp.id);
    await updateDoc(oppRef, { [fieldToUpdate]: updatedArray });
    setSelectedOpp(prev => ({ ...prev, [fieldToUpdate]: updatedArray }));
  };

  const handleApprove = async () => {
    if (!selectedOpp) return;
    const newStatus = selectedOpp.endGoal === 'quote_customer' ? 'approved_for_quotation' : 'approved_for_catalog';
    const oppRef = doc(db, 'opportunities', selectedOpp.id);
    try {
        await updateDoc(oppRef, { 
          status: newStatus,
          approvedAt: serverTimestamp(),
          approvedExchangeRate: exchangeRate
        });
        showNotification({
          title: 'Oportunidad aprobada',
          message: `Nuevo estado: ${newStatus}.`,
          color: 'green'
        });
        closeAnalysisModal();
    } catch(e) { 
      console.error("Error:", e); 
      showNotification({
        title: 'Error',
        message: 'Error al aprobar la oportunidad.',
        color: 'red'
      });
    }
  };

  const handleFormChange = (e) => setFormState(prev => ({ ...prev, [e.target.name]: e.target.value }));
  
  const analysisData = useMemo(() => {
    if (!selectedOpp || !selectedOpp.providerQuotes || selectedOpp.providerQuotes.length === 0 || !exchangeRate) {
      return { bestProvider: null, bestProviderCostPEN: 0, scenarios: [], recommendation: 'Datos insuficientes' };
    }
    
    // Función para calcular el costo total (precio + envío) en PEN
    const calculateTotalCostPEN = (provider) => {
      const price = provider.price || 0;
      const shippingCost = provider.shippingCost || 0;
      const totalCost = price + shippingCost;
      
      return provider.currency === 'USD' ? totalCost * exchangeRate : totalCost;
    };
    
    const bestProvider = selectedOpp.providerQuotes.reduce((best, current) => {
      const bestTotalCostPEN = calculateTotalCostPEN(best);
      const currentTotalCostPEN = calculateTotalCostPEN(current);
      return currentTotalCostPEN < bestTotalCostPEN ? current : best;
    });
    
    const bestProviderCostPEN = calculateTotalCostPEN(bestProvider);
    
    const salePriceAvg = selectedOpp.competitorAnalysis?.reduce((sum, c) => sum + (c.salePrice || 0), 0) / (selectedOpp.competitorAnalysis?.length || 1) || bestProviderCostPEN * 2;
    const scenarios = [
      { name: 'Competitivo', price: salePriceAvg * 0.80 },
      { name: 'Promedio', price: salePriceAvg },
      { name: 'Premium', price: salePriceAvg * 1.10 },
    ].map(s => ({ ...s, margin: s.price > 0 ? (((s.price - bestProviderCostPEN) / s.price) * 100).toFixed(1) + '%' : 'N/A' }));
    const finalMargin = parseFloat(scenarios[1].margin);
    const recommendation = finalMargin > 30 ? 'APROBAR' : 'REVISAR';
    return { bestProvider, bestProviderCostPEN, scenarios, recommendation, finalMargin };
  }, [selectedOpp, exchangeRate]);

  return (
    <div style={{ padding: '2rem' }}>
      <Title order={1} mb="lg">Gestión de Oportunidades</Title>

      <Modal opened={reviewModalOpened} onClose={closeReviewModal} title="Revisar Items del Requerimiento" size="lg">
        {selectedRequirement && (
          <List spacing="sm" size="sm" p="md">
            {selectedRequirement.items.map((item, index) => (
              <List.Item key={index} icon={<ThemeIcon color={item.status === 'pending_review' ? 'orange' : (item.status === 'classified' ? 'blue' : 'gray')} size={24} radius="xl"><CheckCircle size={16} /></ThemeIcon>}>
                <Group position="apart">
                  <div>
                    <Text fw={500}>{item.requestedProduct}</Text>
                    <Text size="xs" c="dimmed">{[item.brand, item.presentation, item.dosage, item.quantity].filter(Boolean).join(' / ')}</Text>
                  </div>
                  {item.status === 'pending_review' && (
                    <Button size="xs" variant="outline" onClick={() => handleOpenClassificationModal(item, index)}>Clasificar</Button>
                  )}
                  {item.status === 'classified' && (
                    <Button size="xs" onClick={() => handleStartAnalysis(item)}>Iniciar Análisis</Button>
                  )}
                  {item.status === 'analysis_started' && (
                    <Badge color="gray">Análisis Iniciado</Badge>
                  )}
                </Group>
              </List.Item>
            ))}
          </List>
        )}
      </Modal>
      
      <Modal opened={classificationModalOpened} onClose={closeClassificationModal} title="Clasificar Producto del Requerimiento">
          <Text>Producto: <Text span fw={700}>{itemToClassify?.requestedProduct}</Text></Text>
          <Group align="flex-end">
            <Select
                label="1. Selecciona una Categoría"
                placeholder="Selecciona..."
                data={categoryOptions}
                value={classificationForm.categoryId}
                onChange={(value) => setClassificationForm({ categoryId: value, productId: '' })}
                style={{ flex: 1 }}
                required
            />
            <ActionIcon variant="filled" color="blue" onClick={openNewCategoryModal} size="lg"><Plus size={20} /></ActionIcon>
          </Group>
          
          {classificationForm.categoryId && (
            <Group align="flex-end" mt="md">
              <Select
                  label="2. Asigna a una Familia de Producto"
                  placeholder="Selecciona..."
                  data={productOptions}
                  value={classificationForm.productId}
                  onChange={(value) => setClassificationForm(prev => ({ ...prev, productId: value }))}
                  style={{ flex: 1 }}
                  required
              />
              <ActionIcon variant="filled" color="blue" onClick={openNewProductModal} size="lg"><Plus size={20} /></ActionIcon>
            </Group>
          )}
          <Button onClick={handleSaveClassification} mt="lg" fullWidth>Guardar Clasificación</Button>
      </Modal>

      <Modal opened={newCategoryModalOpened} onClose={closeNewCategoryModal} title="Crear Nueva Categoría" centered size="sm">
        <form onSubmit={handleQuickCreateCategory}>
          <TextInput name="categoryName" label="Nombre de la Categoría" placeholder="Ej: Vitaminas y Minerales" required />
          <Button type="submit" mt="md" fullWidth>Crear</Button>
        </form>
      </Modal>
      <Modal opened={newProductModalOpened} onClose={closeNewProductModal} title="Crear Nueva Familia de Producto" centered size="sm">
        <form onSubmit={handleQuickCreateProduct}>
          <Text size="sm">Categoría: <Badge>{categories.find(c => c.id === classificationForm.categoryId)?.name}</Badge></Text>
          <TextInput name="productName" label="Nombre de la Familia" placeholder="Ej: Vitamina D" mt="sm" required />
          <Button type="submit" mt="md" fullWidth>Crear</Button>
        </form>
      </Modal>

      <Modal opened={analysisModalOpened} onClose={closeAnalysisModal} title={`Análisis de Oportunidad: ${selectedOpp?.productName || 'Cargando...'}`} size="90%">
        {selectedOpp ? (
          <Tabs defaultValue="providers" variant="outline" radius="md">
            <Tabs.List>
              <Tabs.Tab value="providers" icon={<Users size={14} />}>Proveedores</Tabs.Tab>
              <Tabs.Tab value="competitors" icon={<TrendingUp size={14} />}>Competencia</Tabs.Tab>
              <Tabs.Tab value="analysis" icon={<DollarSign size={14} />}>Análisis Final</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="providers" pt="xs">
              <Group position="apart" mb="md">
                <Title order={4}>Proveedores ({selectedOpp.providerQuotes?.length || 0})</Title>
                <Button onClick={() => { setFormState({}); openProviderModal(); }}>Agregar Proveedor</Button>
              </Group>
              {selectedOpp.providerQuotes?.map(p => (
                <Paper key={p.id} withBorder p="md" mb="sm">
                  <Group position="apart">
                    <div>
                      <Text fw={700}>{p.name}</Text>
                      <Text>Precio: {p.price} {p.currency} | Envío: {p.shippingCost || 0} {p.currency}</Text>
                      <Text size="sm" c="blue">Costo Total: {((p.price || 0) + (p.shippingCost || 0)).toFixed(2)} {p.currency}</Text>
                      {p.savedExchangeRate && (
                        <Text size="xs" c="dimmed">TC guardado: {p.savedExchangeRate}</Text>
                      )}
                    </div>
                    <Group>
                      <ActionIcon color="blue" onClick={() => { setFormState(p); openProviderModal(); }}>
                        <Edit size={16} />
                      </ActionIcon>
                      <ActionIcon color="red" onClick={() => handleDeleteItem('provider', p.id)}>
                        <Trash2 size={16} />
                      </ActionIcon>
                    </Group>
                  </Group>
                </Paper>
              ))}
            </Tabs.Panel>
            <Tabs.Panel value="competitors" pt="xs">
              <Group position="apart" mb="md">
                <Title order={4}>Competidores ({selectedOpp.competitorAnalysis?.length || 0})</Title>
                <Button onClick={() => { setFormState({}); openCompetitorModal(); }}>Agregar Competidor</Button>
              </Group>
              {selectedOpp.competitorAnalysis?.map(c => (
                <Paper key={c.id} withBorder p="md" mb="sm">
                  <Group position="apart">
                    <div>
                      <Text fw={700}>{c.name}</Text>
                      <Text>Precio Venta: S/ {c.salePrice}</Text>
                      {c.competitorLink && (
                        <Text size="sm" c="blue">
                          <a href={c.competitorLink} target="_blank" rel="noopener noreferrer">Ver sitio web</a>
                        </Text>
                      )}
                      {c.phoneNumber && (
                        <Text size="sm" c="dimmed">Tel: {c.phoneNumber}</Text>
                      )}
                      {c.notes && (
                        <Text size="sm" c="dimmed">Notas: {c.notes}</Text>
                      )}
                    </div>
                    <Group>
                      <ActionIcon color="blue" onClick={() => { setFormState(c); openCompetitorModal(); }}>
                        <Edit size={16} />
                      </ActionIcon>
                      <ActionIcon color="red" onClick={() => handleDeleteItem('competitor', c.id)}>
                        <Trash2 size={16} />
                      </ActionIcon>
                    </Group>
                  </Group>
                </Paper>
              ))}
            </Tabs.Panel>
            <Tabs.Panel value="analysis" pt="xs">
              {rateLoading && <Loader />}
              {!rateLoading && analysisData.bestProvider ? (
                <>
                  <Paper withBorder p="md" mb="md" style={{backgroundColor: '#e6f7ff'}}>
                    <Group position="apart">
                      <div>
                        <Text fw={700}>Proveedor Recomendado: {analysisData.bestProvider.name}</Text>
                        <Text>Costo Total en PEN: S/ {analysisData.bestProviderCostPEN.toFixed(2)}</Text>
                        <Text size="sm" c="dimmed">
                          (Incluye precio + envío: {((analysisData.bestProvider.price || 0) + (analysisData.bestProvider.shippingCost || 0)).toFixed(2)} {analysisData.bestProvider.currency})
                        </Text>
                        <Group spacing="xs">
                          <Text size="sm" c="dimmed">TC actual: {exchangeRate}</Text>
                          <Tooltip label="Actualizar tipo de cambio">
                            <ActionIcon 
                              size="xs" 
                              variant="subtle" 
                              onClick={refreshRate}
                              loading={rateLoading}
                              color="blue"
                            >
                              <RefreshCw size={14} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </div>
                      <Button 
                        size="xs" 
                        variant="outline" 
                        onClick={refreshRate}
                        loading={rateLoading}
                        leftIcon={<RefreshCw size={16} />}
                      >
                        Actualizar TC
                      </Button>
                    </Group>
                  </Paper>
                  <Title order={5} mb="sm">Escenarios de Pricing</Title>
                  {analysisData.scenarios.map(s => (
                    <Paper key={s.name} withBorder p="sm" mb="xs">
                      <Group position="apart">
                        <Text>{s.name}</Text>
                        <Text>Precio Venta: S/ {s.price.toFixed(2)}</Text>
                        <Text>Margen: <Badge color={parseFloat(s.margin) > 0 ? 'green' : 'red'}>{s.margin}</Badge></Text>
                      </Group>
                    </Paper>
                  ))}
                  <Paper withBorder p="xl" mt="xl" style={{backgroundColor: analysisData.recommendation === 'APROBAR' ? '#f6ffed' : '#fff1f0'}}>
                    <Group position="apart">
                      <Title order={3}>RECOMENDACIÓN: {analysisData.recommendation}</Title>
                      <Title order={3}>{analysisData.finalMargin.toFixed(1)}%</Title>
                    </Group>
                    <Text>Margen Óptimo con Proveedor Recomendado (Costo Total + Envío)</Text>
                    <Group position="right" mt="lg">
                      <Button color="green" size="lg" onClick={handleApprove}>APROBAR OPORTUNIDAD</Button>
                    </Group>
                  </Paper>
                </>
              ) : <Text>Añada al menos un proveedor para ver el análisis.</Text>}
            </Tabs.Panel>
          </Tabs>
        ) : <Loader />}
      </Modal>
      
      <Modal opened={providerModalOpened} onClose={closeProviderModal} title={formState.id ? "Editar Proveedor" : "Añadir Proveedor"}>
        <form onSubmit={handleSaveProvider}>
          <TextInput name="name" label="Nombre" onChange={handleFormChange} value={formState.name || ''} required />
          <TextInput name="referenceLink" label="Link de Referencia (Opcional)" icon={<LinkIcon size={14} />} onChange={handleFormChange} value={formState.referenceLink || ''} mt="md" />
          <Group grow mt="md">
            <NumberInput name="price" label="Precio" onChange={(val) => setFormState(p => ({...p, price: val}))} value={formState.price || 0} precision={2} required />
            <Select label="Moneda" data={['USD', 'PEN']} defaultValue="USD" onChange={(val) => setFormState(p => ({...p, currency: val}))} value={formState.currency || 'USD'} />
          </Group>
          <NumberInput name="shippingCost" label="Costo Envío" onChange={(val) => setFormState(p => ({...p, shippingCost: val}))} value={formState.shippingCost || 0} precision={2} mt="md" />
          <Button type="submit" mt="md" fullWidth>Guardar</Button>
        </form>
      </Modal>
      
      <Modal opened={competitorModalOpened} onClose={closeCompetitorModal} title={formState.id ? "Editar Competidor" : "Añadir Competidor"}>
        <form onSubmit={handleSaveCompetitor}>
          <TextInput name="name" label="Nombre del Competidor" onChange={handleFormChange} value={formState.name || ''} required />
          <NumberInput name="salePrice" label="Precio de Venta (PEN)" onChange={(val) => setFormState(p => ({...p, salePrice: val}))} value={formState.salePrice || 0} precision={2} mt="md" required />
          <TextInput name="competitorLink" label="Link del Competidor (Opcional)" icon={<LinkIcon size={14} />} onChange={handleFormChange} value={formState.competitorLink || ''} mt="md" />
          <TextInput name="phoneNumber" label="Número de Teléfono (Opcional)" onChange={handleFormChange} value={formState.phoneNumber || ''} mt="md" />
          <TextInput name="notes" label="Notas (Opcional)" onChange={handleFormChange} value={formState.notes || ''} mt="md" />
          <Button type="submit" mt="md" fullWidth>Guardar</Button>
        </form>
      </Modal>

      <Paper withBorder shadow="md" p="md" mt="xl">
        <Title order={3} mb="md">Bandeja de Entrada: Requerimientos por Revisar</Title>
        {reqsLoading ? <Loader /> : (
            <Table>
                <thead><tr><th>Origen</th><th># Items Pendientes</th><th>Acción</th></tr></thead>
                <tbody>
                    {pendingRequirements && pendingRequirements.length > 0 ? (
                      pendingRequirements.map(req => (
                        <tr key={req.id}>
                            <td>{req.source || 'N/A'}</td>
                            <td><Badge>{req.items?.filter(i => i.status === 'pending_review' || i.status === 'classified').length || 0}</Badge></td>
                            <td><Button size="xs" onClick={() => handleOpenReviewModal(req)}>Revisar y Clasificar</Button></td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={3}><Text align="center" p="md">No hay nuevos requerimientos.</Text></td></tr>
                    )}
                </tbody>
            </Table>
        )}
      </Paper>
      <Divider my="xl" />
      <Paper withBorder shadow="md" p="md" mt="xl">
        <Title order={3} mb="md">Oportunidades en Proceso de Análisis</Title>
        {oppsLoading ? <Loader /> : (
            <Table>
                <thead><tr><th>Producto</th><th>Origen</th><th>Objetivo Final</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>
                    {opportunities && opportunities.length > 0 ? (
                      opportunities.map(opp => (
                        <tr key={opp.id}>
                            <td>{opp.productName || 'Sin Nombre'}</td>
                            <td><Badge color="cyan">{opp.source || 'N/A'}</Badge></td>
                            <td><Badge color="purple">{opp.endGoal || 'N/A'}</Badge></td>
                            <td><Badge color={opp.status?.includes('approved') ? 'green' : 'blue'}>{opp.status || 'Sin Estado'}</Badge></td>
                            <td><Button size="xs" variant="outline" onClick={() => handleOpenAnalysisModal(opp)}>Ver Dashboard</Button></td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={5}><Text align="center" p="md">No hay oportunidades en proceso.</Text></td></tr>
                    )}
                </tbody>
            </Table>
        )}
      </Paper>
    </div>
  );
};

export default OpportunityManagement;