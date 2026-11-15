import bcrypt from "bcryptjs";
import type { Prisma } from "../src/generated/prisma/client";
import { prisma } from "../src/lib/prisma";
const MIN = 60_000;
const DAYS = 14;

let seed = 42;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const between = (a: number, b: number) => a + rand() * (b - a);

const FIRST = [
  "Aarav",
  "Diya",
  "Kabir",
  "Meera",
  "Rohan",
  "Ananya",
  "Vikram",
  "Isha",
  "Arjun",
  "Sara",
  "Neil",
  "Priya",
  "Dev",
  "Tara",
  "Kiran",
  "Leela",
  "Omar",
  "Zoya",
  "Ravi",
  "Nina",
];
const LAST = [
  "Sharma",
  "Iyer",
  "Khan",
  "Patel",
  "Menon",
  "Das",
  "Reddy",
  "Joseph",
  "Gupta",
  "Nair",
  "Singh",
  "Rao",
];
const randomName = () =>
  `${FIRST[Math.floor(rand() * FIRST.length)]} ${LAST[Math.floor(rand() * LAST.length)]}`;

const HOURLY_WEIGHT: Record<number, number> = {
  9: 0.6,
  10: 1,
  11: 1.4,
  12: 1.6,
  13: 1.2,
  14: 0.9,
  15: 1,
  16: 1.2,
  17: 0.8,
};

const QUEUES = [
  { name: "General Enquiries", perHour: 7, service: [3, 8] as const },
  { name: "Billing Counter", perHour: 5, service: [4, 11] as const },
  { name: "Pharmacy Pickup", perHour: 9, service: [2, 6] as const },
];

async function main() {
  const email = "admin@example.com";
  await prisma.manager.deleteMany({ where: { email } });
  const manager = await prisma.manager.create({
    data: {
      email,
      name: "Demo Manager",
      passwordHash: await bcrypt.hash("password123", 10),
    },
  });

  const now = Date.now();

  for (const def of QUEUES) {
    const queue = await prisma.queue.create({
      data: { name: def.name, managerId: manager.id },
    });
    const tokens: Prisma.TokenCreateManyInput[] = [];
    let number = 1;

    for (let d = DAYS; d >= 0; d--) {
      const day = new Date(now - d * 24 * 60 * MIN);
      day.setHours(0, 0, 0, 0);
      const weekend = day.getDay() === 0 || day.getDay() === 6;
      const arrivals: number[] = [];
      for (let h = 9; h < 18; h++) {
        const expected =
          def.perHour *
          HOURLY_WEIGHT[h] *
          (weekend ? 0.5 : 1) *
          between(0.8, 1.2);
        const n = Math.round(expected);
        for (let i = 0; i < n; i++)
          arrivals.push(day.getTime() + h * 60 * MIN + rand() * 60 * MIN);
      }
      arrivals.sort((a, b) => a - b);
      let serverFreeAt = 0;
      for (const arrival of arrivals) {
        if (arrival > now) break;
        const start = Math.max(arrival, serverFreeAt);
        const wait = start - arrival;
        const base = {
          queueId: queue.id,
          number: number++,
          personName: randomName(),
          createdAt: new Date(arrival),
          position: 0,
        };

        if (wait > 12 * MIN && rand() < 0.12) {
          const cancelledAt = arrival + wait * between(0.3, 0.9);
          if (cancelledAt <= now) {
            tokens.push({
              ...base,
              status: "CANCELLED",
              cancelledAt: new Date(cancelledAt),
            });
            continue;
          }
        }

        const serviceMs = between(def.service[0], def.service[1]) * MIN;
        const done = start + serviceMs;
        serverFreeAt = done;

        if (start > now) tokens.push({ ...base, status: "WAITING" });
        else if (done > now)
          tokens.push({
            ...base,
            status: "SERVING",
            servedAt: new Date(start),
          });
        else
          tokens.push({
            ...base,
            status: "SERVED",
            servedAt: new Date(start),
            completedAt: new Date(done),
          });
      }
    }
    const waitingNow = tokens.filter((t) => t.status === "WAITING").length;
    for (let i = waitingNow; i < 4; i++) {
      tokens.push({
        queueId: queue.id,
        number: number++,
        personName: randomName(),
        status: "WAITING",
        createdAt: new Date(now - (20 - i * 4) * MIN),
        position: 0,
      });
    }

    let pos = 1;
    const waiting = tokens.filter((t) => t.status === "WAITING");
    waiting.sort((a, b) => +new Date(a.createdAt!) - +new Date(b.createdAt!));
    for (const t of waiting) t.position = pos++;

    await prisma.token.createMany({ data: tokens });
    await prisma.queue.update({
      where: { id: queue.id },
      data: { nextTokenNumber: number },
    });
    console.log(`  ${def.name}: ${tokens.length} tokens`);
  }

  console.log(`Seeded demo manager ${email} / password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
