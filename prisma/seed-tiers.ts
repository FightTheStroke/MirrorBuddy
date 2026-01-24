import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding tier definitions...");

  // Trial Tier - Free tier with limited features
  const trial = await prisma.tierDefinition.upsert({
    where: { code: "trial" },
    update: {},
    create: {
      code: "trial",
      name: "Trial",
      description: "Free trial tier with limited access",
      chatLimitDaily: 10,
      voiceMinutesDaily: 5,
      toolsLimitDaily: 10,
      docsLimitTotal: 1,
      chatModel: "gpt-4o-mini",
      realtimeModel: "gpt-realtime-mini",
      features: {
        chat: true,
        voice: true,
        flashcards: true,
        quizzes: true,
        mindMaps: true,
        tools: ["pdf", "chat"],
        maestriLimit: 3,
        coachesAvailable: ["melissa"],
        buddiesAvailable: ["mario"],
      },
      availableMaestri: ["leonardo-art", "galileo-physics", "curie-chemistry"],
      availableCoaches: ["melissa"],
      availableBuddies: ["mario"],
      availableTools: ["pdf", "chat"],
      monthlyPriceEur: null,
      sortOrder: 1,
      isActive: true,
    },
  });

  // Base Tier - Freemium tier with most maestri
  const base = await prisma.tierDefinition.upsert({
    where: { code: "base" },
    update: {},
    create: {
      code: "base",
      name: "Base",
      description: "Freemium tier with access to all maestri",
      chatLimitDaily: 50,
      voiceMinutesDaily: 30,
      toolsLimitDaily: 30,
      docsLimitTotal: 5,
      chatModel: "gpt-4o",
      realtimeModel: "gpt-realtime",
      features: {
        chat: true,
        voice: true,
        flashcards: true,
        quizzes: true,
        mindMaps: true,
        tools: ["pdf", "chat", "flashcards", "mindmap"],
        maestriLimit: 20,
        coachesAvailable: ["melissa", "roberto", "chiara"],
        buddiesAvailable: ["mario", "noemi", "enea"],
        parentDashboard: true,
      },
      availableMaestri: [
        "leonardo-art",
        "galileo-physics",
        "curie-chemistry",
        "cicerone-civic-education",
        "lovelace-computer-science",
        "smith-economics",
        "shakespeare-english",
        "humboldt-geography",
        "erodoto-history",
        "manzoni-italian",
        "euclide-mathematics",
        "mozart-music",
        "socrate-philosophy",
        "ippocrate-health",
        "feynman-physics",
        "darwin-biology",
        "chris-physical-education",
        "omero-storytelling",
        "alex-pina-spanish",
        "simone-sport",
      ],
      availableCoaches: ["melissa", "roberto", "chiara", "andrea", "favij"],
      availableBuddies: ["mario", "noemi", "enea", "bruno", "sofia"],
      availableTools: [
        "pdf",
        "chat",
        "flashcards",
        "mindmap",
        "quiz",
        "formula",
      ],
      monthlyPriceEur: null,
      sortOrder: 2,
      isActive: true,
    },
  });

  // Pro Tier - Paid tier with unlimited features
  const pro = await prisma.tierDefinition.upsert({
    where: { code: "pro" },
    update: {},
    create: {
      code: "pro",
      name: "Pro",
      description:
        "Professional tier with unlimited access and priority support",
      chatLimitDaily: 999999,
      voiceMinutesDaily: 999999,
      toolsLimitDaily: 999999,
      docsLimitTotal: 999999,
      chatModel: "gpt-4-turbo",
      realtimeModel: "gpt-realtime",
      features: {
        chat: true,
        voice: true,
        flashcards: true,
        quizzes: true,
        mindMaps: true,
        tools: [
          "pdf",
          "chat",
          "flashcards",
          "mindmap",
          "quiz",
          "formula",
          "webcam",
          "homework",
          "chart",
        ],
        maestriLimit: 22,
        coachesAvailable: [
          "melissa",
          "roberto",
          "chiara",
          "andrea",
          "favij",
          "laura",
        ],
        buddiesAvailable: ["mario", "noemi", "enea", "bruno", "sofia", "marta"],
        parentDashboard: true,
        prioritySupport: true,
        advancedAnalytics: true,
        unlimitedStorage: true,
      },
      availableMaestri: [
        "leonardo-art",
        "galileo-physics",
        "curie-chemistry",
        "cicerone-civic-education",
        "lovelace-computer-science",
        "smith-economics",
        "shakespeare-english",
        "humboldt-geography",
        "erodoto-history",
        "manzoni-italian",
        "euclide-mathematics",
        "mozart-music",
        "socrate-philosophy",
        "ippocrate-health",
        "feynman-physics",
        "darwin-biology",
        "chris-physical-education",
        "omero-storytelling",
        "alex-pina-spanish",
        "simone-sport",
        "cassese-international-law",
        "mascetti-supercazzola",
      ],
      availableCoaches: [
        "melissa",
        "roberto",
        "chiara",
        "andrea",
        "favij",
        "laura",
      ],
      availableBuddies: ["mario", "noemi", "enea", "bruno", "sofia", "marta"],
      availableTools: [
        "pdf",
        "chat",
        "flashcards",
        "mindmap",
        "quiz",
        "formula",
        "webcam",
        "homework",
        "chart",
      ],
      stripePriceId: process.env.STRIPE_PRICE_PRO || undefined,
      monthlyPriceEur: 9.99,
      sortOrder: 3,
      isActive: true,
    },
  });

  console.log("Seed completed:", { trial, base, pro });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
