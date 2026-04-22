export type OnceHumanPrize = {
  name: string;
  rarity: "legendary" | "epic" | "rare" | "uncommon" | "common" | "none";
  emoji: string;
  color: number;
  image: string;
  sourceName?: string;
  sourceUrl?: string;
};

export type OnceHumanItemArt = {
  name: string;
  image: string;
  sourceName: string;
  sourceUrl: string;
};

const WIKILY_IMAGE_BASE = "https://r2.wikily.gg/images/once-human/icons";

export const ONCE_HUMAN_ITEM_ART: Record<string, OnceHumanItemArt> = {
  "aws.338 - bullseye": {
    name: "AWS.338 - Bullseye",
    image: `${WIKILY_IMAGE_BASE}/sr_awp_sr_01.webp`,
    sourceName: "Wikily Once Human item database",
    sourceUrl: "https://wikily.gg/once-human/items/10521491/",
  },
  "hamr - brahminy": {
    name: "HAMR - Brahminy",
    image: `${WIKILY_IMAGE_BASE}/sr_m82_sr_02.webp`,
    sourceName: "Wikily Once Human item database",
    sourceUrl: "https://wikily.gg/once-human/items/10532499/",
  },
  "sn700 - gulped lore": {
    name: "SN700 - Gulped Lore",
    image: `${WIKILY_IMAGE_BASE}/m700_sr_02.webp`,
    sourceName: "Wikily Once Human item database",
    sourceUrl: "https://wikily.gg/once-human/items/10511399/",
  },
  "m416 - scorched earth": {
    name: "M416 - Scorched Earth",
    image: `${WIKILY_IMAGE_BASE}/hk416_r_03.webp`,
    sourceName: "Wikily Once Human item database",
    sourceUrl: "https://wikily.gg/once-human/items/10442199/",
  },
  "socr - outsider": {
    name: "SOCR - Outsider",
    image: `${WIKILY_IMAGE_BASE}/ar_scar_sr02.webp`,
    sourceName: "Wikily Once Human item database",
    sourceUrl: "https://wikily.gg/once-human/items/10412304/",
  },
  "acs12 - corrosion": {
    name: "ACS12 - Corrosion",
    image: `${WIKILY_IMAGE_BASE}/sg_aa12_sr_01.webp`,
    sourceName: "Wikily Once Human item database",
    sourceUrl: "https://wikily.gg/once-human/items/10231302/",
  },
  "kv-sbr - little jaws": {
    name: "KV-SBR - Little Jaws",
    image: `${WIKILY_IMAGE_BASE}/smg_vector_sr_01.webp`,
    sourceName: "Wikily Once Human item database",
    sourceUrl: "https://wikily.gg/once-human/items/10311399/",
  },
  "de.50": {
    name: "DE.50",
    image: `${WIKILY_IMAGE_BASE}/sr_deserteagle_n.webp`,
    sourceName: "Wikily Once Human item database",
    sourceUrl: "https://wikily.gg/once-human/items/10111103/",
  },
  "20 bandage pack": {
    name: "20 Bandage Pack",
    image: `${WIKILY_IMAGE_BASE}/icon_bandage_lv2_new.webp`,
    sourceName: "Wikily Once Human item database",
    sourceUrl: "https://wikily.gg/once-human/items/30130990/",
  },
};

export const WHACK_A_MOLE_PRIZES: Array<OnceHumanPrize & { minScore: number; scoreLabel: string }> = [
  { minScore: 60, scoreLabel: "60+", name: "AWS.338 - Bullseye", rarity: "legendary", emoji: "🎯", color: 0xef4444, ...artFields("AWS.338 - Bullseye") },
  { minScore: 48, scoreLabel: "48+", name: "HAMR - Brahminy", rarity: "legendary", emoji: "🦅", color: 0xf97316, ...artFields("HAMR - Brahminy") },
  { minScore: 36, scoreLabel: "36+", name: "SN700 - Gulped Lore", rarity: "epic", emoji: "🐍", color: 0x8b5cf6, ...artFields("SN700 - Gulped Lore") },
  { minScore: 28, scoreLabel: "28+", name: "M416 - Scorched Earth", rarity: "rare", emoji: "🔥", color: 0x3b82f6, ...artFields("M416 - Scorched Earth") },
  { minScore: 20, scoreLabel: "20+", name: "SOCR - Outsider", rarity: "rare", emoji: "⚔️", color: 0x3b82f6, ...artFields("SOCR - Outsider") },
  { minScore: 14, scoreLabel: "14+", name: "ACS12 - Corrosion", rarity: "uncommon", emoji: "☣️", color: 0x22c55e, ...artFields("ACS12 - Corrosion") },
  { minScore: 10, scoreLabel: "10+", name: "KV-SBR - Little Jaws", rarity: "uncommon", emoji: "🦈", color: 0x22c55e, ...artFields("KV-SBR - Little Jaws") },
  { minScore: 6, scoreLabel: "6+", name: "DE.50", rarity: "rare", emoji: "🔫", color: 0x3b82f6, ...artFields("DE.50") },
  { minScore: 2, scoreLabel: "2+", name: "20 Bandage Pack", rarity: "common", emoji: "🩹", color: 0x94a3b8, ...artFields("20 Bandage Pack") },
  { minScore: 0, scoreLabel: "0-1", name: "Better Luck Next Time", rarity: "none", emoji: "☣️", color: 0x475569, image: "" },
];

export function normalizeOnceHumanItemName(name: string) {
  return name
    .replace(/^whack-a-mole reward:\s*/i, "")
    .trim()
    .toLowerCase();
}

export function getOnceHumanItemArt(name?: string | null) {
  if (!name) return null;
  return ONCE_HUMAN_ITEM_ART[normalizeOnceHumanItemName(name)] ?? null;
}

export function scoreToWhackAMolePrize(score: number): OnceHumanPrize {
  return WHACK_A_MOLE_PRIZES.find((prize) => score >= prize.minScore) ?? WHACK_A_MOLE_PRIZES[WHACK_A_MOLE_PRIZES.length - 1];
}

function artFields(name: string): Pick<OnceHumanPrize, "image" | "sourceName" | "sourceUrl"> {
  const art = getOnceHumanItemArt(name);
  return {
    image: art?.image ?? "",
    sourceName: art?.sourceName,
    sourceUrl: art?.sourceUrl,
  };
}
