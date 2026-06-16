/**
 * Seed script for NextGem Volunteer Check-In System
 * Run with: npm run seed
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('🌱 Seeding database...\n');

  // Clear existing data
  console.log('Clearing existing data...');
  await supabase.from('sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('volunteers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('orphanages').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // Create orphanages
  console.log('Creating orphanages...');
  const orphanages = [
    { name: 'Sunshine Children\'s Home', qr_code_token: 'sunshine-home' },
    { name: 'Rainbow Village Orphanage', qr_code_token: 'rainbow-village' },
    { name: 'Hope Foundation Center', qr_code_token: 'hope-foundation' },
  ];

  const { data: insertedOrphanages, error: orphanageError } = await supabase
    .from('orphanages')
    .insert(orphanages)
    .select();

  if (orphanageError) {
    console.error('Error inserting orphanages:', orphanageError);
    return;
  }

  console.log(`✓ Created ${insertedOrphanages.length} orphanages\n`);

  // Create volunteers
  console.log('Creating volunteers...');
  const volunteers = [
    // Sunshine Children's Home
    { name: 'Ahmad Bello', nysc_code: 'NG/2024/001', orphanage_id: insertedOrphanages[0].id },
    { name: 'Fatima Yusuf', nysc_code: 'NG/2024/002', orphanage_id: insertedOrphanages[0].id },
    // Rainbow Village
    { name: 'Chidi Okoro', nysc_code: 'NG/2024/003', orphanage_id: insertedOrphanages[1].id },
    { name: 'Emeka Nwosu', nysc_code: 'NG/2024/004', orphanage_id: insertedOrphanages[1].id },
    { name: 'Grace Adeyemi', nysc_code: 'NG/2024/005', orphanage_id: insertedOrphanages[1].id },
    // Hope Foundation
    { name: 'Ibrahim Sanusi', nysc_code: 'NG/2024/006', orphanage_id: insertedOrphanages[2].id },
    { name: 'Joy Maduka', nysc_code: 'NG/2024/007', orphanage_id: insertedOrphanages[2].id },
  ];

  const { data: insertedVolunteers, error: volunteerError } = await supabase
    .from('volunteers')
    .insert(volunteers)
    .select();

  if (volunteerError) {
    console.error('Error inserting volunteers:', volunteerError);
    return;
  }

  console.log(`✓ Created ${insertedVolunteers.length} volunteers\n`);

  // Create sample sessions (for dashboard demonstration)
  console.log('Creating sample sessions...');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const sessions = [
    // Yesterday's completed sessions
    {
      volunteer_id: insertedVolunteers[0].id,
      orphanage_id: insertedOrphanages[0].id,
      date: yesterday.toISOString().split('T')[0],
      check_in_time: new Date(yesterday.setHours(9, 0, 0, 0)).toISOString(),
      check_out_time: new Date(yesterday.setHours(15, 30, 0, 0)).toISOString(),
      hours_worked: 6.5
    },
    {
      volunteer_id: insertedVolunteers[1].id,
      orphanage_id: insertedOrphanages[0].id,
      date: yesterday.toISOString().split('T')[0],
      check_in_time: new Date(yesterday.setHours(10, 0, 0, 0)).toISOString(),
      check_out_time: new Date(yesterday.setHours(16, 0, 0, 0)).toISOString(),
      hours_worked: 6
    },
    // Two days ago
    {
      volunteer_id: insertedVolunteers[0].id,
      orphanage_id: insertedOrphanages[0].id,
      date: twoDaysAgo.toISOString().split('T')[0],
      check_in_time: new Date(twoDaysAgo.setHours(8, 30, 0, 0)).toISOString(),
      check_out_time: new Date(twoDaysAgo.setHours(14, 0, 0, 0)).toISOString(),
      hours_worked: 5.5
    },
    // More sessions for different volunteers
    {
      volunteer_id: insertedVolunteers[2].id,
      orphanage_id: insertedOrphanages[1].id,
      date: yesterday.toISOString().split('T')[0],
      check_in_time: new Date(yesterday.setHours(9, 0, 0, 0)).toISOString(),
      check_out_time: new Date(yesterday.setHours(17, 0, 0, 0)).toISOString(),
      hours_worked: 8
    },
    {
      volunteer_id: insertedVolunteers[3].id,
      orphanage_id: insertedOrphanages[1].id,
      date: yesterday.toISOString().split('T')[0],
      check_in_time: new Date(yesterday.setHours(11, 0, 0, 0)).toISOString(),
      check_out_time: new Date(yesterday.setHours(16, 0, 0, 0)).toISOString(),
      hours_worked: 5
    },
  ];

  const { error: sessionError } = await supabase
    .from('sessions')
    .insert(sessions);

  if (sessionError) {
    console.error('Error inserting sessions:', sessionError);
    return;
  }

  console.log(`✓ Created ${sessions.length} sample sessions\n`);

  console.log('✨ Seeding complete!\n');
  console.log('Demo URLs:');
  console.log(`  http://localhost:3000/${insertedOrphanages[0].qr_code_token}`);
  console.log(`  http://localhost:3000/${insertedOrphanages[1].qr_code_token}`);
  console.log(`  http://localhost:3000/${insertedOrphanages[2].qr_code_token}`);
  console.log('\nDashboard: http://localhost:3000/dashboard');
  console.log('Default password: nextgem2024');
}

seed().catch(console.error);