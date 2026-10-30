import { Request, Response, NextFunction } from 'express';
import { AuditService } from './audit.service';

export class AuditController {
  static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, action, entity_type, start_date, end_date, limit, offset } = req.query;
      const result = await AuditService.getAll({
        search: typeof search === 'string' ? search : undefined,
        action: typeof action === 'string' ? action : undefined,
        entity_type: typeof entity_type === 'string' ? entity_type : undefined,
        start_date: typeof start_date === 'string' ? start_date : undefined,
        end_date: typeof end_date === 'string' ? end_date : undefined,
        limit: limit ? parseInt(String(limit), 10) : 50,
        offset: offset ? parseInt(String(offset), 10) : 0,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async export(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, action, entity_type, start_date, end_date, format } = req.query;
      const fileFormat = format === 'csv' ? 'csv' : 'xlsx';
      const fileBuffer = await AuditService.exportFile(
        {
          search: typeof search === 'string' ? search : undefined,
          action: typeof action === 'string' ? action : undefined,
          entity_type: typeof entity_type === 'string' ? entity_type : undefined,
          start_date: typeof start_date === 'string' ? start_date : undefined,
          end_date: typeof end_date === 'string' ? end_date : undefined,
        },
        fileFormat
      );

      const timestamp = new Date().toISOString().slice(0, 10);
      if (fileFormat === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${timestamp}.csv"`);
        res.send(fileBuffer);
      } else {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${timestamp}.xlsx"`);
        res.send(fileBuffer);
      }
    } catch (error) {
      next(error);
    }
  }
}
