import { Request, Response, NextFunction } from 'express';
import { EmployeesService } from './employees.service';
import { Role } from '@prisma/client';
import { AuditService, extractAuditContext } from '../audit/audit.service';

function getId(req: Request): string {
  const { id } = req.params;
  return Array.isArray(id) ? id[0] : id;
}

export class EmployeesController {
  static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { department, role, office_id, search, status } = req.query;
      const userRole = (req as any).user?.role;
      const maskSensitives = userRole !== Role.ADMIN;

      const employees = await EmployeesService.getAll({
        department: typeof department === 'string' ? department : undefined,
        role: typeof role === 'string' ? (role as Role) : undefined,
        office_id: typeof office_id === 'string' ? office_id : undefined,
        search: typeof search === 'string' ? search : undefined,
        status: status === 'archived' || status === 'all' || status === 'active' ? status : undefined,
        maskSensitives,
      });

      res.status(200).json({
        success: true,
        data: employees,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetId = getId(req);
      const userRole = (req as any).user?.role;
      const userId = (req as any).user?.id;
      const maskSensitives = userRole !== Role.ADMIN && userId !== targetId;

      const employee = await EmployeesService.getById(targetId, { maskSensitives });
      res.status(200).json({
        success: true,
        data: employee,
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const employee = await EmployeesService.create(req.body);
      const ctx = extractAuditContext(req);
      AuditService.record(ctx, {
        action: 'EMPLOYEE_CREATE',
        entity_type: 'EMPLOYEE',
        entity_id: employee.id,
        description: `Menambahkan karyawan baru: ${employee.full_name} (${employee.department} - ${employee.position || 'Staff'})`,
        new_values: req.body,
      });

      res.status(201).json({
        success: true,
        message: 'Employee created successfully',
        data: employee,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getId(req);
      const oldEmp = await EmployeesService.getById(id, { maskSensitives: false });
      const employee = await EmployeesService.update(id, req.body);
      const ctx = extractAuditContext(req);
      AuditService.record(ctx, {
        action: 'EMPLOYEE_UPDATE',
        entity_type: 'EMPLOYEE',
        entity_id: id,
        description: `Memperbarui data profil karyawan: ${employee.full_name} (${employee.department})`,
        old_values: oldEmp,
        new_values: req.body,
      });

      res.status(200).json({
        success: true,
        message: 'Employee updated successfully',
        data: employee,
      });
    } catch (error) {
      next(error);
    }
  }

  static async archive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getId(req);
      const employee = await EmployeesService.archive(id);
      const ctx = extractAuditContext(req);
      AuditService.record(ctx, {
        action: 'EMPLOYEE_ARCHIVE',
        entity_type: 'EMPLOYEE',
        entity_id: id,
        description: `Menonaktifkan / mengarsipkan karyawan: ${employee.full_name}`,
      });

      res.status(200).json({
        success: true,
        message: 'Employee archived successfully',
        data: employee,
      });
    } catch (error) {
      next(error);
    }
  }

  static async restore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getId(req);
      const employee = await EmployeesService.restore(id);
      const ctx = extractAuditContext(req);
      AuditService.record(ctx, {
        action: 'EMPLOYEE_RESTORE',
        entity_type: 'EMPLOYEE',
        entity_id: id,
        description: `Mengaktifkan kembali karyawan yang diarsipkan: ${employee.full_name}`,
      });

      res.status(200).json({
        success: true,
        message: 'Employee restored successfully',
        data: employee,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getId(req);
      const oldEmp = await EmployeesService.getById(id, { maskSensitives: false });
      await EmployeesService.delete(id);
      const ctx = extractAuditContext(req);
      AuditService.record(ctx, {
        action: 'EMPLOYEE_DELETE',
        entity_type: 'EMPLOYEE',
        entity_id: id,
        description: `Menghapus akun karyawan: ${oldEmp?.full_name || id}`,
        old_values: oldEmp,
      });

      res.status(200).json({
        success: true,
        message: 'Employee deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async importExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let result;
      if (req.file && req.file.buffer) {
        result = await EmployeesService.importFromBuffer(req.file.buffer);
      } else if (req.body?.filePath) {
        result = await EmployeesService.importFromFile(req.body.filePath);
      } else {
        const defaultPath = 'C:\\Users\\User\\Downloads\\Team PGE (1).xlsx';
        result = await EmployeesService.importFromFile(defaultPath);
      }

      const ctx = extractAuditContext(req);
      AuditService.record(ctx, {
        action: 'EMPLOYEE_BULK_IMPORT',
        entity_type: 'EMPLOYEE',
        description: `Sinkronisasi massal via Excel: ${result.createdCount} karyawan baru, ${result.updatedCount} diperbarui (Total ${result.totalRows} baris)`,
      });

      res.status(200).json({
        success: true,
        message: `Import sukses: ${result.createdCount} karyawan baru ditambahkan, ${result.updatedCount} diperbarui. Total ${result.totalRows} data.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
