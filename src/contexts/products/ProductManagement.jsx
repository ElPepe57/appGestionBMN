import React, { useState, useMemo } from 'react';
import {
  Title,
  Button,
  Modal,
  TextInput,
  Textarea,
  NumberInput,
  Group,
  Table,
  Loader,
  Text,
  Paper,
  Divider,
  Accordion,
  Badge,
  Select,
  List,
  ThemeIcon,
  ActionIcon,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { collection, addDoc, serverTimestamp, doc, updateDoc, where, query, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase-config.js';
import { useFirestore } from '../../shared/hooks/useFirestore.js';
import { Plus, Tag, Layers, Trash2 } from 'lucide-react';

const ProductManagement = ({ onProductSelect }) => {
  const [productModalOpened, { open: openProductModal, close: closeProductModal }] = useDisclosure(false);
  const [skuModalOpened, { open: openSkuModal, close: closeSkuModal }] = useDisclosure(false);
  const [brandModalOpened, { open: openBrandModal, close: closeBrandModal }] = useDisclosure(false);
  const [categoryModalOpened, { open: openCategoryModal, close: closeCategoryModal }] = useDisclosure(false);

  const [currentProduct, setCurrentProduct] = useState(null);
  const [activatingCandidate, setActivatingCandidate] = useState(null);

  const { data: categories, loading: categoriesLoading } = useFirestore('categories');
  const { data: products, loading: productsLoading } = useFirestore('products');
  const { data: skus, loading: skusLoading } = useFirestore('skus');
  const { data: brands, loading: brandsLoading } = useFirestore('brands');
  const { data: candidates, loading: candidatesLoading } = useFirestore('opportunities', [
    where('status', '==', 'approved_for_catalog')
  ]);

  const brandOptions = useMemo(() => brands.map(b => ({ value: b.id, label: b.name })), [brands]);
  const categoryOptions = useMemo(() => categories.map(c => ({ value: c.id, label: c.name })), [categories]);

  // --- CRUD Handlers ---
  const handleCreateCategory = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const categoryName = form.categoryName.value;
    if (!categoryName) return;
    try {
      await addDoc(collection(db, 'categories'), { name: categoryName });
      alert(`Categoría "${categoryName}" creada.`);
      form.reset();
    } catch (e) { console.error(e); alert("Error al crear categoría."); }
  };
  
  const handleCreateProduct = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const selectedCategoryId = formData.get('categoryId');
    const selectedCategory = categories.find(c => c.id === selectedCategoryId);
    if (!selectedCategory) { alert("Selecciona una categoría válida."); return; }

    const productData = {
      name: formData.get('name'),
      description: formData.get('description'),
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      createdAt: serverTimestamp(),
    };
    try {
      await addDoc(collection(db, 'products'), productData);
      alert('Familia de Producto creada con éxito.');
      closeProductModal();
    } catch (e) { console.error(e); alert("Error al crear producto."); }
  };

  const handleCreateSku = async (event) => {
    event.preventDefault();
    if (!currentProduct) return;
    const formData = new FormData(event.currentTarget);
    const selectedBrandId = formData.get('brandId');
    const selectedBrand = brands.find(b => b.id === selectedBrandId);
    if (!selectedBrand) { alert("Selecciona una marca válida."); return; }

    const skuData = {
      productId: currentProduct.id,
      productName: currentProduct.name,
      categoryId: currentProduct.categoryId,
      categoryName: currentProduct.categoryName,
      brandId: selectedBrand.id,
      brandName: selectedBrand.name,
      skuCode: formData.get('skuCode'),
      fullName: `${currentProduct.name} ${selectedBrand.name} ${formData.get('presentation')} ${formData.get('dosage')} - ${formData.get('quantity')} un.`,
      attributes: {
        presentation: formData.get('presentation'),
        dosage: formData.get('dosage'),
        quantity: Number(formData.get('quantity')),
      },
      stock: {
        en_almacen_us: 0,
        en_transito_peru: 0,
        la_victoria: 0,
        smp: 0,
      },
      salePrice: Number(formData.get('salePrice')),
      purchasePrice: Number(formData.get('purchasePrice')),
      createdAt: serverTimestamp(),
      active: true,
      origin: activatingCandidate ? { type: 'opportunity', id: activatingCandidate.id } : { type: 'manual' }
    };
    try {
      await addDoc(collection(db, 'skus'), skuData);
      if (activatingCandidate) {
        const oppRef = doc(db, 'opportunities', activatingCandidate.id);
        await updateDoc(oppRef, { status: 'catalogued' });
        setActivatingCandidate(null);
      }
      alert('Variación (SKU) creada con éxito.');
      closeSkuModal();
    } catch (e) { console.error(e); alert("Error al crear SKU."); }
  };

  const handleCreateBrand = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const brandName = form.brandName.value;
    if (!brandName) return;
    try {
      await addDoc(collection(db, 'brands'), { name: brandName });
      alert(`Marca "${brandName}" creada.`);
      form.reset();
    } catch (e) { console.error(e); alert("Error al crear marca."); }
  };

  const handleActivateCandidate = async (candidate) => {
    const productQuery = query(collection(db, 'products'), where('name', '==', candidate.productName));
    const querySnapshot = await getDocs(productQuery);
    let productToUse = null;

    if (querySnapshot.empty) {
      alert(`La familia de producto "${candidate.productName}" no existe. Por favor, créala primero y asígnale una categoría.`);
      openProductModal();
      return;
    } else {
      const doc = querySnapshot.docs[0];
      productToUse = { id: doc.id, ...doc.data() };
    }
    
    setActivatingCandidate(candidate);
    setCurrentProduct(productToUse);
    openSkuModal();
  };

  const openAddSkuModal = (product) => {
    setActivatingCandidate(null);
    setCurrentProduct(product);
    openSkuModal();
  };

  const handleDelete = async (collectionName, docId, dependencyCheck, dependencyName) => {
    if (dependencyCheck()) {
      alert(`No se puede eliminar. Todavía hay ${dependencyName} que dependen de este elemento.`);
      return;
    }
    if (window.confirm(`¿Estás seguro de que quieres eliminar este elemento? Esta acción no se puede deshacer.`)) {
      try {
        await deleteDoc(doc(db, collectionName, docId));
        alert('Elemento eliminado con éxito.');
      } catch (e) {
        console.error("Error al eliminar:", e);
        alert("Hubo un error al eliminar el elemento.");
      }
    }
  };

  const handleDeleteCategory = (categoryId) => {
    handleDelete('categories', categoryId, () => products.some(p => p.categoryId === categoryId), 'productos');
  };

  const handleDeleteProduct = (productId) => {
    handleDelete('products', productId, () => skus.some(s => s.productId === productId), 'SKUs');
  };

  const handleDeleteBrand = (brandId) => {
    handleDelete('brands', brandId, () => skus.some(s => s.brandId === brandId), 'SKUs');
  };

  const handleDeleteSku = (skuId) => {
    handleDelete('skus', skuId, () => false, '');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Title order={1} mb="lg" className="text-blue-700 font-bold">Gestión de Productos y Variaciones (SKUs)</Title>

      {/* Modales */}
      <Modal opened={categoryModalOpened} onClose={closeCategoryModal} title="Gestionar Categorías">
        <Paper p="md">
          <form onSubmit={handleCreateCategory}>
            <Group>
              <TextInput name="categoryName" label="Nueva Categoría" placeholder="Ej: Vitaminas y Minerales" required style={{ flex: 1 }} />
              <Button type="submit" mt="xl">Añadir</Button>
            </Group>
          </form>
          <Divider my="lg" label="Categorías Existentes" />
          <List spacing="xs" size="sm">
            {brandsLoading && <Loader size="xs" />}
            {categories.map(cat => (
              <List.Item key={cat.id} icon={<ThemeIcon color="grape" size={24} radius="xl"><Layers size={16} /></ThemeIcon>}>
                <Group position="apart">
                  <span>{cat.name}</span>
                  <ActionIcon color="red" size="sm" onClick={() => handleDeleteCategory(cat.id)}><Trash2 size={14} /></ActionIcon>
                </Group>
              </List.Item>
            ))}
          </List>
        </Paper>
      </Modal>
      <Modal opened={productModalOpened} onClose={closeProductModal} title="Crear Nueva Familia de Producto">
        <form onSubmit={handleCreateProduct}>
          <Select name="categoryId" label="Categoría" placeholder="Selecciona una categoría" data={categoryOptions} searchable required />
          <TextInput name="name" label="Nombre del Producto (Familia)" placeholder="Ej: Melatonina" mt="md" required />
          <Textarea name="description" label="Descripción General" placeholder="Suplemento para el sueño" mt="md" />
          <Button type="submit" fullWidth mt="lg">Guardar Familia</Button>
        </form>
      </Modal>
      <Modal opened={skuModalOpened} onClose={closeSkuModal} title={`Añadir Variación a: ${currentProduct?.name}`}>
        <form onSubmit={handleCreateSku}>
          <Select name="brandId" label="Marca" placeholder="Selecciona una marca" data={brandOptions} searchable required />
          <TextInput name="skuCode" label="Código SKU" placeholder="Ej: NAT-MEL-5-200T" mt="md" required />
          <Group grow mt="md">
            <TextInput name="presentation" label="Presentación" placeholder="Tabletas, Gomitas..." required />
            <TextInput name="dosage" label="Dosis" placeholder="5mg, 10mg..." required />
            <NumberInput name="quantity" label="Unidades" placeholder="200" required />
          </Group>
          <Divider my="lg" />
          <Group grow>
            <NumberInput name="purchasePrice" label="Precio de Compra (S/.)" precision={2} required />
            <NumberInput name="salePrice" label="Precio de Venta (S/.)" precision={2} required />
          </Group>
          <Button type="submit" fullWidth mt="lg">Guardar Variación (SKU)</Button>
        </form>
      </Modal>
      <Modal opened={brandModalOpened} onClose={closeBrandModal} title="Gestionar Marcas">
        <Paper p="md">
          <form onSubmit={handleCreateBrand}>
            <Group>
              <TextInput name="brandName" label="Nueva Marca" placeholder="Ej: Doctor's Best" required style={{ flex: 1 }} />
              <Button type="submit" mt="xl">Añadir</Button>
            </Group>
          </form>
          <Divider my="lg" label="Marcas Existentes" />
          <List spacing="xs" size="sm">
            {brandsLoading && <Loader size="xs" />}
            {brands.map(brand => (
              <List.Item key={brand.id} icon={<ThemeIcon color="blue" size={24} radius="xl"><Tag size={16} /></ThemeIcon>}>
                <Group position="apart">
                  <span>{brand.name}</span>
                  <ActionIcon color="red" size="sm" onClick={() => handleDeleteBrand(brand.id)}><Trash2 size={14} /></ActionIcon>
                </Group>
              </List.Item>
            ))}
          </List>
        </Paper>
      </Modal>

      {/* Botones de gestión */}
      <Group mb="md">
        <Button onClick={openCategoryModal} color="grape">Gestionar Categorías</Button>
        <Button onClick={openProductModal} color="blue">Crear Familia de Producto</Button>
        <Button variant="outline" onClick={openBrandModal} color="blue">Gestionar Marcas</Button>
      </Group>

      {/* Candidatos para catálogo */}
      <Paper withBorder shadow="md" p="md" mt="xl" mb="xl" className="rounded-lg">
        <Title order={3} mb="md">Candidatos para Catálogo (Oportunidades Aprobadas)</Title>
        {candidatesLoading && <Loader />}
        {!candidatesLoading && (
          <Table striped highlightOnHover className="text-sm">
            <thead className="bg-blue-100">
              <tr>
                <th className="px-4 py-2">Producto Candidato</th>
                <th className="px-4 py-2">Origen</th>
                <th className="px-4 py-2">Acción</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map(candidate => (
                <tr key={candidate.id}>
                  <td>{candidate.productName}</td>
                  <td><Badge color="yellow">{candidate.source}</Badge></td>
                  <td>
                    <Button size="xs" onClick={() => handleActivateCandidate(candidate)} color="blue">
                      Crear SKU desde Oportunidad
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {!candidatesLoading && candidates.length === 0 && <Text mt="md">No hay oportunidades internas aprobadas pendientes de activación.</Text>}
      </Paper>
      
      {/* Catálogo por categoría */}
      <Paper withBorder shadow="md" p="md" mt="xl" className="rounded-lg">
        <Title order={3} mb="md">Catálogo por Categoría</Title>
        {(categoriesLoading || productsLoading || skusLoading || brandsLoading) && <Loader />}
        
        <Accordion variant="separated">
          {categories.map(category => (
            <Accordion.Item value={category.name} key={category.id}>
              <Accordion.Control>
                <Group position="apart">
                  <Group>
                    <Layers size={18} />
                    <Text fw={700}>{category.name}</Text>
                  </Group>
                  <ActionIcon color="red" size="sm" onClick={(e) => {e.stopPropagation(); handleDeleteCategory(category.id);}}>
                    <Trash2 size={14} />
                  </ActionIcon>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Accordion variant="contained" radius="md">
                  {products.filter(p => p.categoryId === category.id).map(product => (
                    <Accordion.Item value={product.name} key={product.id}>
                      <Accordion.Control>
                        <Group position="apart">
                          <span>{product.name}</span>
                          <ActionIcon color="red" size="sm" onClick={(e) => {e.stopPropagation(); handleDeleteProduct(product.id);}}>
                            <Trash2 size={14} />
                          </ActionIcon>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Button size="xs" variant="light" leftIcon={<Plus size={14} />} onClick={() => openAddSkuModal(product)} mb="md" color="blue">
                          Añadir Variación (SKU)
                        </Button>
                        <Table striped highlightOnHover className="text-sm">
                          <thead className="bg-blue-50">
                            <tr>
                              <th className="px-4 py-2">Nombre Completo (SKU)</th>
                              <th className="px-4 py-2">Marca</th>
                              <th className="px-4 py-2">Código SKU</th>
                              <th className="px-4 py-2">Precio Venta</th>
                              <th className="px-4 py-2">Stock Disponible</th>
                              <th className="px-4 py-2">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {skus.filter(sku => sku.productId === product.id).map(sku => {
                              const stock = sku.stock || {};
                              const availableForSale = (stock.la_victoria || 0) + (stock.smp || 0);
                              return (
                                <tr key={sku.id} onClick={() => onProductSelect(sku.id)} style={{cursor: 'pointer'}}>
                                  <td>{sku.fullName}</td>
                                  <td><Badge>{sku.brandName}</Badge></td>
                                  <td>{sku.skuCode}</td>
                                  <td>S/ {sku.salePrice ? sku.salePrice.toFixed(2) : '0.00'}</td>
                                  <td>{availableForSale}</td>
                                  <td>
                                    <ActionIcon color="red" size="sm" onClick={(e) => {e.stopPropagation(); handleDeleteSku(sku.id);}}>
                                      <Trash2 size={14} />
                                    </ActionIcon>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </Table>
                      </Accordion.Panel>
                    </Accordion.Item>
                  ))}
                </Accordion>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Paper>
    </div>
  );
};

export default ProductManagement;