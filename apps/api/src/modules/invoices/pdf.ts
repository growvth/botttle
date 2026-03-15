import PDFDocument from 'pdfkit';

type InvoiceWithRelations = {
  number: string;
  status: string;
  dueDate: Date;
  currency: string;
  taxRate: number;
  subtotal: number;
  total: number;
  project?: { title: string; client?: { name: string; email: string | null } } | null;
  items: { description: string; quantity: number; unitPrice: number; amount: number }[];
  payments: { amount: number; status: string }[];
};

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(amount);
}

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export async function generateInvoicePdf(invoice: InvoiceWithRelations): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const primary = '#2276E8';
    const gray = '#6B7280';

    doc.fontSize(24).fillColor(primary).text('INVOICE', { continued: false });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor(gray).text(`# ${invoice.number}`, { continued: false });
    doc.text(`Status: ${invoice.status}`, { continued: false });
    doc.text(`Due: ${formatDate(invoice.dueDate)}`, { continued: false });
    doc.moveDown(1);

    doc.fillColor('black').fontSize(10);
    const client = invoice.project?.client;
    if (client) {
      doc.text('Bill to', { continued: false });
      doc.text(client.name, { continued: false });
      if (client.email) doc.text(client.email, { continued: false });
      doc.moveDown(0.5);
    }
    doc.text(`Project: ${invoice.project?.title ?? '—'}`, { continued: false });
    doc.moveDown(1.5);

    const tableTop = doc.y;
    const colDesc = 50;
    const colQty = 350;
    const colUnit = 400;
    const colAmount = 500;

    doc.fontSize(9).fillColor(gray);
    doc.text('Description', colDesc, tableTop);
    doc.text('Qty', colQty, tableTop);
    doc.text('Unit price', colUnit, tableTop);
    doc.text('Amount', colAmount, tableTop);
    doc.moveTo(50, tableTop + 14).lineTo(550, tableTop + 14).stroke();
    doc.moveDown(0.5);

    let y = tableTop + 22;
    doc.fillColor('black');
    for (const item of invoice.items) {
      doc.fontSize(9).text(item.description.substring(0, 40), colDesc, y);
      doc.text(String(item.quantity), colQty, y);
      doc.text(formatMoney(Number(item.unitPrice), invoice.currency), colUnit, y);
      doc.text(formatMoney(Number(item.amount), invoice.currency), colAmount, y);
      y += 18;
    }
    doc.moveDown(1);

    const summaryLeft = 350;
    let summaryY = y + 10;
    doc.fontSize(9).fillColor(gray);
    doc.text('Subtotal', summaryLeft, summaryY);
    doc.text(formatMoney(Number(invoice.subtotal), invoice.currency), colAmount, summaryY);
    summaryY += 18;
    if (invoice.taxRate > 0) {
      doc.text(`Tax (${invoice.taxRate}%)`, summaryLeft, summaryY);
      const taxAmount = (Number(invoice.subtotal) * Number(invoice.taxRate)) / 100;
      doc.text(formatMoney(taxAmount, invoice.currency), colAmount, summaryY);
      summaryY += 18;
    }
    doc.fillColor('black').fontSize(10);
    doc.text('Total', summaryLeft, summaryY);
    doc.text(formatMoney(Number(invoice.total), invoice.currency), colAmount, summaryY);
    summaryY += 25;

    const totalPaid = invoice.payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((s, p) => s + Number(p.amount), 0);
    if (totalPaid > 0) {
      doc.fontSize(9).fillColor(gray);
      doc.text('Paid', summaryLeft, summaryY);
      doc.text(formatMoney(totalPaid, invoice.currency), colAmount, summaryY);
      summaryY += 18;
      doc.text('Balance', summaryLeft, summaryY);
      doc.text(
        formatMoney(Number(invoice.total) - totalPaid, invoice.currency),
        colAmount,
        summaryY
      );
    }

    doc.end();
  });
}
