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
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/api-client';
import { buildQueryString } from '@/lib/query';
import { formatCurrency, formatDateOnly } from '@/lib/utils';

type Branch = { id: string; name: string };
type ExpenseCategory = { id: string; name: string; parent?: { name: string } | null };
type ExpenseItem = {
  id: string;
  description: string;
  amount: string | number;
  expenseDate: string;
  method: string;
  status: string;
  supplier?: string | null;
  notes?: string | null;
  receiptUrl?: string | null;
  category: { id: string; name: string; parent?: { name: string } | null };
  branch: { id: string; name: string };
};

type ExpenseSummaryItem = {
  categoryId: string;
  categoryName: string;
  parentCategoryName?: string | null;
  totalAmount: number;
  count: number;
};

const defaultValues = {
  branchId: '',
  categoryId: '',
  description: '',
  amount: 0,
  expenseDate: new Date().toISOString().slice(0, 10),
  method: 'CASH',
  supplier: '',
  receiptUrl: '',
  notes: '',
};

export function ExpensesView() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [summary, setSummary] = useState<ExpenseSummaryItem[]>([]);
  const [branchId, setBranchId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, reset, setValue, watch } = useForm({ defaultValues });

  const loadData = async () => {
    const [branchesResponse, categoriesResponse, expensesResponse] = await Promise.all([
      apiRequest<{ data: Branch[] }>('branches'),
      apiRequest<{ data: ExpenseCategory[] }>('expenses/categories'),
      apiRequest<{ data: ExpenseItem[]; summary: ExpenseSummaryItem[] }>(
        `expenses${buildQueryString({ branchId, categoryId, status, q: query })}`,
      ),
    ]);

    setBranches(branchesResponse.data);
    setCategories(categoriesResponse.data);
    setExpenses(expensesResponse.data);
    setSummary(expensesResponse.summary ?? []);

    if (!watch('branchId') && branchesResponse.data[0]) {
      setValue('branchId', branchesResponse.data[0].id);
    }
    if (!watch('categoryId') && categoriesResponse.data[0]) {
      setValue('categoryId', categoriesResponse.data[0].id);
    }
  };

  useEffect(() => {
    loadData().catch((currentError) => setError(currentError.message));
  }, [branchId, categoryId, status, query]);

  const openCreate = () => {
    setEditingId(null);
    reset({
      ...defaultValues,
      branchId: branches[0]?.id ?? '',
      categoryId: categories[0]?.id ?? '',
    });
    setModalOpen(true);
  };

  const openEdit = (expense: ExpenseItem) => {
    setEditingId(expense.id);
    reset({
      branchId: expense.branch.id,
      categoryId: expense.category.id,
      description: expense.description,
      amount: Number(expense.amount),
      expenseDate: expense.expenseDate.slice(0, 10),
      method: expense.method,
      supplier: expense.supplier ?? '',
      receiptUrl: expense.receiptUrl ?? '',
      notes: expense.notes ?? '',
    });
    setModalOpen(true);
  };

  const onSubmit = handleSubmit(async (values) => {
    await apiRequest(`expenses${editingId ? `/${editingId}` : ''}`, {
      method: editingId ? 'PATCH' : 'POST',
      body: JSON.stringify({
        branchId: values.branchId,
        categoryId: values.categoryId,
        description: values.description,
        amount: Number(values.amount),
        expenseDate: values.expenseDate,
        method: values.method,
        supplier: values.supplier || undefined,
        receiptUrl: values.receiptUrl || undefined,
        notes: values.notes || undefined,
      }),
    });

    setModalOpen(false);
    reset(defaultValues);
    await loadData();
  });

  const removeExpense = async (id: string) => {
    if (!window.confirm('Se anulara el gasto seleccionado. Continuar?')) return;
    await apiRequest(`expenses/${id}`, { method: 'DELETE' });
    await loadData();
  };

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ id: category.id, label: category.parent ? `${category.parent.name} / ${category.name}` : category.name })),
    [categories],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Gastos"
        description="Registro de egresos operativos con filtros y resumen rapido por categoria."
        actions={<Button onClick={openCreate}>Nuevo gasto</Button>}
      />

      <Card className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Input placeholder="Buscar descripcion o proveedor" value={query} onChange={(event) => setQuery(event.target.value)} />
        <Select value={branchId} onChange={(event) => setBranchId(event.target.value)}>
          <option value="">Todas las sucursales</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </Select>
        <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="">Todas las categorias</option>
          {categoryOptions.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Todos los estados</option>
          <option value="RECORDED">Registrado</option>
          <option value="CANCELLED">Cancelado</option>
        </Select>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <DataTable columns={['Fecha', 'Descripcion', 'Categoria', 'Sucursal', 'Metodo', 'Monto', 'Estado', 'Acciones']}>
          {expenses.length ? (
            expenses.map((expense) => (
              <tr key={expense.id}>
                <td className="px-5 py-4 text-sm text-ink-600">{formatDateOnly(expense.expenseDate)}</td>
                <td className="px-5 py-4">
                  <p className="font-semibold text-ink-900">{expense.description}</p>
                  <p className="text-sm text-ink-600">{expense.supplier ?? 'Sin proveedor'}</p>
                </td>
                <td className="px-5 py-4 text-sm text-ink-600">{expense.category.parent ? `${expense.category.parent.name} / ${expense.category.name}` : expense.category.name}</td>
                <td className="px-5 py-4 text-sm text-ink-600">{expense.branch.name}</td>
                <td className="px-5 py-4 text-sm text-ink-600">{expense.method}</td>
                <td className="px-5 py-4 text-sm font-semibold text-ink-900">{formatCurrency(Number(expense.amount))}</td>
                <td className="px-5 py-4"><StatusBadge value={expense.status} /></td>
                <td className="px-5 py-4">
                  <div className="flex gap-2">
                    <Button variant="secondary" className="px-3 py-2 text-xs" onClick={() => openEdit(expense)}>Editar</Button>
                    <Button variant="ghost" className="px-3 py-2 text-xs text-danger" onClick={() => removeExpense(expense.id)}>Anular</Button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-5 py-6 text-sm text-ink-500" colSpan={8}>
                {error ?? 'No hay gastos para los filtros actuales.'}
              </td>
            </tr>
          )}
        </DataTable>

        <Card>
          <h3 className="text-2xl font-bold text-ink-900">Resumen por categoria</h3>
          <div className="mt-5 space-y-3">
            {summary.length ? (
              summary.slice(0, 8).map((item) => (
                <div key={item.categoryId} className="panel-muted flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold text-ink-900">{item.parentCategoryName ?? item.categoryName}</p>
                    <p className="text-sm text-ink-600">{item.parentCategoryName ? item.categoryName : `${item.count} movimientos`}</p>
                  </div>
                  <p className="font-semibold text-ink-900">{formatCurrency(item.totalAmount)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink-600">Todavia no hay gastos resumidos.</p>
            )}
          </div>
        </Card>
      </div>

      <Modal open={modalOpen} title={editingId ? 'Editar gasto' : 'Nuevo gasto'}>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-700">Sucursal</label>
            <Select {...register('branchId')}>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-700">Categoria</label>
            <Select {...register('categoryId')}>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-ink-700">Descripcion</label>
            <Input {...register('description')} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-700">Monto</label>
            <Input type="number" {...register('amount')} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-700">Fecha</label>
            <Input type="date" {...register('expenseDate')} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-700">Metodo</label>
            <Select {...register('method')}>
              <option value="CASH">Efectivo</option>
              <option value="BANK_TRANSFER">Transferencia</option>
              <option value="DEBIT_CARD">Debito</option>
              <option value="CREDIT_CARD">Credito</option>
              <option value="DIGITAL_WALLET">Billetera virtual</option>
              <option value="OTHER">Otro</option>
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-700">Proveedor</label>
            <Input {...register('supplier')} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-700">Comprobante URL</label>
            <Input {...register('receiptUrl')} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-ink-700">Observaciones</label>
            <Textarea {...register('notes')} />
          </div>
          <div className="md:col-span-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit">{editingId ? 'Guardar cambios' : 'Registrar gasto'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
