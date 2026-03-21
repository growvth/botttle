import { prisma } from '@botttle/db';

export type ClientActivityRow = {
  clientId: string;
  clientName: string;
  comments: number;
  files: number;
};

export type CollaborationFeedItem = {
  type: 'comment' | 'file';
  at: string;
  projectId: string;
  projectTitle: string;
  summary: string;
  actorLabel: string;
};

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
  /** Admin only: comments + file uploads per client in the last 30 days */
  clientActivity30d?: ClientActivityRow[];
  /** Admin only: recent comments and file uploads across projects */
  collaborationFeed?: CollaborationFeedItem[];
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

function clipSummary(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

async function buildClientActivity30d(): Promise<ClientActivityRow[]> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 30);

  const [commentGroups, fileGroups, clients] = await Promise.all([
    prisma.comment.groupBy({
      by: ['projectId'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.projectFile.groupBy({
      by: ['projectId'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.client.findMany({ select: { id: true, name: true } }),
  ]);

  const projectIds = [
    ...new Set([
      ...commentGroups.map((g) => g.projectId),
      ...fileGroups.map((g) => g.projectId),
    ]),
  ];

  const projClient = new Map<string, string>();
  if (projectIds.length > 0) {
    const projects = await prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, clientId: true },
    });
    for (const p of projects) projClient.set(p.id, p.clientId);
  }

  const acc = new Map<string, { comments: number; files: number }>();
  for (const c of clients) acc.set(c.id, { comments: 0, files: 0 });

  for (const g of commentGroups) {
    const cid = projClient.get(g.projectId);
    if (!cid) continue;
    const row = acc.get(cid);
    if (row) row.comments += g._count._all;
  }
  for (const g of fileGroups) {
    const cid = projClient.get(g.projectId);
    if (!cid) continue;
    const row = acc.get(cid);
    if (row) row.files += g._count._all;
  }

  return clients
    .map((c) => {
      const row = acc.get(c.id)!;
      return {
        clientId: c.id,
        clientName: c.name,
        comments: row.comments,
        files: row.files,
      };
    })
    .filter((r) => r.comments + r.files > 0)
    .sort((a, b) => b.comments + b.files - (a.comments + a.files))
    .slice(0, 12);
}

async function buildCollaborationFeed(limit: number): Promise<CollaborationFeedItem[]> {
  const [comments, files] = await Promise.all([
    prisma.comment.findMany({
      take: 24,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        project: { select: { id: true, title: true } },
      },
    }),
    prisma.projectFile.findMany({
      take: 24,
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { name: true, email: true } },
        project: { select: { id: true, title: true } },
      },
    }),
  ]);

  type Entry = { t: number; item: CollaborationFeedItem };
  const merged: Entry[] = [];
  for (const c of comments) {
    merged.push({
      t: c.createdAt.getTime(),
      item: {
        type: 'comment',
        at: c.createdAt.toISOString(),
        projectId: c.projectId,
        projectTitle: c.project.title,
        summary: clipSummary(c.body, 140),
        actorLabel: c.user.name?.trim() || c.user.email,
      },
    });
  }
  for (const f of files) {
    merged.push({
      t: f.createdAt.getTime(),
      item: {
        type: 'file',
        at: f.createdAt.toISOString(),
        projectId: f.projectId,
        projectTitle: f.project.title,
        summary: f.filename,
        actorLabel: f.uploadedBy.name?.trim() || f.uploadedBy.email,
      },
    });
  }
  merged.sort((a, b) => b.t - a.t);
  return merged.slice(0, limit).map((x) => x.item);
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

    const base: ReportsSummary = {
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

    if (role !== 'ADMIN') {
      return base;
    }

    const [clientActivity30d, collaborationFeed] = await Promise.all([
      buildClientActivity30d(),
      buildCollaborationFeed(12),
    ]);

    return { ...base, clientActivity30d, collaborationFeed };
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
