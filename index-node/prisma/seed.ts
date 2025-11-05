import { prisma } from "@db/prisma";

async function main() {
  await prisma.();
}

main().catch(async (error) => {
  console.error("Seed failed", error);
  await prisma.();
  process.exit(1);
});
