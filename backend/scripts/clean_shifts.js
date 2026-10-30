const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanShifts() {
  const shifts = await prisma.shift.findMany({ include: { employees: true } });
  const seen = new Set();
  for (const s of shifts) {
    if (seen.has(s.name)) {
      if (s.employees.length === 0) {
        await prisma.shift.delete({ where: { id: s.id } });
        console.log('Deleted duplicate empty shift:', s.name, s.id);
      }
    } else {
      seen.add(s.name);
    }
  }
  const remaining = await prisma.shift.findMany();
  console.log('Cleaned shifts:', remaining.map((s) => `${s.name} (${s.start_time} - ${s.end_time})`));
  await prisma.$disconnect();
}
cleanShifts().catch(console.error);
