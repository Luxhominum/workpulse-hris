import { prisma } from '../../lib/prisma';
import { Request } from 'express';
import { maskKTP, maskBankAccount } from '../../utils/crypto';
import * as XLSX from 'xlsx';

export interface AuditContext {
  actor_id?: string | null;
  actor_name: string;
  actor_email?: string | null;
  actor_role?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

export interface CreateAuditInput {
  action: string;
  entity_type: string;
  entity_id?: string | null;
  description: string;
  old_values?: any;
  new_values?: any;
}

export function extractAuditContext(req: Request): AuditContext {
  const user = (req as any).user;
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown Client';

  return {
    actor_id: user?.id || null,
    actor_name: user?.full_name || 'System Auto-Engine',
    actor_email: user?.email || null,
    actor_role: user?.role || 'SYSTEM',
    ip_address: ip,
    user_agent: userAgent,
  };
}

export function sanitizeAuditPayload(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const copy = { ...obj };
  delete copy.password;
  delete copy.password_hash;
  if (copy.ktp_number) copy.ktp_number = maskKTP(copy.ktp_number);
  if (copy.kk_number) copy.kk_number = maskKTP(copy.kk_number);
  if (copy.bank_uob) copy.bank_uob = maskBankAccount(copy.bank_uob);
  if (copy.bank_other) copy.bank_other = maskBankAccount(copy.bank_other);
  return copy;
}

export class AuditService {
  /**
   * Asynchronously records an audit event in the database
   */
  static async record(ctx: AuditContext, input: CreateAuditInput) {
    try {
      const oldSanitized = input.old_values ? JSON.stringify(sanitizeAuditPayload(input.old_values)) : null;
      const newSanitized = input.new_values ? JSON.stringify(sanitizeAuditPayload(input.new_values)) : null;

      return await prisma.auditLog.create({
        data: {
          actor_id: ctx.actor_id,
          actor_name: ctx.actor_name,
          actor_email: ctx.actor_email,
          actor_role: ctx.actor_role,
          ip_address: ctx.ip_address,
          user_agent: ctx.user_agent,
          action: input.action,
          entity_type: input.entity_type,
          entity_id: input.entity_id,
          description: input.description,
          old_values: oldSanitized,
          new_values: newSanitized,
        },
      });
    } catch (err) {
      console.error('Failed to write audit log:', err);
      return null;
    }
  }

  /**
   * Retrieves paginated audit logs with search and category filters
   */
  static async getAll(filters: {
    search?: string;
    action?: string;
    entity_type?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters.action && filters.action !== 'ALL') {
      where.action = filters.action;
    }
    if (filters.entity_type && filters.entity_type !== 'ALL') {
      where.entity_type = filters.entity_type;
    }
    if (filters.search) {
      where.OR = [
        { actor_name: { contains: filters.search } },
        { actor_email: { contains: filters.search } },
        { description: { contains: filters.search } },
        { ip_address: { contains: filters.search } },
      ];
    }
    if (filters.start_date || filters.end_date) {
      where.created_at = {};
      if (filters.start_date) where.created_at.gte = new Date(filters.start_date);
      if (filters.end_date) where.created_at.lte = new Date(filters.end_date);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }

  /**
   * Exports audit trail as Excel (.xlsx) or CSV buffer for compliance report
   */
  static async exportFile(
    filters: { search?: string; action?: string; entity_type?: string; start_date?: string; end_date?: string },
    format: 'xlsx' | 'csv'
  ) {
    const { logs } = await this.getAll({ ...filters, limit: 10000, offset: 0 });

    const rows = logs.map((l) => ({
      'ID Log': l.id,
      'Waktu (WIB)': new Date(l.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      'Nama Pelaku': l.actor_name,
      'Email Pelaku': l.actor_email || '—',
      'Role Pelaku': l.actor_role || 'SYSTEM',
      'IP Address': l.ip_address || '—',
      'Aksi (Action)': l.action,
      'Modul (Entity)': l.entity_type,
      'Deskripsi Aktivitas': l.description,
      'Data Sebelum': l.old_values || '—',
      'Data Sesudah': l.new_values || '—',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Logs UU PDP');

    if (format === 'csv') {
      return XLSX.utils.sheet_to_csv(worksheet);
    }
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}
