import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import {
  fetchProjects,
  createInvoice,
  type Project,
} from '@/lib/api';

type LineItem = { description: string; quantity: string; unitPrice: string };

const defaultItem: LineItem = { description: '', quantity: '1', unitPrice: '' };

export function InvoiceCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const [projectId, setProjectId] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [taxRate, setTaxRate] = useState('0');
  const [items, setItems] = useState<LineItem[]>([{ ...defaultItem }]);

  const { data: projectsRes } = useQuery({
    queryKey: ['projects'],
    queryFn: () => fetchProjects(),
    enabled: isAdmin,
  });
  const projects = projectsRes?.success ? projectsRes.data : [];

  const createMutation = useMutation({
    mutationFn: (body: {
      projectId: string;
      dueDate: string;
      currency: string;
      taxRate: number;
      items: { description: string; quantity: number; unitPrice: number }[];
    }) => createInvoice(body),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        navigate(`/invoices/${res.data.id}`);
      }
    },
  });

  const addRow = () => setItems((prev) => [...prev, { ...defaultItem }]);
  const removeRow = (i: number) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  const updateRow = (i: number, field: keyof LineItem, value: string) =>
    setItems((prev) =>
      prev.map((row, idx) => (idx === i ? { ...row, [field]: value } : row))
    );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tax = parseFloat(taxRate) || 0;
    const lineItems = items
      .map((row) => ({
        description: row.description.trim(),
        quantity: parseFloat(row.quantity) || 0,
        unitPrice: parseFloat(row.unitPrice) || 0,
      }))
      .filter((row) => row.description && row.quantity > 0 && row.unitPrice >= 0);
    if (!projectId || lineItems.length === 0) return;
    createMutation.mutate({
      projectId,
      dueDate: new Date(dueDate).toISOString(),
      currency: 'USD',
      taxRate: tax,
      items: lineItems,
    });
  };

  if (!isAdmin) {
    return (
      <div className="text-foreground-muted">
        Only admins can create invoices.{' '}
        <Link to="/invoices" className="text-primary hover:underline">Back to invoices</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">New invoice</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="project" className="mb-1 block text-sm font-medium text-foreground">
              Project
            </label>
            <select
              id="project"
              required
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded border border-border bg-background px-3 py-2 text-foreground"
            >
              <option value="">Select project</option>
              {projects.map((p: Project) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                  {p.client ? ` — ${p.client.name}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dueDate" className="mb-1 block text-sm font-medium text-foreground">
              Due date
            </label>
            <input
              id="dueDate"
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded border border-border bg-background px-3 py-2 text-foreground"
            />
          </div>
        </div>

        <div className="w-24">
          <label htmlFor="taxRate" className="mb-1 block text-sm font-medium text-foreground">
            Tax rate (%)
          </label>
          <input
            id="taxRate"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
            className="w-full rounded border border-border bg-background px-3 py-2 text-foreground"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Line items</label>
            <button
              type="button"
              onClick={addRow}
              className="text-sm text-primary hover:underline"
            >
              + Add row
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-foreground-muted">
                  <th className="p-2 font-medium">Description</th>
                  <th className="w-20 p-2 font-medium text-right">Qty</th>
                  <th className="w-28 p-2 font-medium text-right">Unit price</th>
                  <th className="w-12 p-2" aria-label="Remove" />
                </tr>
              </thead>
              <tbody>
                {items.map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="p-2">
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) => updateRow(i, 'description', e.target.value)}
                        placeholder="Description"
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-foreground"
                      />
                    </td>
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.quantity}
                        onChange={(e) => updateRow(i, 'quantity', e.target.value)}
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-right text-foreground"
                      />
                    </td>
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.unitPrice}
                        onChange={(e) => updateRow(i, 'unitPrice', e.target.value)}
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-right text-foreground"
                      />
                    </td>
                    <td className="p-2">
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        className="text-foreground-muted hover:text-destructive"
                        aria-label="Remove row"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-subtle hover:bg-primary-hover disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating…' : 'Create invoice'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
