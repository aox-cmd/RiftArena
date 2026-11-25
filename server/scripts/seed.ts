import "dotenv/config";
import { prisma } from "../src/config/database.js";
import { CHARACTERS } from "../src/game/data/characters.js";

async function main() {
  for (const character of CHARACTERS) {
    await prisma.character.upsert({
      where: { id: character.id! },
      update: character,
      create: character
    });

    console.log(`Character ready: ${character.name}`);
  }

  const users = await prisma.user.findMany({
    select: { id: true }
  });

  const starters = await prisma.character.findMany({
    where: { isStarter: true },
    select: { id: true }
  });

  for (const user of users) {
    await prisma.playerCharacter.createMany({
      data: starters.map(character => ({
        userId: user.id,
        characterId: character.id
      })),
      skipDuplicates: true
    });
  }

  console.log("--------------------------------");
  console.log(`${CHARACTERS.length} characters ready`);
  console.log(`${users.length} player accounts updated`);
  console.log("CHARACTER SEED COMPLETE");
  console.log("--------------------------------");
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
