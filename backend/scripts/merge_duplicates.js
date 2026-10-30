const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function mergeShifts() {
  const shifts = await prisma.shift.findMany({ include: { employees: true } });
  const byName = {};
  for (const s of shifts) {
    if (!byName[s.name]) {
      byName[s.name] = s;
    } else {
      const primary = byName[s.name];
      for (const emp of s.employees) {
        await prisma.employee.update({
          where: { id: emp.id },
          data: { shift_id: primary.id },
        });
      }
      await prisma.shift.delete({ where: { id: s.id } });
      console.log('Merged duplicate shift into primary:', s.name);
    }
  }

  // Same for offices:
  const offices = await prisma.office.findMany({ include: { employees: true } });
  const officeByName = {};
  for (const o of offices) {
    if (!officeByName[o.name]) {
      officeByName[o.name] = o;
    } else {
      const primary = officeByName[o.name];
      for (const emp of o.employees) {
        await prisma.employee.update({
          where: { id: emp.id },
          data: { office_id: primary.id },
        });
      }
      await prisma.office.delete({ where: { id: o.id } });
      console.log('Merged duplicate office into primary:', o.name);
    }
  }

  const finalOffices = await prisma.office.findMany();
  console.log('Final pristine offices:', finalOffices.map((o) => `${o.name} (${o.radius_meters}m)`));
  const finalShifts = await prisma.shift.findMany();
  console.log('Final pristine shifts:', finalShifts.map((s) => `${s.name} (${s.start_time} - ${s.end_time})`));

  await prisma.$disconnect();
}
mergeShifts().catch(console.error);
