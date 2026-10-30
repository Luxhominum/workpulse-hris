import bcrypt from 'bcryptjs';
import * as xlsx from 'xlsx';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../middlewares/errorHandler';
import { CreateEmployeeInput, UpdateEmployeeInput } from './employees.schema';
import { Role } from '@prisma/client';
import { encryptPII, decryptPII, maskKTP, maskBankAccount } from '../../utils/crypto';

export function sanitizeEmployee<T extends Record<string, any>>(emp: T, maskSensitives = false): T {
  if (!emp) return emp;
  const decryptedKtp = decryptPII(emp.ktp_number);
  const decryptedKk = decryptPII(emp.kk_number);
  const decryptedUob = decryptPII(emp.bank_uob);
  const decryptedOther = decryptPII(emp.bank_other);

  return {
    ...emp,
    ktp_number: maskSensitives ? maskKTP(decryptedKtp) : decryptedKtp,
    kk_number: maskSensitives ? maskKTP(decryptedKk) : decryptedKk,
    bank_uob: maskSensitives ? maskBankAccount(decryptedUob) : decryptedUob,
    bank_other: maskSensitives ? maskBankAccount(decryptedOther) : decryptedOther,
  };
}

function parseExcelDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'number') {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(date.getTime()) ? null : date;
  }
  const str = String(val).trim();
  const months: Record<string, string> = {
    januari: '01', februari: '02', maret: '03', april: '04', mei: '05', juni: '06',
    juli: '07', agustus: '08', september: '09', oktober: '10', november: '11', desember: '12',
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const parts = str.split(/[\s-]+/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const mStr = parts[1].toLowerCase();
    const month = months[mStr];
    const year = parts[2];
    if (month && year.length === 4) {
      const parsed = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function inferDepartment(position: string): string {
  const p = (position || '').toLowerCase();
  if (p.includes('sales')) return 'Sales & Marketing';
  if (p.includes('penjahit') || p.includes('produksi') || p.includes('operator')) return 'Produksi';
  if (p.includes('admin order') || p.includes('admin operasional')) return 'Operasional';
  if (p.includes('gudang') || p.includes('logistik')) return 'Gudang & Logistik';
  if (p.includes('accounting') || p.includes('keuangan')) return 'Keuangan & Akuntansi';
  if (p.includes('merchandise')) return 'Merchandise';
  if (p.includes('design') || p.includes('kreatif')) return 'Kreatif & Desain';
  if (p.includes('r&d')) return 'R&D';
  if (p.includes('ga') || p.includes('affair')) return 'General Affair';
  if (p.includes('social media') || p.includes('pemasaran')) return 'Pemasaran';
  if (p.includes('hrd') || p.includes('human')) return 'Human Resources';
  return 'Operasional';
}

export class EmployeesService {
  private static defaultSelect = {
    id: true,
    email: true,
    full_name: true,
    role: true,
    department: true,
    position: true,
    phone: true,
    join_date: true,
    annual_leave_quota: true,
    annual_leave_used: true,
    is_wfh_allowed: true,
    is_active: true,
    archived_at: true,
    office_id: true,
    shift_id: true,
    company_id: true,
    company: {
      select: {
        id: true,
        name: true,
        slug: true,
        logo_url: true,
      },
    },
    // Team PGE Comprehensive Fields
    employee_id_number: true,
    nickname: true,
    birth_place: true,
    birth_date: true,
    gender: true,
    marital_status: true,
    children_count: true,
    blood_type: true,
    religion: true,
    ktp_number: true,
    kk_number: true,
    emergency_contact_phone: true,
    address: true,
    bank_uob: true,
    bank_other: true,
    contract_signed_date: true,
    employment_status: true,
    work_history: true,
    disc_work: true,
    disc_home: true,
    vak: true,
    iq_score: true,
    iq_eling_healing: true,
    stifin: true,
    office: {
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        radius_meters: true,
      },
    },
    shift: {
      select: {
        id: true,
        name: true,
        start_time: true,
        end_time: true,
        grace_period_minutes: true,
      },
    },
    created_at: true,
    updated_at: true,
  };

  static async getAll(filters: { department?: string; role?: Role; office_id?: string; search?: string; status?: 'active' | 'archived' | 'all'; maskSensitives?: boolean }) {
    const where: any = {};

    if (filters.status === 'archived') {
      where.is_active = false;
    } else if (filters.status === 'all') {
      // no status filter
    } else {
      // default: active employees only
      where.is_active = true;
    }

    if (filters.department) {
      where.department = filters.department;
    }

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.office_id) {
      where.office_id = filters.office_id;
    }

    if (filters.search) {
      where.OR = [
        { full_name: { contains: filters.search } },
        { email: { contains: filters.search } },
        { position: { contains: filters.search } },
        { employee_id_number: { contains: filters.search } },
        { nickname: { contains: filters.search } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      select: this.defaultSelect,
      orderBy: { full_name: 'asc' },
    });

    return employees.map((emp) => sanitizeEmployee(emp, filters.maskSensitives ?? false));
  }

  static async getById(id: string, options?: { maskSensitives?: boolean }) {
    const employee = await prisma.employee.findUnique({
      where: { id },
      select: this.defaultSelect,
    });

    if (!employee) {
      throw ApiError.notFound('Employee not found');
    }

    return sanitizeEmployee(employee, options?.maskSensitives ?? false);
  }

  static async create(data: CreateEmployeeInput) {
    const existing = await prisma.employee.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (existing) {
      throw ApiError.conflict('An employee with this email already exists');
    }

    if (data.office_id) {
      const office = await prisma.office.findUnique({ where: { id: data.office_id } });
      if (!office) throw ApiError.badRequest('Assigned office does not exist');
    }

    if (data.shift_id) {
      const shift = await prisma.shift.findUnique({ where: { id: data.shift_id } });
      if (!shift) throw ApiError.badRequest('Assigned shift does not exist');
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(data.password, salt);

    let finalCompanyId = data.company_id || null;
    if (data.company_name && data.company_name.trim()) {
      const trimmedName = data.company_name.trim();
      let comp = await prisma.company.findFirst({
        where: { name: trimmedName },
      });
      if (!comp) {
        const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30) || 'co';
        comp = await prisma.company.create({
          data: {
            name: trimmedName,
            slug: `${slug}-${Date.now().toString().slice(-4)}`,
          },
        });
      }
      finalCompanyId = comp.id;
    } else if (!finalCompanyId) {
      const defaultCompany = await prisma.company.findFirst();
      finalCompanyId = defaultCompany?.id || null;
    }

    const employee = await prisma.employee.create({
      data: {
        company_id: finalCompanyId,
        email: data.email.toLowerCase().trim(),
        password_hash,
        full_name: data.full_name.trim(),
        role: data.role,
        department: data.department || 'General',
        position: data.position || 'Staff',
        phone: data.phone || null,
        join_date: data.join_date ? new Date(data.join_date) : new Date(),
        annual_leave_quota: data.annual_leave_quota ?? 12,
        annual_leave_used: data.annual_leave_used ?? 0,
        office_id: data.office_id || null,
        shift_id: data.shift_id || null,
        is_wfh_allowed: data.is_wfh_allowed,
        // Team PGE Comprehensive Fields - AES-256-GCM Encrypted at Rest
        employee_id_number: data.employee_id_number || null,
        nickname: data.nickname || null,
        birth_place: data.birth_place || null,
        birth_date: data.birth_date ? new Date(data.birth_date) : null,
        gender: data.gender || null,
        marital_status: data.marital_status || null,
        children_count: data.children_count ?? 0,
        blood_type: data.blood_type || null,
        religion: data.religion || null,
        ktp_number: encryptPII(data.ktp_number),
        kk_number: encryptPII(data.kk_number),
        emergency_contact_phone: data.emergency_contact_phone || null,
        address: data.address || null,
        bank_uob: encryptPII(data.bank_uob),
        bank_other: encryptPII(data.bank_other),
        contract_signed_date: data.contract_signed_date ? new Date(data.contract_signed_date) : null,
        employment_status: data.employment_status || null,
        work_history: data.work_history || null,
        disc_work: data.disc_work || null,
        disc_home: data.disc_home || null,
        vak: data.vak || null,
        iq_score: data.iq_score || null,
        iq_eling_healing: data.iq_eling_healing || null,
        stifin: data.stifin || null,
      },
      select: this.defaultSelect,
    });

    return sanitizeEmployee(employee, false);
  }

  static async update(id: string, data: UpdateEmployeeInput) {
    await this.getById(id);

    if (data.email) {
      const existing = await prisma.employee.findUnique({
        where: { email: data.email.toLowerCase().trim() },
      });
      if (existing && existing.id !== id) {
        throw ApiError.conflict('An employee with this email already exists');
      }
    }

    if (data.office_id) {
      const office = await prisma.office.findUnique({ where: { id: data.office_id } });
      if (!office) throw ApiError.badRequest('Assigned office does not exist');
    }

    if (data.shift_id) {
      const shift = await prisma.shift.findUnique({ where: { id: data.shift_id } });
      if (!shift) throw ApiError.badRequest('Assigned shift does not exist');
    }

    const updatePayload: any = { ...data };

    if (data.email) {
      updatePayload.email = data.email.toLowerCase().trim();
    }

    if (data.full_name) {
      updatePayload.full_name = data.full_name.trim();
    }

    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      updatePayload.password_hash = await bcrypt.hash(data.password, salt);
      delete updatePayload.password;
    }

    if (data.join_date) {
      updatePayload.join_date = new Date(data.join_date);
    }

    if (data.birth_date !== undefined) {
      updatePayload.birth_date = data.birth_date ? new Date(data.birth_date) : null;
    }

    if (data.contract_signed_date !== undefined) {
      updatePayload.contract_signed_date = data.contract_signed_date ? new Date(data.contract_signed_date) : null;
    }

    // Encrypt sensitive PII fields if updated
    if (data.ktp_number !== undefined) {
      updatePayload.ktp_number = encryptPII(data.ktp_number);
    }
    if (data.kk_number !== undefined) {
      updatePayload.kk_number = encryptPII(data.kk_number);
    }
    if (data.bank_uob !== undefined) {
      updatePayload.bank_uob = encryptPII(data.bank_uob);
    }
    if (data.bank_other !== undefined) {
      updatePayload.bank_other = encryptPII(data.bank_other);
    }

    if (data.company_name !== undefined) {
      if (data.company_name && data.company_name.trim()) {
        const trimmedName = data.company_name.trim();
        let comp = await prisma.company.findFirst({
          where: { name: trimmedName },
        });
        if (!comp) {
          const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30) || 'co';
          comp = await prisma.company.create({
            data: {
              name: trimmedName,
              slug: `${slug}-${Date.now().toString().slice(-4)}`,
            },
          });
        }
        updatePayload.company_id = comp.id;
      }
      delete updatePayload.company_name;
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: updatePayload,
      select: this.defaultSelect,
    });

    return sanitizeEmployee(updated, false);
  }

  static async archive(id: string) {
    await this.getById(id);
    const updated = await prisma.employee.update({
      where: { id },
      data: {
        is_active: false,
        archived_at: new Date(),
      },
      select: this.defaultSelect,
    });
    return sanitizeEmployee(updated, false);
  }

  static async restore(id: string) {
    await this.getById(id);
    const updated = await prisma.employee.update({
      where: { id },
      data: {
        is_active: true,
        archived_at: null,
      },
      select: this.defaultSelect,
    });
    return sanitizeEmployee(updated, false);
  }

  static async delete(id: string) {
    await this.getById(id);
    return prisma.employee.delete({
      where: { id },
    });
  }

  /**
   * Import employees directly from an Excel workbook buffer or file
   */
  static async importFromWorkbook(wb: xlsx.WorkBook) {
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    // Filter non-empty rows with full_name
    const rows = data.slice(2).filter((r) => r && r[2]);

    // Fetch default office (Surakarta or first available)
    const defaultOffice =
      (await prisma.office.findFirst({ where: { name: { contains: 'Surakarta' } } })) ||
      (await prisma.office.findFirst());
    // Fetch default shift
    const defaultShift =
      (await prisma.shift.findFirst({ where: { name: { contains: 'Standard' } } })) ||
      (await prisma.shift.findFirst());

    const defaultPassword = 'Password123!';
    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash(defaultPassword, salt);

    let createdCount = 0;
    let updatedCount = 0;
    const results: any[] = [];

    for (const r of rows) {
      const rawNickname = r[1] ? String(r[1]).trim() : '';
      const cleanNickname = rawNickname ? rawNickname.split(/\s+\d/)[0].trim() : null;
      const fullName = String(r[2]).trim();
      const employeeIdNumber = r[3] ? String(r[3]).trim() : null;
      const birthPlace = r[4] ? String(r[4]).trim() : null;
      const birthDate = parseExcelDate(r[5]);
      const gender = r[6] ? String(r[6]).trim() : null;
      const maritalStatus = r[7] ? String(r[7]).trim() : null;
      const childrenCount = r[8] ? parseInt(String(r[8]).trim(), 10) || 0 : 0;
      const bloodType = r[9] ? String(r[9]).trim() : null;
      const religion = r[10] ? String(r[10]).trim() : null;
      const ktpNumber = r[11] ? String(r[11]).trim() : null;
      const kkNumber = r[12] ? String(r[12]).trim() : null;
      
      // Email fallback if missing
      const rawEmail = r[13] ? String(r[13]).toLowerCase().trim() : null;
      const sanitizedNick = cleanNickname ? cleanNickname.toLowerCase().replace(/[^a-z0-9]/g, '') : 'staff';
      const fallbackEmail = employeeIdNumber ? `pge.${employeeIdNumber}@team.pge.internal` : `${sanitizedNick}.${Date.now()}@team.pge.internal`;
      const email = rawEmail && rawEmail.includes('@') ? rawEmail : fallbackEmail;

      const phone = r[14] ? String(r[14]).trim() : null;
      const emergencyContactPhone = r[15] ? String(r[15]).trim() : null;
      const address = r[16] ? String(r[16]).trim() : null;
      const joinDate = parseExcelDate(r[17]) || new Date();
      const rawPosition = r[18] ? String(r[18]).trim() : 'Staff';
      const position = rawPosition === 'undefined' || !rawPosition ? 'Staff' : rawPosition;
      const department = inferDepartment(position);

      const bankUob = r[20] ? String(r[20]).trim() : null;
      const bankOther = r[21] ? String(r[21]).trim() : null;
      const contractSignedDate = parseExcelDate(r[22]);
      const employmentStatus = r[23] ? String(r[23]).trim() : 'Tetap';
      const workHistory = r[24] ? String(r[24]).trim() : null;

      const discWork = r[25] ? String(r[25]).trim() : null;
      const discHome = r[26] ? String(r[26]).trim() : null;
      const vak = r[27] ? String(r[27]).trim() : null;
      const iqScore = r[28] ? String(r[28]).trim() : null;
      const iqElingHealing = r[29] ? String(r[29]).trim() : null;
      const stifin = r[31] ? String(r[31]).trim() : null;

      // Determine role: HRD is MANAGER or ADMIN
      let role: Role = Role.EMPLOYEE;
      if (position.toLowerCase().includes('hrd')) {
        role = Role.ADMIN;
      }

      // Check if employee already exists by email or employeeIdNumber
      const existing = await prisma.employee.findFirst({
        where: {
          OR: [
            { email },
            ...(employeeIdNumber ? [{ employee_id_number: employeeIdNumber }] : []),
          ],
        },
      });

      const payload = {
        full_name: fullName,
        employee_id_number: employeeIdNumber,
        nickname: cleanNickname,
        birth_place: birthPlace,
        birth_date: birthDate,
        gender,
        marital_status: maritalStatus,
        children_count: childrenCount,
        blood_type: bloodType,
        religion,
        ktp_number: encryptPII(ktpNumber),
        kk_number: encryptPII(kkNumber),
        phone,
        emergency_contact_phone: emergencyContactPhone,
        address,
        join_date: joinDate,
        position,
        department,
        bank_uob: encryptPII(bankUob),
        bank_other: encryptPII(bankOther),
        contract_signed_date: contractSignedDate,
        employment_status: employmentStatus,
        work_history: workHistory,
        disc_work: discWork,
        disc_home: discHome,
        vak,
        iq_score: iqScore,
        iq_eling_healing: iqElingHealing,
        stifin,
        office_id: defaultOffice?.id || null,
        shift_id: defaultShift?.id || null,
        role: existing ? existing.role : role,
      };

      if (existing) {
        const updated = await prisma.employee.update({
          where: { id: existing.id },
          data: payload,
          select: this.defaultSelect,
        });
        updatedCount++;
        results.push(sanitizeEmployee(updated, false));
      } else {
        const created = await prisma.employee.create({
          data: {
            ...payload,
            email,
            password_hash: defaultPasswordHash,
          },
          select: this.defaultSelect,
        });
        createdCount++;
        results.push(sanitizeEmployee(created, false));
      }
    }

    return {
      totalRows: rows.length,
      createdCount,
      updatedCount,
      employees: results,
    };
  }

  /**
   * One-time or boot-time migration to encrypt existing unencrypted PII at rest
   */
  static async migratePlaintextToEncrypted() {
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        ktp_number: true,
        kk_number: true,
        bank_uob: true,
        bank_other: true,
      },
    });

    let migrated = 0;
    for (const emp of employees) {
      const needsKtp = emp.ktp_number && !emp.ktp_number.startsWith('enc:v1:');
      const needsKk = emp.kk_number && !emp.kk_number.startsWith('enc:v1:');
      const needsUob = emp.bank_uob && !emp.bank_uob.startsWith('enc:v1:');
      const needsOther = emp.bank_other && !emp.bank_other.startsWith('enc:v1:');

      if (needsKtp || needsKk || needsUob || needsOther) {
        await prisma.employee.update({
          where: { id: emp.id },
          data: {
            ktp_number: encryptPII(emp.ktp_number),
            kk_number: encryptPII(emp.kk_number),
            bank_uob: encryptPII(emp.bank_uob),
            bank_other: encryptPII(emp.bank_other),
          },
        });
        migrated++;
      }
    }

    if (migrated > 0) {
      console.log(`🔒 Data Protection: Successfully encrypted PII for ${migrated} employees with AES-256-GCM`);
    } else {
      console.log(`🔒 Data Protection: All employee PII is safely encrypted at rest (AES-256-GCM)`);
    }
    return migrated;
  }

  static async importFromFile(filePath: string) {
    const wb = xlsx.readFile(filePath);
    return this.importFromWorkbook(wb);
  }

  static async importFromBuffer(buffer: Buffer) {
    const wb = xlsx.read(buffer, { type: 'buffer' });
    return this.importFromWorkbook(wb);
  }
}
