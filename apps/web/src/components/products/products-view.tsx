'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { apiRequest } from '@/lib/api-client';
import { buildQueryString } from '@/lib/query';
import { formatCurrency, formatDateTime } from '@/lib/utils';

type Branch = { id: string; name: string };
type Category = { id: string; name: string };
type Product = {
  id: string;
  branchId?: string | null;
  code: string;
  name: string;
  stock: number;
  minStock: number;
  costPrice: string | number;
  salePrice: string | number;
  supplier?: string | null;
  status: string;
  category: { id: string; name: string };
  branch?: { id: string; name: string } | null;
};
type StockMovement = { id: string; type: string; quantity: number; previousStock: number; newStock: number; reason?: string | null; createdAt: string; product: { name: string } };

const productDefaults = {
  branchId: '',
  categoryId: '',
  code: '',
  name: '',
  description: '',
  stock: 0,
  minStock: 0,
  costPrice: 0,
  salePrice: 0,
  supplier: '',
  status: 'ACTIVE',
};

const movementDefaults = {
  productId: '',
  branchId: '',
  type: 'PURCHASE',
  quantity: 1,
  reason: '',
};

const saleDefaults = {
  branchId: '',
  productId: '',
  quantity: 1,
  clientId: '',
  paymentMethod: 'CASH',
  paymentReference: '',
};

export function ProductsView() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [branchId, setBranchId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productModal, setProductModal] = useState(false);
  const [movementModal, setMovementModal] = useState(false);
  const [saleModal, setSaleModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const productForm = useForm({ defaultValues: productDefaults });
  const movementForm = useForm({ defaultValues: movementDefaults });
  const saleForm = useForm({ defaultValues: saleDefaults });

  const loadData = async () => {
    const [branchesResponse, categoriesResponse, productsResponse, movementsResponse] = await Promise.all([
      apiRequest<{ data: Branch[] }>('branches'),
      apiRequest<{ data: Category[] }>('products/categories'),
      apiRequest<{ data: Product[] }>(`products${buildQueryString({ branchId, categoryId, status, lowStockOnly, q: query })}`),
      apiRequest<{ data: StockMovement[] }>(`products/stock-movements${buildQueryString({ branchId })}`),
    ]);

    setBranches(branchesResponse.data);
    setCategories(categoriesResponse.data);
    setProducts(productsResponse.data);
    setMovements(movementsResponse.data);

    if (!productForm.watch('branchId') && branchesResponse.data[0]) {
      productForm.setValue('branchId', branchesResponse.data[0].id);
      movementForm.setValue('branchId', branchesResponse.data[0].id);
      saleForm.setValue('branchId', branchesResponse.data[0].id);
    }
    if (!productForm.watch('categoryId') && categoriesResponse.data[0]) {
      productForm.setValue('categoryId', categoriesResponse.data[0].id);
    }
  };

  useEffect(() => {
    loadData().catch((currentError) => setError(currentError.message));
  }, [branchId, categoryId, status, lowStockOnly, query]);

  const openCreate = () => {
    setEditingId(null);
    productForm.reset({
      ...productDefaults,
      branchId: branches[0]?.id ?? '',
      categoryId: categories[0]?.id ?? '',
    });
    setProductModal(true);
  };

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    productForm.reset({
      branchId: product.branchId ?? '',
      categoryId: product.category.id,
      code: product.code,
      name: product.name,
      description: '',
      stock: product.stock,
      minStock: product.minStock,
      costPrice: Number(product.costPrice),
      salePrice: Number(product.salePrice),
      supplier: product.supplier ?? '',
      status: product.status,
    });
    setProductModal(true);
  };

  const submitProduct = productForm.handleSubmit(async (values) => {
    await apiRequest(`products${editingId ? `/${editingId}` : ''}`, {
      method: editingId ? 'PATCH' : 'POST',
      body: JSON.stringify({
        branchId: values.branchId || undefined,
        categoryId: values.categoryId,
        code: values.code,
        name: values.name,
        description: values.description || undefined,
        stock: Number(values.stock),
        minStock: Number(values.minStock),
        costPrice: Number(values.costPrice),
        salePrice: Number(values.salePrice),
        supplier: values.supplier || undefined,
        status: values.status,
      }),
    });

    setProductModal(false);
    productForm.reset(productDefaults);
    await loadData();
  });

  const submitMovement = movementForm.handleSubmit(async (values) => {
    await apiRequest('products/stock-movements', {
      method: 'POST',
      body: JSON.stringify({
        productId: values.productId,
        branchId: values.branchId || undefined,
        type: values.type,
        quantity: Number(values.quantity),
        reason: values.reason || undefined,
      }),
    });
    setMovementModal(false);
    movementForm.reset(movementDefaults);
    await loadData();
  });

  const submitSale = saleForm.handleSubmit(async (values) => {
    await apiRequest('products/sales', {
      method: 'POST',
      body: JSON.stringify({
        branchId: values.branchId,
        clientId: values.clientId || undefined,
        items: [
          {
            productId: values.productId,
            quantity: Number(values.quantity),
          },
        ],
        paymentMethod: values.paymentMethod || undefined,
        paymentReference: values.paymentReference || undefined,
      }),
    });
    setSaleModal(false);
    saleForm.reset(saleDefaults);
    await loadData();
  });

  const removeProduct = async (id: string) => {
    if (!window.confirm('Se dara de baja logica el producto. Continuar?')) return;
    await apiRequest(`products/${id}`, { method: 'DELETE' });
    await loadData();
  };

  const lowStockProducts = useMemo(() => products.filter((product) => product.stock <= product.minStock), [products]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Productos y stock"
        description="Venta interna, alertas de stock bajo y movimientos de inventario trazables."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setMovementModal(true)}>Movimiento</Button>
            <Button variant="secondary" onClick={() => setSaleModal(true)}>Venta</Button>
            <Button onClick={openCreate}>Nuevo producto</Button>
          </div>
        }
      />

      <Card className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Input placeholder="Buscar por codigo, nombre o proveedor" value={query} onChange={(event) => setQuery(event.target.value)} />
        <Select value={branchId} onChange={(event) => setBranchId(event.target.value)}>
          <option value="">Todas las sucursales</option>
          {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </Select>
        <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="">Todas las categorias</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </Select>
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Todos los estados</option>
          <option value="ACTIVE">Activo</option>
          <option value="INACTIVE">Inactivo</option>
          <option value="DISCONTINUED">Discontinuado</option>
        </Select>
        <label className="flex items-center gap-2 rounded-2xl border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-700">
          <input type="checkbox" checked={lowStockOnly} onChange={(event) => setLowStockOnly(event.target.checked)} />
          Solo stock bajo
        </label>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <DataTable columns={['Producto', 'Sucursal', 'Stock', 'Precios', 'Estado', 'Acciones']}>
          {products.length ? (
            products.map((product) => (
              <tr key={product.id}>
                <td className="px-5 py-4">
                  <p className="font-semibold text-ink-900">{product.name}</p>
                  <p className="text-sm text-ink-600">{product.code} · {product.category.name}</p>
                </td>
                <td className="px-5 py-4 text-sm text-ink-600">{product.branch?.name ?? 'Global'}</td>
                <td className="px-5 py-4 text-sm font-semibold text-ink-900">
                  {product.stock} / min {product.minStock}
                  {product.stock <= product.minStock ? <span className="ml-2 rounded-full bg-warning/15 px-2 py-1 text-xs font-semibold text-warning">Bajo</span> : null}
                </td>
                <td className="px-5 py-4 text-sm text-ink-600">
                  Costo {formatCurrency(Number(product.costPrice))}
                  <br />
                  Venta {formatCurrency(Number(product.salePrice))}
                </td>
                <td className="px-5 py-4"><StatusBadge value={product.status} /></td>
                <td className="px-5 py-4">
                  <div className="flex gap-2">
                    <Button variant="secondary" className="px-3 py-2 text-xs" onClick={() => openEdit(product)}>Editar</Button>
                    <Button variant="ghost" className="px-3 py-2 text-xs text-danger" onClick={() => removeProduct(product.id)}>Baja</Button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-5 py-6 text-sm text-ink-500" colSpan={6}>{error ?? 'No hay productos para los filtros actuales.'}</td>
            </tr>
          )}
        </DataTable>

        <Card>
          <h3 className="text-2xl font-bold text-ink-900">Alertas de stock bajo</h3>
          <div className="mt-5 space-y-3">
            {lowStockProducts.length ? (
              lowStockProducts.slice(0, 8).map((product) => (
                <div key={product.id} className="panel-muted flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold text-ink-900">{product.name}</p>
                    <p className="text-sm text-ink-600">{product.code} · {product.branch?.name ?? 'Global'}</p>
                  </div>
                  <p className="font-semibold text-ink-900">{product.stock} / {product.minStock}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink-600">No hay productos por debajo del minimo.</p>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="text-2xl font-bold text-ink-900">Movimientos de stock</h3>
        <DataTable columns={['Fecha', 'Producto', 'Tipo', 'Cantidad', 'Saldo', 'Motivo']}>
          {movements.length ? (
            movements.slice(0, 12).map((movement) => (
              <tr key={movement.id}>
                <td className="px-5 py-4 text-sm text-ink-600">{formatDateTime(movement.createdAt)}</td>
                <td className="px-5 py-4 text-sm font-semibold text-ink-900">{movement.product.name}</td>
                <td className="px-5 py-4 text-sm text-ink-600">{movement.type}</td>
                <td className="px-5 py-4 text-sm text-ink-600">{movement.quantity}</td>
                <td className="px-5 py-4 text-sm text-ink-600">{movement.previousStock} → {movement.newStock}</td>
                <td className="px-5 py-4 text-sm text-ink-600">{movement.reason ?? '-'}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-5 py-6 text-sm text-ink-500" colSpan={6}>Todavia no hay movimientos registrados.</td>
            </tr>
          )}
        </DataTable>
      </Card>

      <Modal open={productModal} title={editingId ? 'Editar producto' : 'Nuevo producto'}>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={submitProduct}>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-700">Sucursal</label>
            <Select {...productForm.register('branchId')}>
              <option value="">Global</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-700">Categoria</label>
            <Select {...productForm.register('categoryId')}>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </Select>
          </div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Codigo</label><Input {...productForm.register('code')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Nombre</label><Input {...productForm.register('name')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Stock inicial</label><Input type="number" {...productForm.register('stock')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Stock minimo</label><Input type="number" {...productForm.register('minStock')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Precio costo</label><Input type="number" {...productForm.register('costPrice')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Precio venta</label><Input type="number" {...productForm.register('salePrice')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Proveedor</label><Input {...productForm.register('supplier')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Estado</label><Select {...productForm.register('status')}><option value="ACTIVE">Activo</option><option value="INACTIVE">Inactivo</option><option value="DISCONTINUED">Discontinuado</option></Select></div>
          <div className="md:col-span-2 flex justify-end gap-3"><Button type="button" variant="ghost" onClick={() => setProductModal(false)}>Cancelar</Button><Button type="submit">{editingId ? 'Guardar cambios' : 'Crear producto'}</Button></div>
        </form>
      </Modal>

      <Modal open={movementModal} title="Movimiento de stock">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={submitMovement}>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Producto</label><Select {...movementForm.register('productId')}>{products.map((product) => <option key={product.id} value={product.id}>{product.code} · {product.name}</option>)}</Select></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Sucursal</label><Select {...movementForm.register('branchId')}><option value="">Automatica</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Tipo</label><Select {...movementForm.register('type')}><option value="PURCHASE">Ingreso por compra</option><option value="RETURN">Devolucion</option><option value="INITIAL">Inicial</option><option value="ADJUSTMENT">Ajuste</option><option value="LOSS">Merma</option><option value="SALE">Venta</option></Select></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Cantidad</label><Input type="number" {...movementForm.register('quantity')} /></div>
          <div className="md:col-span-2"><label className="mb-2 block text-sm font-medium text-ink-700">Motivo</label><Input {...movementForm.register('reason')} /></div>
          <div className="md:col-span-2 flex justify-end gap-3"><Button type="button" variant="ghost" onClick={() => setMovementModal(false)}>Cancelar</Button><Button type="submit">Registrar movimiento</Button></div>
        </form>
      </Modal>

      <Modal open={saleModal} title="Registrar venta interna">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={submitSale}>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Sucursal</label><Select {...saleForm.register('branchId')}>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Producto</label><Select {...saleForm.register('productId')}>{products.map((product) => <option key={product.id} value={product.id}>{product.code} · {product.name}</option>)}</Select></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Cantidad</label><Input type="number" {...saleForm.register('quantity')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Cliente opcional</label><Input placeholder="ID cliente" {...saleForm.register('clientId')} /></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Metodo de pago</label><Select {...saleForm.register('paymentMethod')}><option value="CASH">Efectivo</option><option value="BANK_TRANSFER">Transferencia</option><option value="DEBIT_CARD">Debito</option><option value="CREDIT_CARD">Credito</option><option value="DIGITAL_WALLET">Billetera virtual</option><option value="OTHER">Otro</option></Select></div>
          <div><label className="mb-2 block text-sm font-medium text-ink-700">Referencia</label><Input {...saleForm.register('paymentReference')} /></div>
          <div className="md:col-span-2 flex justify-end gap-3"><Button type="button" variant="ghost" onClick={() => setSaleModal(false)}>Cancelar</Button><Button type="submit">Registrar venta</Button></div>
        </form>
      </Modal>
    </div>
  );
}
