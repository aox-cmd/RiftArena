import type { Prisma } from "@prisma/client";

export const CHARACTERS: Prisma.CharacterCreateInput[] = [
  {
    id: "kael",
    name: "Kael",
    description: "The Ironblade. A balanced frontline warrior.",
    class: "WARRIOR",
    health: 1100,
    attack: 150,
    defense: 95,
    speed: 85,
    isStarter: true
  },
  {
    id: "lyra",
    name: "Lyra",
    description: "The Flameweaver. A powerful fire mage.",
    class: "MAGE",
    health: 750,
    attack: 210,
    defense: 45,
    speed: 100,
    isStarter: true
  },
  {
    id: "vex",
    name: "Vex",
    description: "The Shadowfang. A fast and deadly assassin.",
    class: "ASSASSIN",
    health: 800,
    attack: 185,
    defense: 55,
    speed: 150,
    isStarter: true
  },
  {
    id: "thorne",
    name: "Thorne",
    description: "The Immovable. A heavily armored guardian.",
    class: "GUARDIAN",
    health: 1600,
    attack: 85,
    defense: 170,
    speed: 50,
    isStarter: true
  },
  {
    id: "seraphina",
    name: "Seraphina",
    description: "The Lightbringer. A powerful healer.",
    class: "SUPPORT",
    health: 900,
    attack: 100,
    defense: 75,
    speed: 95,
    isStarter: true
  },
  {
    id: "draven",
    name: "Draven",
    description: "The Bloodreaver. An aggressive frontline fighter.",
    class: "WARRIOR",
    health: 1200,
    attack: 175,
    defense: 70,
    speed: 75,
    isStarter: true
  }
];
