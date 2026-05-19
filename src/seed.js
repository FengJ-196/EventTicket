const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seed() {
  console.log('🌱 Starting database seeding...');

  try {
    // 1. Clean up existing data to prevent conflicts
    console.log('🧹 Clearing existing data...');
    await prisma.seatTransaction.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.seat.deleteMany();
    await prisma.seatType.deleteMany();
    await prisma.event.deleteMany();
    await prisma.user.deleteMany();

    // 2. Create Users
    console.log('👤 Creating users...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    const orgPassword = await bcrypt.hash('pass123', 10);
    const custPassword = await bcrypt.hash('pass123', 10);

    const admin = await prisma.user.create({
      data: {
        name: 'System Admin',
        userName: 'admin',
        password: adminPassword,
        role: 'ADMIN',
      },
    });

    const organizer = await prisma.user.create({
      data: {
        name: 'Alice Organizer',
        userName: 'alice_org',
        password: orgPassword,
        role: 'ORGANIZER',
      },
    });

    const customer1 = await prisma.user.create({
      data: {
        name: 'Bob Customer',
        userName: 'bob_cust',
        password: custPassword,
        role: 'USER',
      },
    });

    const customer2 = await prisma.user.create({
      data: {
        name: 'Charlie Customer',
        userName: 'charlie_cust',
        password: custPassword,
        role: 'USER',
      },
    });

    // 3. Create Events
    console.log('📅 Creating events...');

    // Event 1: Midnight Rock Festival
    const event1 = await prisma.event.create({
      data: {
        name: 'Midnight Rock Festival',
        status: 'PUBLISHED',
        address: 'Stadium Arena',
        event_date: new Date('2026-09-15T20:00:00Z'),
        rows: 10,
        columns: 10,
        available_seats: 100,
        organizer_id: organizer.id,
      },
    });

    // Event 2: Future Tech 2026
    const event2 = await prisma.event.create({
      data: {
        name: 'Future Tech 2026',
        status: 'PUBLISHED',
        address: 'Convention Center',
        event_date: new Date('2026-10-10T09:00:00Z'),
        rows: 5,
        columns: 20,
        available_seats: 100,
        organizer_id: organizer.id,
      },
    });

    // Event 3: Laughter Unleashed
    const event3 = await prisma.event.create({
      data: {
        name: 'Laughter Unleashed',
        status: 'PUBLISHED',
        address: 'Downtown Comedy Club',
        event_date: new Date('2026-11-05T19:30:00Z'),
        rows: 8,
        columns: 8,
        available_seats: 64,
        organizer_id: organizer.id,
      },
    });

    // Event 4: Modern Visions Expo
    const event4 = await prisma.event.create({
      data: {
        name: 'Modern Visions Expo',
        status: 'PENDING',
        address: 'Grand Gallery',
        event_date: new Date('2026-12-01T10:00:00Z'),
        rows: 4,
        columns: 15,
        available_seats: 60,
        organizer_id: organizer.id,
      },
    });

    // Event 5: Grace & Hope Gala
    const event5 = await prisma.event.create({
      data: {
        name: 'Grace & Hope Gala',
        status: 'DRAFT',
        address: 'Royal Ballroom',
        event_date: new Date('2027-01-20T18:30:00Z'),
        rows: 6,
        columns: 6,
        available_seats: 36,
        organizer_id: organizer.id,
      },
    });

    const eventsList = [event1, event2, event3, event4, event5];

    // 4. Create Seat Types
    console.log('💳 Creating seat types & grids...');

    for (const ev of eventsList) {
      // Every event gets a standard seat type
      const defaultSeatType = await prisma.seatType.create({
        data: {
          name: 'DEFAULT SEAT',
          price: ev.id === event1.id ? 85.00 : ev.id === event2.id ? 450.00 : ev.id === event3.id ? 45.00 : ev.id === event4.id ? 25.00 : 150.00,
          event_id: ev.id,
        },
      });

      let vipSeatType = null;
      if (ev.id === event1.id) {
        vipSeatType = await prisma.seatType.create({
          data: {
            name: 'VIP Front Row',
            price: 250.00,
            event_id: ev.id,
          },
        });
      }

      // Generate seat grid
      const seatsToCreate = [];
      for (let r = 1; r <= ev.rows; r++) {
        for (let c = 1; c <= ev.columns; c++) {
          // If Midnight Rock Festival (event1) rows 1-2 are VIP
          let seatTypeId = defaultSeatType.id;
          if (ev.id === event1.id && r <= 2 && vipSeatType) {
            seatTypeId = vipSeatType.id;
          }

          seatsToCreate.push({
            event_id: ev.id,
            x_coordinate: c,
            y_coordinate: r,
            seat_type_id: seatTypeId,
            status: 'AVAILABLE',
          });
        }
      }

      await prisma.seat.createMany({
        data: seatsToCreate,
      });
      console.log(`✅ Created ${seatsToCreate.length} seats for event: "${ev.name}"`);
    }

    // 5. Simulate Booking Purchases
    console.log('🎟️ Simulating purchases...');

    // Customer 1 (Bob) buys 2 seats from Midnight Rock Festival
    const seatsToBookEvent1 = await prisma.seat.findMany({
      where: { event_id: event1.id, status: 'AVAILABLE' },
      take: 2,
      include: { seatType: true },
    });

    if (seatsToBookEvent1.length === 2) {
      const totalAmount = seatsToBookEvent1.reduce((sum, s) => sum + Number(s.seatType.price), 0);

      // Create Payment record
      const payment1 = await prisma.payment.create({
        data: {
          amount: totalAmount,
          user_id: customer1.id,
          method: 'CREDIT_CARD',
          status: 'COMPLETED',
        },
      });

      for (const seat of seatsToBookEvent1) {
        // Update Seat Status to BOOKED
        await prisma.seat.update({
          where: { id: seat.id },
          data: { status: 'BOOKED', user_id: customer1.id },
        });

        // Create Ticket
        const ticket = await prisma.ticket.create({
          data: {
            seat_id: seat.id,
            payment_id: payment1.id,
            price: seat.seatType.price,
            status: 'VALID',
          },
        });

        // Log Transaction
        await prisma.seatTransaction.create({
          data: {
            seat_id: seat.id,
            user_id: customer1.id,
            action: 'BOOK',
            ticket_id: ticket.id,
          },
        });
      }

      // Update available seats count
      await prisma.event.update({
        where: { id: event1.id },
        data: { available_seats: { decrement: 2 } },
      });

      console.log(`✅ Bob Customer bought 2 seats for Midnight Rock Festival`);
    }

    // Customer 2 (Charlie) buys 1 seat from Laughter Unleashed
    const seatsToBookEvent3 = await prisma.seat.findMany({
      where: { event_id: event3.id, status: 'AVAILABLE' },
      take: 1,
      include: { seatType: true },
    });

    if (seatsToBookEvent3.length === 1) {
      const seat = seatsToBookEvent3[0];
      const totalAmount = Number(seat.seatType.price);

      // Create Payment record
      const payment2 = await prisma.payment.create({
        data: {
          amount: totalAmount,
          user_id: customer2.id,
          method: 'E_WALLET',
          status: 'COMPLETED',
        },
      });

      // Update Seat Status to BOOKED
      await prisma.seat.update({
        where: { id: seat.id },
        data: { status: 'BOOKED', user_id: customer2.id },
      });

      // Create Ticket
      const ticket = await prisma.ticket.create({
        data: {
          seat_id: seat.id,
          payment_id: payment2.id,
          price: seat.seatType.price,
          status: 'VALID',
        },
      });

      // Log Transaction
      await prisma.seatTransaction.create({
        data: {
          seat_id: seat.id,
          user_id: customer2.id,
          action: 'BOOK',
          ticket_id: ticket.id,
        },
      });

      // Update available seats count
      await prisma.event.update({
        where: { id: event3.id },
        data: { available_seats: { decrement: 1 } },
      });

      console.log(`✅ Charlie Customer bought 1 seat for Laughter Unleashed`);
    }

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    await prisma.$disconnect();
    pool.end();
  }
}

seed();
