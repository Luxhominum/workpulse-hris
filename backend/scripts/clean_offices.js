const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clean() {
  const offices = await prisma.office.findMany({ include: { employees: true } });
  const seen = new Set();
  for (const o of offices) {
    if (seen.has(o.name)) {
      if (o.employees.length === 0) {
        await prisma.office.delete({ where: { id: o.id } });
        console.log('Deleted duplicate empty office:', o.name, o.id);
      }
    } else {
      seen.add(o.name);
    }
  }
  const remaining = await prisma.office.findMany();
  console.log('Cleaned offices:', remaining.map((o) => `${o.name} (${o.radius_meters}m)`));
  await prisma.$disconnect();
}
clean().catch(console.error);
