import { prisma } from '../src/lib/prisma';

async function main() {
  const employee = await prisma.employee.findFirst({
    where: { role: 'EMPLOYEE' },
  });

  if (!employee) {
    console.log('No employee found');
    return;
  }

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 65 * 60 * 1000);
  const twentyMinsAgo = new Date(now.getTime() - 20 * 60 * 1000);

  // 1. Completed Visit with Closing Order
  await prisma.clientVisit.create({
    data: {
      company_id: employee.company_id,
      employee_id: employee.id,
      client_name: 'Toko Sumber Rejeki Jaya',
      client_address: 'Jl. Raya Darmo Permai No. 18, Surabaya Barat',
      contact_person: 'Koh Hendra',
      contact_phone: '081234567890',
      latitude: -7.2758,
      longitude: 112.7378,
      photo_url: '/uploads/sample_store.jpg',
      visit_purpose: 'Restock / Order Ulang Toko',
      check_in_time: oneHourAgo,
      check_out_time: twentyMinsAgo,
      duration_minutes: 45,
      order_amount: 8500000,
      notes: 'Repeat order 20 karton produk A dan 10 karton produk B. Pembayaran tempo 14 hari disetujui.',
      status: 'COMPLETED',
    },
  });

  // 2. Active In-Progress Visit
  await prisma.clientVisit.create({
    data: {
      company_id: employee.company_id,
      employee_id: employee.id,
      client_name: 'Minimarket Barokah Mart',
      client_address: 'Jl. Mayjen Sungkono No. 88, Surabaya',
      contact_person: 'Ibu Fatimah',
      contact_phone: '085712345678',
      latitude: -7.2891,
      longitude: 112.7214,
      photo_url: '/uploads/sample_store2.jpg',
      visit_purpose: 'Penawaran Produk Baru',
      check_in_time: twentyMinsAgo,
      duration_minutes: null,
      order_amount: 0,
      notes: 'Sedang presentasi katalog promo awal bulan ke kepala toko.',
      status: 'IN_PROGRESS',
    },
  });

  console.log('Sample visits created successfully for employee:', employee.full_name);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
