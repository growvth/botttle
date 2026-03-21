import { prisma } from '@botttle/db';

export type ReportsSummary = {
  projectCountByStatus: { status: string; count: number }[];
  invoiceCountByStatus: { status: string; count: number; total: number }[];
  clientCount: number;
  /** Total seconds from completed time entries */
  timeSeconds: {
    total: number;
    billable: number;
    nonBillable: number;
  };
  totalRevenue: number;
  tasks: { completed: number; total: number };
};

export type TimeReportDay = {
  date: string;
  billableSeconds: number;
  nonBillableSeconds: number;
};

export type TimeReportRow = {
  date: string;
  projectId: string;
  projectTitle: string;
  description: string | null;
  seconds: number;
  billable: boolean;
};

function startOfDayUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDaysUtc(d: Date, days: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function toYmdUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildTimeWhere(
  role: string,
  clientId: string | null
): { project?: { clientId: string } } | Record<string, never> {
  if (role === 'ADMIN') return {};
  if (!clientId) return { project: { clientId: '__none__' } };
  return { project: { clientId } };
}

export const reportsService = {
  async summary(role: string, userSub: string): Promise<ReportsSummary> {
    const user = await prisma.user.findUnique({
      where: { id: userSub },
      select: { clientId: true },
    });
    const clientId = user?.clientId ?? null;

    if (role !== 'ADMIN' && !clientId) {
      return {
        projectCountByStatus: [],
        invoiceCountByStatus: [],
        clientCount: 0,
        timeSeconds: { total: 0, billable: 0, nonBillable: 0 },
        totalRevenue: 0,
        tasks: { completed: 0, total: 0 },
      };
    }

    const cid = clientId as string | null;
    const projectWhere = role === 'ADMIN' ? {} : { clientId: cid as string };
    const invoiceWhere = role === 'ADMIN' ? {} : { project: { clientId: cid as string } };
    const timeWhere = buildTimeWhere(role, cid);
    const paymentWhere = {
      status: 'COMPLETED' as const,
      ...(role === 'ADMIN' ? {} : { invoice: { project: { clientId: cid as string } } }),
    };
    const taskWhere =
      role === 'ADMIN'
        ? {}
        : { milestone: { project: { clientId: cid as string } } };

    const [projectGroups, invoiceGroups, billableAgg, nonBillableAgg, payAgg, clientCount, taskTotal, taskDone] =
      await Promise.all([
        prisma.project.groupBy({
          by: ['status'],
          where: projectWhere,
          _count: { _all: true },
        }),
        prisma.invoice.groupBy({
          by: ['status'],
          where: invoiceWhere,
          _count: { _all: true },
          _sum: { total: true },
        }),
        prisma.timeLog.aggregate({
          where: { ...timeWhere, billable: true },
          _sum: { durationSeconds: true },
        }),
        prisma.timeLog.aggregate({
          where: { ...timeWhere, billable: false },
          _sum: { durationSeconds: true },
        }),
        prisma.payment.aggregate({
          where: paymentWhere,
          _sum: { amount: true },
        }),
        role === 'ADMIN' ? prisma.client.count() : Promise.resolve(0),
        prisma.task.count({ where: taskWhere }),
        prisma.task.count({ where: { ...taskWhere, status: 'COMPLETED' } }),
      ]);

    const billable = billableAgg._sum?.durationSeconds ?? 0;
    const nonBillable = nonBillableAgg._sum?.durationSeconds ?? 0;

    return {
      projectCountByStatus: projectGroups.map((r) => ({
        status: r.status,
        count: (r as { _count: { _all: number } })._count._all,
      })),
      invoiceCountByStatus: invoiceGroups.map((r) => ({
        status: r.status,
        count: (r as { _count: { _all: number } })._count._all,
        total: (r as { _sum: { total: number | null } })._sum.total ?? 0,
      })),
      clientCount,
      timeSeconds: {
        total: billable + nonBillable,
        billable,
        nonBillable,
      },
      totalRevenue: payAgg._sum?.amount ?? 0,
      tasks: { completed: taskDone, total: taskTotal },
    };
  },

  async timeReport(
    role: string,
    userSub: string,
    opts: { from: Date; to: Date; projectId?: string }
  ): Promise<{ days: TimeReportDay[]; rows: TimeReportRow[] }> {
    const user = await prisma.user.findUnique({
      where: { id: userSub },
      select: { clientId: true },
    });
    const clientId = user?.clientId ?? null;

    if (role !== 'ADMIN' && !clientId) {
      return { days: [], rows: [] };
    }

    const from = startOfDayUtc(opts.from);
    const toEnd = addDaysUtc(startOfDayUtc(opts.to), 1);

    const baseWhere: {
      startedAt: { gte: Date; lt: Date };
      projectId?: string;
      project?: { clientId: string };
    } = {
      startedAt: { gte: from, lt: toEnd },
    };
    if (opts.projectId) {
      baseWhere.projectId = opts.projectId;
    }
    if (role !== 'ADMIN') {
      baseWhere.project = { clientId: clientId! };
    }

    const logs = await prisma.timeLog.findMany({
      where: baseWhere,
      orderBy: { startedAt: 'asc' },
      include: { project: { select: { id: true, title: true } } },
    });

    const dayMap = new Map<string, { billableSeconds: number; nonBillableSeconds: number }>();
    for (const log of logs) {
      const day = toYmdUtc(log.startedAt);
      const prev = dayMap.get(day) ?? { billableSeconds: 0, nonBillableSeconds: 0 };
      if (log.billable) {
        prev.billableSeconds += log.durationSeconds;
      } else {
        prev.nonBillableSeconds += log.durationSeconds;
      }
      dayMap.set(day, prev);
    }

    const rows: TimeReportRow[] = logs.map((log) => ({
      date: toYmdUtc(log.startedAt),
      projectId: log.projectId,
      projectTitle: log.project.title,
      description: log.description,
      seconds: log.durationSeconds,
      billable: log.billable,
    }));

    const days: TimeReportDay[] = [];
    for (let d = new Date(from); d < toEnd; d = addDaysUtc(d, 1)) {
      const key = toYmdUtc(d);
      const bucket = dayMap.get(key) ?? { billableSeconds: 0, nonBillableSeconds: 0 };
      days.push({
        date: key,
        billableSeconds: bucket.billableSeconds,
        nonBillableSeconds: bucket.nonBillableSeconds,
      });
    }

    return { days, rows };
  },

  timeReportToCsv(rows: TimeReportRow[]): string {
    const header = 'date,project_id,project_title,description,seconds,billable\n';
    const esc = (s: string | null) => {
      if (s == null) return '';
      const t = String(s).replace(/"/g, '""');
      return `"${t}"`;
    };
    const body = rows
      .map(
        (r) =>
          `${r.date},${r.projectId},${esc(r.projectTitle)},${esc(r.description)},${r.seconds},${r.billable ? 'yes' : 'no'}`
      )
      .join('\n');
    return header + body;
  },
};
