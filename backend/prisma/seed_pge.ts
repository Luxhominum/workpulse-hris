import { EmployeesService } from '../src/modules/employees/employees.service';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('--- Starting PGE Excel Import ---');
  const filePath = 'C:/Users/User/Downloads/Team PGE (1).xlsx';
  const result = await EmployeesService.importFromFile(filePath);
  console.log(`Success! Total rows: ${result.totalRows}, Created: ${result.createdCount}, Updated: ${result.updatedCount}`);

  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      employee_id_number: true,
      nickname: true,
      full_name: true,
      email: true,
      position: true,
      department: true,
      bank_uob: true,
      stifin: true,
    },
    orderBy: { employee_id_number: 'asc' },
  });

  console.log(`Total employees in database: ${employees.length}`);
  employees.forEach((emp, i) => {
    console.log(`${i + 1}. [${emp.employee_id_number || 'NO-ID'}] ${emp.full_name} (${emp.nickname || '-'}) | ${emp.position} | UOB: ${emp.bank_uob || '-'} | STIFIn: ${emp.stifin || '-'}`);
  });
}

main()
  .catch((e) => {
    console.error('Error during PGE import:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
