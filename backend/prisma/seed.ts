import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean existing records in correct relation order
  await prisma.attendanceRecord.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.office.deleteMany();

  // 1. Seed Office
  console.log('📍 Seeding office...');
  const hqOffice = await prisma.office.create({
    data: {
      name: 'Jakarta Central HQ',
      latitude: -6.175392,
      longitude: 106.827153,
      radius_meters: 100,
    },
  });
  console.log(`   Created office: ${hqOffice.name} (id: ${hqOffice.id})`);

  // 2. Seed Shifts
  console.log('⏰ Seeding shifts...');
  const standardShift = await prisma.shift.create({
    data: {
      name: 'Standard Working Hours',
      start_time: '09:00',
      end_time: '18:00',
      grace_period_minutes: 15,
    },
  });

  const flexibleShift = await prisma.shift.create({
    data: {
      name: 'Flexible Morning Shift',
      start_time: '08:00',
      end_time: '17:00',
      grace_period_minutes: 10,
    },
  });
  console.log(`   Created shifts: ${standardShift.name}, ${flexibleShift.name}`);

  // 3. Seed Password Hashes
  const defaultPassword = 'Password123!';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(defaultPassword, salt);

  // 4. Seed Admin
  console.log('👑 Seeding Admin employee...');
  const admin = await prisma.employee.create({
    data: {
      email: 'admin@company.com',
      password_hash: passwordHash,
      full_name: 'System Administrator',
      role: Role.ADMIN,
      department: 'Executive / HR',
      position: 'Head of People & Culture',
      phone: '+62 811-1234-5678',
      join_date: new Date('2023-01-15'),
      annual_leave_quota: 12,
      annual_leave_used: 0,
      office_id: hqOffice.id,
      shift_id: standardShift.id,
      is_wfh_allowed: true,
    },
  });
  console.log(`   Admin: ${admin.email}`);

  // 5. Seed HRD Admin (Aloysius Gonzaga)
  console.log('👔 Seeding HRD Admin...');
  const hrd = await prisma.employee.create({
    data: {
      email: 'aloysiuz@gmail.com',
      password_hash: passwordHash,
      full_name: 'Aloysius Gonzaga Pri Sambodo Nugroho',
      nickname: 'Aloysius',
      role: Role.ADMIN,
      department: 'Human Resources',
      position: 'HRD',
      phone: '+62 812-2345-6789',
      join_date: new Date('2021-01-01'),
      annual_leave_quota: 12,
      annual_leave_used: 0,
      office_id: hqOffice.id,
      shift_id: standardShift.id,
      is_wfh_allowed: true,
    },
  });
  console.log(`   HRD Admin: ${hrd.email}`);

  // 6. Seed Sales & Produksi Staff
  console.log('👷 Seeding Staff...');
  const employee1 = await prisma.employee.create({
    data: {
      email: 'anisyatulhasanah71@gmail.com',
      password_hash: passwordHash,
      full_name: 'Anisyatul Hasanah',
      nickname: 'Anis',
      role: Role.EMPLOYEE,
      department: 'Sales & Marketing',
      position: 'Sales',
      phone: '+62 813-3456-7890',
      join_date: new Date('2022-07-01'),
      annual_leave_quota: 12,
      annual_leave_used: 1,
      office_id: hqOffice.id,
      shift_id: standardShift.id,
      is_wfh_allowed: true,
    },
  });

  const employee2 = await prisma.employee.create({
    data: {
      email: 'wahyualbi20002@gmail.com',
      password_hash: passwordHash,
      full_name: 'Wahyu Albino',
      nickname: 'Wahyu',
      role: Role.EMPLOYEE,
      department: 'Produksi',
      position: 'Koord Produksi',
      phone: '+62 814-4567-8901',
      join_date: new Date('2022-08-01'),
      annual_leave_quota: 12,
      annual_leave_used: 0,
      office_id: hqOffice.id,
      shift_id: standardShift.id,
      is_wfh_allowed: false,
    },
  });

  console.log(`   Staff 1 (Sales): ${employee1.email}`);
  console.log(`   Staff 2 (Produksi): ${employee2.email}`);

  console.log('\n✨ Database seeding completed successfully!');
  console.log('----------------------------------------------------');
  console.log('Default credentials for all users:');
  console.log('Password: Password123!');
  console.log('Admin:    admin@company.com');
  console.log('Manager:  manager@company.com');
  console.log('Emp 1:    john.doe@company.com');
  console.log('Emp 2:    alice.smith@company.com');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
