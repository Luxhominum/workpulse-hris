import { prisma } from '../src/lib/prisma';

async function main() {
  let company = await prisma.company.findFirst({ where: { slug: 'pge' } });
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'PT Prima Global Era (PGE)',
        slug: 'pge',
        is_whitelisted: true,
        plan_type: 'ENTERPRISE_LIFETIME',
        max_employees: 999999,
        is_active: true,
      },
    });
    console.log('✅ Created Whitelist Master Company:', company.name, company.id);
  } else {
    company = await prisma.company.update({
      where: { id: company.id },
      data: { is_whitelisted: true, plan_type: 'ENTERPRISE_LIFETIME' },
    });
    console.log('✅ Existing Whitelist Company verified:', company.name);
  }

  // Link existing employees, offices, and shifts to this whitelist company
  const empUpdated = await prisma.employee.updateMany({
    where: { company_id: null },
    data: { company_id: company.id },
  });
  const officeUpdated = await prisma.office.updateMany({
    where: { company_id: null },
    data: { company_id: company.id },
  });
  const shiftUpdated = await prisma.shift.updateMany({
    where: { company_id: null },
    data: { company_id: company.id },
  });

  console.log(
    `Linked to Whitelist Company: employees: ${empUpdated.count}, offices: ${officeUpdated.count}, shifts: ${shiftUpdated.count}`
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
