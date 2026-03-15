import { prisma, type InvoiceStatus } from '@botttle/db';

function nextNumber(): string {
  return `INV-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export const invoiceRepository = {
  findById(id: string) {
    return prisma.invoice.findUnique({
      where: { id },
      include: {
        project: { include: { client: true } },
        items: true,
        payments: true,
      },
    });
  },

  findByProjectId(projectId: string) {
    return prisma.invoice.findMany({
      where: { projectId },
      include: { project: true, _count: { select: { payments: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  findManyForAdmin() {
    return prisma.invoice.findMany({
      include: { project: { include: { client: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  findManyByClientId(clientId: string) {
    return prisma.invoice.findMany({
      where: { project: { clientId } },
      include: { project: { include: { client: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(data: {
    projectId: string;
    number?: string;
    dueDate: Date;
    currency: string;
    taxRate: number;
    subtotal: number;
    total: number;
    status?: InvoiceStatus;
    items: { description: string; quantity: number; unitPrice: number; amount: number }[];
  }) {
    const number = data.number ?? nextNumber();
    const invoice = await prisma.invoice.create({
      data: {
        projectId: data.projectId,
        number,
        dueDate: data.dueDate,
        currency: data.currency,
        taxRate: data.taxRate,
        subtotal: data.subtotal,
        total: data.total,
        status: (data.status ?? 'DRAFT') as InvoiceStatus,
      },
    });
    await prisma.invoiceItem.createMany({
      data: data.items.map((item) => ({
        invoiceId: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
      })),
    });
    return this.findById(invoice.id);
  },

  updateStatus(id: string, status: InvoiceStatus) {
    return prisma.invoice.update({
      where: { id },
      data: { status },
      include: { project: true, items: true, payments: true },
    });
  },

  addPayment(data: {
    invoiceId: string;
    amount: number;
    status: string;
    paidAt?: Date | null;
    externalId?: string | null;
  }) {
    return prisma.payment.create({
      data: {
        invoiceId: data.invoiceId,
        amount: data.amount,
        status: data.status as 'PENDING' | 'COMPLETED' | 'FAILED',
        paidAt: data.paidAt ?? null,
        externalId: data.externalId ?? null,
      },
      include: { invoice: true },
    });
  },
};
