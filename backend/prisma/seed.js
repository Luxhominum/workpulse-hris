"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
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
    const salt = await bcryptjs_1.default.genSalt(10);
    const passwordHash = await bcryptjs_1.default.hash(defaultPassword, salt);
    // 4. Seed Admin
    console.log('👑 Seeding Admin employee...');
    const admin = await prisma.employee.create({
        data: {
            email: 'admin@company.com',
            password_hash: passwordHash,
            full_name: 'System Administrator',
            role: client_1.Role.ADMIN,
            department: 'Executive / HR',
            office_id: hqOffice.id,
            shift_id: standardShift.id,
            is_wfh_allowed: true,
        },
    });
    console.log(`   Admin: ${admin.email}`);
    // 5. Seed Manager
    console.log('👔 Seeding Manager employee...');
    const manager = await prisma.employee.create({
        data: {
            email: 'manager@company.com',
            password_hash: passwordHash,
            full_name: 'Sarah Connor (Engineering Lead)',
            role: client_1.Role.MANAGER,
            department: 'Engineering',
            office_id: hqOffice.id,
            shift_id: standardShift.id,
            is_wfh_allowed: true,
        },
    });
    console.log(`   Manager: ${manager.email}`);
    // 6. Seed Test Employees
    console.log('👷 Seeding Test Employees...');
    const employee1 = await prisma.employee.create({
        data: {
            email: 'john.doe@company.com',
            password_hash: passwordHash,
            full_name: 'John Doe',
            role: client_1.Role.EMPLOYEE,
            department: 'Engineering',
            office_id: hqOffice.id,
            shift_id: standardShift.id,
            is_wfh_allowed: false, // On-site mandatory
        },
    });
    const employee2 = await prisma.employee.create({
        data: {
            email: 'alice.smith@company.com',
            password_hash: passwordHash,
            full_name: 'Alice Smith',
            role: client_1.Role.EMPLOYEE,
            department: 'Product & Design',
            office_id: hqOffice.id,
            shift_id: flexibleShift.id,
            is_wfh_allowed: true, // WFH allowed
        },
    });
    console.log(`   Employee 1 (On-site): ${employee1.email}`);
    console.log(`   Employee 2 (WFH allowed): ${employee2.email}`);
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
