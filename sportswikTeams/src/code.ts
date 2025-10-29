// --- Club badge helpers ---
function findBadgeTarget(
  root: SceneNode,
  kind: "home" | "away"
): (SceneNode & GeometryMixin) | null {
  const name = kind === "home" ? "home-badge" : "away-badge";
  if ("findAll" in root) {
    const matches = (root as ChildrenMixin).findAll(
      (n) => n.name === name && "fills" in n
    ) as (SceneNode & GeometryMixin)[];
    return matches.length ? matches[0] : null;
  }
  return null;
}
// --- Mock club name lists (26 each) ---
const HOME_CLUBS: string[] = [
  "IFK Umeå",
  "Kiruna FF",
  "Selånger SK",
  "Skellefteå United",
  "Växjö City",
  "Nordic Stars",
  "Coastal Rovers",
  "River City FC",
  "Highland Rangers",
  "Lakewood Town",
  "Pinecrest Athletic",
  "Silver Coast SC",
  "Northland FC",
  "Eastshore Eagles",
  "Central United",
  "Blue Harbor FC",
  "Mountain View",
  "Red Valley FC",
  "Westbridge FC",
  "Southport FC",
  "Ashford FC",
  "Maplewood FC",
  "Brookfield FC",
  "Oakridge FC",
  "Cedar Grove FC",
  "Harbor Lights FC",
];
const AWAY_CLUBS: string[] = [
  "Kiruna Park FC",
  "Skellefteå BK",
  "Umeå Wanderers",
  "Växjö Royals",
  "Selånger Mariners",
  "Baltic Athletic",
  "Nordic Wolves",
  "Riverview FC",
  "Highlands Albion",
  "Lakewood Rovers",
  "Pinecrest United",
  "Silver Coast Rovers",
  "Northland Rangers",
  "Eastshore City",
  "Central League FC",
  "Blue River FC",
  "Mountain Town",
  "Redbridge Athletic",
  "Westport United",
  "Southgate FC",
  "Ashbury FC",
  "Mapleton FC",
  "Brookstone FC",
  "Oakfield FC",
  "Cedar Park FC",
  "Harbor United",
];
// Simple in-memory cache for remote avatar bytes during a plugin run
const REMOTE_CACHE: Record<string, Uint8Array[]> = {};

// Populate Lineup — Built-in data only (no Figma Variables)
// - Supports locale: English (en), Swedish (sv), Swiss (ch)
// - Supports boys / girls
// - Supports shuffle + start shirt number
// - Finds text layers named: "player-name" and "shirt-number"

function postToUI(type: string, payload: unknown) {
  try {
    figma.ui.postMessage({ type, payload });
  } catch {}
}

function findFirstTextByName(root: SceneNode, target: string): TextNode | null {
  if ("findAll" in root) {
    const arr = (root as ChildrenMixin).findAll(
      (n) => n.type === "TEXT" && n.name === target
    ) as TextNode[];
    return arr && arr.length > 0 ? arr[0] : null;
  }
  return null;
}

async function ensureEditable(node: TextNode) {
  if (node.fontName === figma.mixed) {
    try {
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      node.fontName = { family: "Inter", style: "Regular" };
    } catch {
      await figma.loadFontAsync({ family: "Roboto", style: "Regular" });
      node.fontName = { family: "Roboto", style: "Regular" };
    }
  } else {
    await figma.loadFontAsync(node.fontName as FontName);
  }
}

function normalizeLocale(lc: string): "en" | "sv" | "ch" {
  const v = (lc || "en").toLowerCase();
  if (v === "sv" || v === "se") return "sv";
  if (v === "ch" || v === "de") return "ch";
  return "en";
}

// ---- Inline avatar helpers (no imports / no bundler required) ----
type LocaleX = "en" | "sv" | "ch";
type GenderX = "boys" | "girls";
type AvatarStyleX = { bg: string; fg: string };

const PALETTES_INLINE: Record<LocaleX, Record<GenderX, AvatarStyleX[]>> = {
  en: {
    boys: [
      { bg: "#2E7D32", fg: "#FFFFFF" },
      { bg: "#1565C0", fg: "#FFFFFF" },
      { bg: "#6A1B9A", fg: "#FFFFFF" },
      { bg: "#EF6C00", fg: "#FFFFFF" },
      { bg: "#00897B", fg: "#FFFFFF" },
      { bg: "#37474F", fg: "#FFFFFF" },
      { bg: "#7B1FA2", fg: "#FFFFFF" },
      { bg: "#1B5E20", fg: "#FFFFFF" },
      { bg: "#512DA8", fg: "#FFFFFF" },
      { bg: "#455A64", fg: "#FFFFFF" },
      { bg: "#0277BD", fg: "#FFFFFF" },
      { bg: "#C62828", fg: "#FFFFFF" },
    ],
    girls: [
      { bg: "#AD1457", fg: "#FFFFFF" },
      { bg: "#5E35B1", fg: "#FFFFFF" },
      { bg: "#00838F", fg: "#FFFFFF" },
      { bg: "#F4511E", fg: "#FFFFFF" },
      { bg: "#6D4C41", fg: "#FFFFFF" },
      { bg: "#9C27B0", fg: "#FFFFFF" },
      { bg: "#7CB342", fg: "#FFFFFF" },
      { bg: "#039BE5", fg: "#FFFFFF" },
      { bg: "#8E24AA", fg: "#FFFFFF" },
      { bg: "#D81B60", fg: "#FFFFFF" },
      { bg: "#EC407A", fg: "#FFFFFF" },
      { bg: "#00897B", fg: "#FFFFFF" },
    ],
  },
  sv: {
    boys: [
      { bg: "#1B5E20", fg: "#FFFFFF" },
      { bg: "#0D47A1", fg: "#FFFFFF" },
      { bg: "#4A148C", fg: "#FFFFFF" },
      { bg: "#EF6C00", fg: "#FFFFFF" },
      { bg: "#2E7D32", fg: "#FFFFFF" },
      { bg: "#455A64", fg: "#FFFFFF" },
      { bg: "#6A1B9A", fg: "#FFFFFF" },
      { bg: "#1565C0", fg: "#FFFFFF" },
      { bg: "#7B1FA2", fg: "#FFFFFF" },
      { bg: "#37474F", fg: "#FFFFFF" },
      { bg: "#00897B", fg: "#FFFFFF" },
      { bg: "#C62828", fg: "#FFFFFF" },
    ],
    girls: [
      { bg: "#D81B60", fg: "#FFFFFF" },
      { bg: "#8E24AA", fg: "#FFFFFF" },
      { bg: "#039BE5", fg: "#FFFFFF" },
      { bg: "#7CB342", fg: "#FFFFFF" },
      { bg: "#9C27B0", fg: "#FFFFFF" },
      { bg: "#6D4C41", fg: "#FFFFFF" },
      { bg: "#F4511E", fg: "#FFFFFF" },
      { bg: "#00838F", fg: "#FFFFFF" },
      { bg: "#5E35B1", fg: "#FFFFFF" },
      { bg: "#AD1457", fg: "#FFFFFF" },
      { bg: "#EC407A", fg: "#FFFFFF" },
      { bg: "#00897B", fg: "#FFFFFF" },
    ],
  },
  ch: {
    boys: [
      { bg: "#2E7D32", fg: "#FFFFFF" },
      { bg: "#1565C0", fg: "#FFFFFF" },
      { bg: "#6A1B9A", fg: "#FFFFFF" },
      { bg: "#EF6C00", fg: "#FFFFFF" },
      { bg: "#00897B", fg: "#FFFFFF" },
      { bg: "#37474F", fg: "#FFFFFF" },
      { bg: "#7B1FA2", fg: "#FFFFFF" },
      { bg: "#1B5E20", fg: "#FFFFFF" },
      { bg: "#512DA8", fg: "#FFFFFF" },
      { bg: "#455A64", fg: "#FFFFFF" },
      { bg: "#0277BD", fg: "#FFFFFF" },
      { bg: "#C62828", fg: "#FFFFFF" },
    ],
    girls: [
      { bg: "#D81B60", fg: "#FFFFFF" },
      { bg: "#8E24AA", fg: "#FFFFFF" },
      { bg: "#039BE5", fg: "#FFFFFF" },
      { bg: "#7CB342", fg: "#FFFFFF" },
      { bg: "#9C27B0", fg: "#FFFFFF" },
      { bg: "#6D4C41", fg: "#FFFFFF" },
      { bg: "#F4511E", fg: "#FFFFFF" },
      { bg: "#00838F", fg: "#FFFFFF" },
      { bg: "#5E35B1", fg: "#FFFFFF" },
      { bg: "#AD1457", fg: "#FFFFFF" },
      { bg: "#EC407A", fg: "#FFFFFF" },
      { bg: "#00897B", fg: "#FFFFFF" },
    ],
  },
};

function pickStyle(
  index: number,
  locale: LocaleX,
  gender: GenderX
): AvatarStyleX {
  const list = PALETTES_INLINE[locale][gender];
  return list[index % list.length];
}

function initialsFromName(fullName: string): string {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0].charAt(0) || "";
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return (first + last).toUpperCase();
}

// Instance-safe version: update existing avatar node inside instances, only create new if editable
async function applyVectorAvatarToNode(opts: {
  host: SceneNode;
  name: string;
  style: AvatarStyleX;
  diameter?: number; // default 96
}) {
  const { host, name, style } = opts;
  const D = Math.max(16, opts.diameter ?? 96);
  const initials = initialsFromName(name);

  // Helper: find an existing avatar target node (ellipse/rect/frame with fills)
  function findAvatarTarget(
    root: SceneNode
  ): (SceneNode & GeometryMixin) | null {
    if ("findOne" in root) {
      const target = (root as ChildrenMixin).findOne((n) => {
        const isCandidateName =
          n.name === "player-avatar" ||
          n.name === "avatar" ||
          n.name === "photo";
        const hasFills = "fills" in n;
        return isCandidateName && hasFills;
      }) as (SceneNode & GeometryMixin) | null;
      return target || null;
    }
    return null;
  }

  // Helper: find optional text for initials
  function findAvatarInitials(root: SceneNode): TextNode | null {
    if ("findOne" in root) {
      return (root as ChildrenMixin).findOne(
        (n) => n.name === "player-avatar-initials" && n.type === "TEXT"
      ) as TextNode | null;
    }
    return null;
  }

  // If host is an instance, we cannot append children. Try to update existing nodes.
  const isInstance = host.type === "INSTANCE";
  const existingTarget = findAvatarTarget(host);
  const existingInitials = findAvatarInitials(host);

  if (existingTarget) {
    // Update fill color on the existing shape/frame
    const fills = Array.isArray(existingTarget.fills)
      ? existingTarget.fills.slice()
      : [];
    const paint: Paint = { type: "SOLID", color: hexToRgb(style.bg) };
    if (fills.length > 0) fills[0] = paint;
    else (fills as Paint[]).push(paint);
    existingTarget.fills = fills as ReadonlyArray<Paint>;

    // Update initials text if present
    if (existingInitials) {
      await safeLoadFontForAvatar(existingInitials);
      existingInitials.characters = initials;
      existingInitials.fills = [{ type: "SOLID", color: hexToRgb(style.fg) }];
    }
    return;
  }

  if (isInstance) {
    // Can't create new nodes inside an instance. Silently skip creating,
    // but this still counts as a successful populate for name/number.
    return;
  }

  // Host is editable (frame/group/component). Create the avatar circle + initials.
  let circle: EllipseNode | null = null;
  let text: TextNode | null = null;

  circle = figma.createEllipse();
  circle.name = "player-avatar";
  circle.resize(D, D);
  circle.x = 0;
  circle.y = 0;
  if ("appendChild" in host) (host as ChildrenMixin).appendChild(circle);
  circle.fills = [{ type: "SOLID", color: hexToRgb(style.bg) }];
  circle.strokes = [];

  text = figma.createText();
  text.name = "player-avatar-initials";
  if ("appendChild" in host) (host as ChildrenMixin).appendChild(text);
  await safeLoadFontForAvatar(text);
  text.characters = initials;
  text.fontSize = Math.round(D * 0.42);
  text.fills = [{ type: "SOLID", color: hexToRgb(style.fg) }];
  // center text over circle
  const textW = text.width,
    textH = text.height;
  text.x = circle.x + (D - textW) / 2;
  text.y = circle.y + (D - textH) / 2;
}

async function safeLoadFontForAvatar(node: TextNode) {
  try {
    if (node.fontName === figma.mixed) {
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      node.fontName = { family: "Inter", style: "Regular" };
    } else {
      await figma.loadFontAsync(node.fontName as FontName);
    }
  } catch {
    await figma.loadFontAsync({ family: "Roboto", style: "Regular" });
    node.fontName = { family: "Roboto", style: "Regular" };
  }
}

function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const bigint = parseInt(h, 16);
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  return { r, g, b };
}

async function loadRemoteAvatarBytes(
  base: string,
  folder: string,
  maxCount = 60
): Promise<Uint8Array[]> {
  const out: Uint8Array[] = [];
  const clean = (base || "").replace(/\/$/, "");
  const dir = (folder || "").replace(/^\/+|\/+$/g, "");
  if (!clean || !dir) return out;

  let consecutiveMisses = 0;
  const MISS_LIMIT = 8;

  for (let i = 1; i <= maxCount; i++) {
    const n = String(i).padStart(2, "0");
    const exts = [".png", ".jpg", ".jpeg", ".webp"]; // try in order
    let found = false;

    for (const ext of exts) {
      const url = `${clean}/${dir}/${n}${ext}`;
      try {
        const res = await fetch(url);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          out.push(new Uint8Array(buf));
          consecutiveMisses = 0;
          found = true;
          break; // stop trying other extensions for this index
        }
      } catch {
        // ignore and try next extension
      }
    }

    if (!found) {
      consecutiveMisses++;
      if (consecutiveMisses >= MISS_LIMIT && out.length > 0) break;
    }
  }
  return out;
}

// --- Image avatar helpers ---

function findAvatarTargetGeneric(
  root: SceneNode
): (SceneNode & GeometryMixin) | null {
  if ("findOne" in root) {
    const target = (root as ChildrenMixin).findOne((n) => {
      const isCandidateName =
        n.name === "player-avatar" || n.name === "avatar" || n.name === "photo";
      const hasFills = "fills" in n;
      return isCandidateName && hasFills;
    }) as (SceneNode & GeometryMixin) | null;
    return target || null;
  }
  return null;
}

function setImageFillOnTarget(target: SceneNode & GeometryMixin, image: Image) {
  const paints = Array.isArray(target.fills) ? target.fills.slice() : [];
  const paint: ImagePaint = {
    type: "IMAGE",
    imageHash: image.hash,
    scaleMode: "FILL",
  };
  if (paints.length > 0) paints[0] = paint;
  else (paints as Paint[]).push(paint);
  target.fills = paints as ReadonlyArray<Paint>;
}

// ---- Built-in data (so plugin is shareable without any setup) ----

function emailFromName(fullName: string, domain: string = "mail.com"): string {
  const base = (fullName || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^A-Za-z0-9\s]+/g, " ") // drop punctuation
    .trim()
    .replace(/\s+/g, ".")
    .toLowerCase();
  const cleanDomain = (domain || "mail.com").replace(/^@+/, "").trim();
  return base ? `${base}@${cleanDomain}` : `user@${cleanDomain}`;
}
function builtInNames(
  locale: string,
  set: "boys" | "girls" | "unisex" = "boys"
): string[] {
  const lc = normalizeLocale(locale);
  const data: Record<
    string,
    { boys: string[]; girls: string[]; unisex: string[] }
  > = {
    en: {
      boys: [
        "Liam Carter",
        "Noah Bennett",
        "Oliver Hayes",
        "Elijah Brooks",
        "James Porter",
        "William Reed",
        "Henry Collins",
        "Lucas Turner",
        "Benjamin Gray",
        "Alexander Miles",
        "Ethan Parker",
        "Mason Quinn",
        "Logan Davis",
        "Owen Mitchell",
        "Jack Foster",
      ],
      girls: [
        "Emma Grace",
        "Olivia Rose",
        "Ava Brooks",
        "Sophia Lane",
        "Isabella Reed",
        "Mia Collins",
        "Charlotte Hayes",
        "Amelia Quinn",
        "Harper Miles",
        "Ella Parker",
        "Evelyn Carter",
        "Abigail Moore",
        "Scarlett Davis",
        "Grace Mitchell",
        "Luna Foster",
      ],
      unisex: [
        "Alex Taylor",
        "Charlie Morgan",
        "Jamie Lee",
        "Jordan Casey",
        "Avery Parker",
        "Riley Quinn",
        "Rowan Carter",
        "Reese Cameron",
        "Dakota Blake",
        "Emerson Gray",
        "Skyler Bennett",
        "Finley Hayes",
        "Harley Collins",
        "Taylor Brooks",
        "Quinn Porter",
      ],
    },
    sv: {
      boys: [
        "Liam Andersson",
        "Noah Johansson",
        "Oliver Karlsson",
        "Elias Svensson",
        "Leo Nilsson",
        "William Eriksson",
        "Oscar Larsson",
        "Hugo Olsson",
        "Axel Persson",
        "Theo Gustafsson",
        "Viktor Lindberg",
        "Albin Berg",
        "Nils Holm",
        "Filip Sandberg",
        "Arvid Lund",
      ],
      girls: [
        "Emma Andersson",
        "Olivia Johansson",
        "Alice Karlsson",
        "Elsa Svensson",
        "Maja Nilsson",
        "Wilma Eriksson",
        "Agnes Larsson",
        "Alva Olsson",
        "Ebba Persson",
        "Freja Gustafsson",
        "Stella Lindberg",
        "Ida Berg",
        "Saga Holm",
        "Tilda Sandberg",
        "Ines Lund",
      ],
      unisex: [
        "Alex Nilsson",
        "Robin Svensson",
        "Kim Andersson",
        "Noel Berg",
        "Elis Lindberg",
        "Billie Holm",
        "Charlie Persson",
        "Jamie Larsson",
        "Mika Eriksson",
        "Lou Sandberg",
        "Sam Lund",
        "Sascha Gustafsson",
        "Neo Olsson",
        "Elli Karlsson",
        "Rio Johansson",
      ],
    },
    ch: {
      boys: [
        "Luca Müller",
        "Noah Meier",
        "Liam Schneider",
        "Leon Weber",
        "Elias Frei",
        "Finn Zimmermann",
        "Julian Keller",
        "Nico Fischer",
        "Levin Baumann",
        "Jonas Huber",
        "Matteo Wagner",
        "Moritz Graf",
        "Noel Schmid",
        "Samuel Brunner",
        "Tim Roth",
      ],
      girls: [
        "Mia Müller",
        "Emma Meier",
        "Lina Schneider",
        "Lea Weber",
        "Sofia Frei",
        "Léa Zimmermann",
        "Lina Keller",
        "Nora Fischer",
        "Alina Baumann",
        "Lena Huber",
        "Giulia Wagner",
        "Anna Graf",
        "Mila Schmid",
        "Nina Brunner",
        "Sara Roth",
      ],
      unisex: [
        "Alex Keller",
        "Robin Frei",
        "Sascha Weber",
        "Noel Graf",
        "Mika Fischer",
        "Jamie Huber",
        "Charlie Baumann",
        "Ari Meier",
        "Elia Wagner",
        "Niki Zimmermann",
        "Riley Roth",
        "Kim Schmid",
        "Skyler Brunner",
        "Rowan Müller",
        "Quinn Schneider",
      ],
    },
  };
  const bucket = data[lc] || data.en;
  return bucket[set] ? bucket[set].slice() : bucket.boys.slice();
}

function builtInMobileNumbers(): string[] {
  return [
    "070 123 1001",
    "070 123 1002",
    "070 123 1003",
    "070 123 1004",
    "070 123 1005",
    "070 123 1006",
    "070 123 1007",
    "070 123 1008",
    "070 123 1009",
    "070 123 1010",
    "070 123 9001",
    "070 123 1345",
    "070 123 7985",
    "070 123 7854",
    "070 123 9001",
    "070 123 1456",
    "070 123 0175",
    "070 123 0134",
    "070 123 0198",
    "070 123 0123",
  ];
}

function builtInPersonalIds(count: number = 20): string[] {
  const out: string[] = [];
  const seeds: Array<[number, number, number]> = [
    [1992, 3, 12],
    [1994, 6, 28],
    [1996, 10, 5],
    [1998, 0, 17],
    [1999, 8, 3],
    [2001, 1, 9],
    [2002, 4, 21],
    [2003, 7, 14],
    [2004, 11, 30],
    [2005, 2, 8],
  ];
  let seq = 1234;
  for (let i = 0; i < count; i++) {
    const [y, m, d] = seeds[i % seeds.length];
    const yyyy = String(y);
    const mm = String(m + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    const xxxx = String(seq + i)
      .padStart(4, "0")
      .slice(-4);
    out.push(`${yyyy}${mm}${dd}-${xxxx}`);
  }
  return out;
}

function formatDateYMD(d: Date): string {
  // Produces YYYY-MM-DD (e.g., 2025-10-28)
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function formatTimeHM(d: Date): string {
  // 24h HH:MM in local time
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mi}`;
}

function randUpTo(n: number): number {
  const lim = Math.max(1, Math.floor(Number(n) || 1));
  return Math.floor(Math.random() * lim) + 1; // 1..lim
}

const STAFF_ROLES: string[] = [
  "Coach",
  "Assistant Coach",
  "Assistant Coach",
  "Team Manager",
  "Physiotherapist",
  "Safety Officer",
  "Equipment Manager",
  "Team Doctor",
  "Analyst",
  "Strength & Conditioning",
  "Communications",
  "Operations",
];

function roleForIndex(mode: string, i: number): string {
  switch ((mode || "player").toLowerCase()) {
    case "guardian":
      return "Guardian";
    case "staff":
      return STAFF_ROLES[i % STAFF_ROLES.length];
    case "mixed": {
      const pool = ["Player", "Guardian", ...STAFF_ROLES];
      return pool[i % pool.length];
    }
    case "player":
    default:
      return "Player";
  }
}

function builtInShirtNumbers(count: number = 25): string[] {
  const out: string[] = [];
  for (let i = 1; i <= count; i++) out.push(String(i));
  return out;
}

function shuffle<T>(a: T[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

figma.showUI(__html__, { width: 380, height: 340 });

figma.ui.onmessage = async (msg: any) => {
  if (!msg) return;

  // Read score controls up front (so TS doesn't complain)
  const scoreRandom: boolean = !!msg.scoreRandom;
  const homeScore: number = Number.isFinite(Number(msg.homeScore))
    ? Number(msg.homeScore)
    : 0;
  const awayScore: number = Number.isFinite(Number(msg.awayScore))
    ? Number(msg.awayScore)
    : 0;

  if (msg.type === "scan") {
    try {
      const nameSet = "boys";
      const locale = normalizeLocale("en");

      // Preview from built-ins
      const namePreview = builtInNames(locale, nameSet).slice(0, 5);
      const numberPreview = builtInShirtNumbers(10);

      const sel = figma.currentPage.selection || [];
      const selection = sel.map((n) => ({
        node: n.name,
        hasPlayerName: !!findFirstTextByName(n, "player-name"),
        hasShirtNumber: !!findFirstTextByName(n, "shirt-number"),
        hasEmail: !!findFirstTextByName(n, "email"),
        hasPersonalId: !!findFirstTextByName(n, "personal-id"),
        hasDate: !!findFirstTextByName(n, "date"),
        hasTime: !!findFirstTextByName(n, "time"),
        hasRole: !!findFirstTextByName(n, "role"),
      }));

      postToUI("scan-result", {
        names: {
          source: "built-in",
          locale,
          gender: nameSet,
          preview: namePreview,
        },
        numbers: { source: "built-in", preview: numberPreview },
        avatar: { requested: false },
        selection,
      });
    } catch (e: any) {
      postToUI("error", "Scan failed: " + (e?.message || e));
    }
    return;
  }

  if (msg.type === "populate") {
    try {
      // Set local defaults for removed UI fields
      const nameSet: "boys" | "girls" | "unisex" = "boys";
      const startNum = 1;
      const shuffleNames = false;
      const useAvatar = false;
      const useMobile = false;
      const useEmail = false;
      const usePersonId = false;
      const roleMode: string | null = null; // disable role writing when UI has no control
      const avatarMode = "vector";
      const imgBase = "";
      const teamFolder = "";

      const dateMode: string =
        typeof msg.dateMode === "string" ? msg.dateMode : "off"; // off | sequential | random
      const timeMode: string =
        typeof msg.timeMode === "string" ? msg.timeMode : "off"; // off | sequential | random
      const competition: string =
        typeof msg.competition === "string" ? msg.competition : "";
      const region: string = typeof msg.region === "string" ? msg.region : "";
      const federation: string =
        typeof msg.federation === "string" ? msg.federation : "";
      const venue: string = typeof msg.venue === "string" ? msg.venue : "";
      const badgeLibrary: string =
        typeof msg.badgeLibrary === "string" ? msg.badgeLibrary : "";
      const badgeBase: string =
        typeof msg.badgeBase === "string" ? msg.badgeBase : "";
      const teamNameOpt: string =
        typeof msg.teamNameOpt === "string" ? msg.teamNameOpt : "";

      // Built-in only data
      let names = builtInNames("en", nameSet);
      let numbers = builtInShirtNumbers(25);

      // --- Money helper: currency and limits
      const currency: string =
        typeof msg.currency === "string" ? msg.currency : "SEK";
      const amount1Limit: number = Number.isFinite(Number(msg.amount1Limit))
        ? Number(msg.amount1Limit)
        : 500;
      const amount2Limit: number = Number.isFinite(Number(msg.amount2Limit))
        ? Number(msg.amount2Limit)
        : 500;
      const amount3Limit: number = Number.isFinite(Number(msg.amount3Limit))
        ? Number(msg.amount3Limit)
        : 500;
      const qty1Limit: number = Number.isFinite(Number(msg.qty1Limit))
        ? Number(msg.qty1Limit)
        : 500;
      const qty2Limit: number = Number.isFinite(Number(msg.qty2Limit))
        ? Number(msg.qty2Limit)
        : 500;
      const qty3Limit: number = Number.isFinite(Number(msg.qty3Limit))
        ? Number(msg.qty3Limit)
        : 500;

      if (!names.length) {
        figma.notify("No built-in names available");
        postToUI("error", "No built-in names available");
        return;
      }
      if (!numbers.length) {
        figma.notify("No built-in numbers available");
        postToUI("error", "No built-in numbers available");
        return;
      }

      const namesOrdered = names.slice();
      if (shuffleNames) shuffle(namesOrdered);
      const startIdx = Math.max(0, startNum - 1);
      const numbersOrdered = numbers
        .slice(startIdx)
        .concat(numbers.slice(0, startIdx));

      const now = new Date();
      const dateStr = formatDateYMD(now);
      const timeStr = formatTimeHM(now);

      // --- Date sequence (for sequential/random) ---
      function dateForIndex(idx: number): string {
        // Most-recent-first: today for idx 0, then yesterday, etc.
        const d = new Date();
        d.setDate(d.getDate() - idx);
        return formatDateYMD(d);
      }
      function buildDateList(n: number): string[] {
        const arr = Array.from({ length: n }, (_, i) => dateForIndex(i));
        return arr;
      }
      function shuffleInPlace<T>(a: T[]): T[] {
        return shuffle(a);
      }

      // --- Time sequence 09:00–19:00 (hourly slots) ---
      const TIME_SLOTS: string[] = Array.from({ length: 11 }, (_, k) => {
        const h = 9 + k; // 9..19 inclusive
        return `${String(h).padStart(2, "0")}:00`;
      });

      const sel = figma.currentPage.selection || [];
      if (!sel.length) {
        figma.notify("Select frames/instances to populate");
        postToUI("error", "Select frames/instances to populate");
        return;
      }

      // --- Preload badge images if needed ---
      let homeBadges: Uint8Array[] = [];
      let awayBadges: Uint8Array[] = [];
      if (badgeLibrary === "gotSports" && badgeBase) {
        const kHome = `${badgeBase}|gotHomeTeam`;
        const kAway = `${badgeBase}|gotAwayTeam`;
        homeBadges =
          REMOTE_CACHE[kHome] ||
          (REMOTE_CACHE[kHome] = await loadRemoteAvatarBytes(
            badgeBase,
            "gotHomeTeam",
            60
          ));
        awayBadges =
          REMOTE_CACHE[kAway] ||
          (REMOTE_CACHE[kAway] = await loadRemoteAvatarBytes(
            badgeBase,
            "gotAwayTeam",
            60
          ));
      }

      // --- Date & Time lists for this run ---
      const N = sel.length;
      const datesSeq: string[] = buildDateList(N);
      const datesRand: string[] = buildDateList(N);
      if (dateMode === "random") shuffleInPlace(datesRand);

      let count = 0;
      for (let i = 0; i < sel.length; i++) {
        const node = sel[i];
        // If a leaf (like TEXT) is selected, walk up one level so we can search within its container
        const root = (
          "findAll" in node ? node : (node.parent as SceneNode) || node
        ) as SceneNode;
        // Find all potential targets up front, searching within root
        const tName = findFirstTextByName(root, "player-name");
        const tNum = findFirstTextByName(root, "shirt-number");
        const tMobile = findFirstTextByName(root, "mobile-number");
        const tCompetition = findFirstTextByName(root, "competition");
        const tRegion = findFirstTextByName(root, "region");
        const tFederation = findFirstTextByName(root, "federation");
        const tVenue = findFirstTextByName(root, "venue");
        const tEmail = findFirstTextByName(root, "email");
        const tPersonId = findFirstTextByName(root, "personal-id");
        const tDate = findFirstTextByName(root, "date");
        const tTime = findFirstTextByName(root, "time");
        const tRole = findFirstTextByName(root, "role");
        // --- Club badge and club name targets ---
        const tHomeClub = findFirstTextByName(root, "home-club-name");
        const tAwayClub = findFirstTextByName(root, "away-club-name");
        const homeTarget = findBadgeTarget(root, "home");
        const awayTarget = findBadgeTarget(root, "away");
        // --- Score targets ---
        const tHomeScore = findFirstTextByName(root, "home-score");
        const tAwayScore = findFirstTextByName(root, "away-score");
        // --- Money helper amount targets ---
        const tAmt1 = findFirstTextByName(root, "amount-1");
        const tAmt2 = findFirstTextByName(root, "amount-2");
        const tAmt3 = findFirstTextByName(root, "amount-3");
        // --- Quantity helper targets ---
        const tQty1 = findFirstTextByName(root, "qty-1");
        const tQty2 = findFirstTextByName(root, "qty-2");
        const tQty3 = findFirstTextByName(root, "qty-3");
        // --- Team name target ---
        const tTeamName = findFirstTextByName(root, "team-name");
        const tHomeTeamName = findFirstTextByName(root, "home-team-name");
        const tAwayTeamName = findFirstTextByName(root, "away-team-name");

        // New guard: proceed if ANY known target exists (not just name/number)
        const hasAnyTarget = !!(
          tName ||
          tNum ||
          tMobile ||
          tCompetition ||
          tRegion ||
          tFederation ||
          tVenue ||
          tEmail ||
          tPersonId ||
          tDate ||
          tTime ||
          tRole ||
          findAvatarTargetGeneric(root) ||
          findBadgeTarget(root, "home") ||
          findBadgeTarget(root, "away") ||
          findFirstTextByName(root, "home-club-name") ||
          findFirstTextByName(root, "away-club-name") ||
          tHomeScore ||
          tAwayScore ||
          tTeamName ||
          tHomeTeamName ||
          tAwayTeamName ||
          tQty1 ||
          tQty2 ||
          tQty3
        );
        if (!hasAnyTarget) continue;

        const nameVal = namesOrdered[i % namesOrdered.length];
        const numVal = numbersOrdered[i % numbersOrdered.length];

        if (tName) {
          await ensureEditable(tName);
          tName.characters = String(nameVal);
        }
        if (tNum) {
          await ensureEditable(tNum);
          tNum.characters = String(numVal);
        }
        if (tCompetition && competition) {
          await ensureEditable(tCompetition);
          tCompetition.characters = competition;
        }
        if (tRegion && region) {
          await ensureEditable(tRegion);
          tRegion.characters = region;
        }
        if (tFederation && federation) {
          await ensureEditable(tFederation);
          tFederation.characters = federation;
        }
        if (tVenue && venue) {
          await ensureEditable(tVenue);
          tVenue.characters = venue;
        }

        // --- MONEY HELPER ---
        if (tAmt1 || tAmt2 || tAmt3) {
          const v1 = randUpTo(amount1Limit);
          const v2 = randUpTo(amount2Limit);
          const v3 = randUpTo(amount3Limit);
          if (tAmt1) {
            await ensureEditable(tAmt1);
            tAmt1.characters = `${v1} ${currency}`;
          }
          if (tAmt2) {
            await ensureEditable(tAmt2);
            tAmt2.characters = `${v2} ${currency}`;
          }
          if (tAmt3) {
            await ensureEditable(tAmt3);
            tAmt3.characters = `${v3} ${currency}`;
          }
        }

        // --- QUANTITY HELPER ---
        if (tQty1 || tQty2 || tQty3) {
          const q1 = randUpTo(qty1Limit);
          const q2 = randUpTo(qty2Limit);
          const q3 = randUpTo(qty3Limit);
          if (tQty1) {
            await ensureEditable(tQty1);
            tQty1.characters = String(q1);
          }
          if (tQty2) {
            await ensureEditable(tQty2);
            tQty2.characters = String(q2);
          }
          if (tQty3) {
            await ensureEditable(tQty3);
            tQty3.characters = String(q3);
          }
        }

        // --- TEAM NAME ---
        // Compute one label per card and apply to: team-name (legacy), home-team-name, away-team-name
        if (teamNameOpt) {
          const BOYS = [
            "BOYS U12",
            "BOYS U16",
            "Division 3 Boys",
            "Division 2 Boys",
          ];
          const GIRLS = [
            "GIRLS U12",
            "GIRLS U16",
            "Division 3 Girls",
            "Division 2 Girls",
          ];
          function pick(list: string[]) {
            return list[Math.floor(Math.random() * list.length)];
          }
          let teamLabel = "";
          switch (teamNameOpt) {
            case "boys-u12":
              teamLabel = BOYS[0];
              break;
            case "boys-u16":
              teamLabel = BOYS[1];
              break;
            case "div3-boys":
              teamLabel = BOYS[2];
              break;
            case "div2-boys":
              teamLabel = BOYS[3];
              break;
            case "__random-boys":
              teamLabel = pick(BOYS);
              break;
            case "girls-u12":
              teamLabel = GIRLS[0];
              break;
            case "girls-u16":
              teamLabel = GIRLS[1];
              break;
            case "div3-girls":
              teamLabel = GIRLS[2];
              break;
            case "div2-girls":
              teamLabel = GIRLS[3];
              break;
            case "__random-girls":
              teamLabel = pick(GIRLS);
              break;
            case "__random-mixed":
              teamLabel = pick([...BOYS, ...GIRLS]);
              break;
          }
          if (teamLabel) {
            if (tTeamName) {
              await ensureEditable(tTeamName);
              tTeamName.characters = teamLabel;
            }
            if (tHomeTeamName) {
              await ensureEditable(tHomeTeamName);
              tHomeTeamName.characters = teamLabel;
            }
            if (tAwayTeamName) {
              await ensureEditable(tAwayTeamName);
              tAwayTeamName.characters = teamLabel;
            }
          }
        }

        // --- SCORE POPULATION ---
        // Scores (either random per card 0–6, or fixed from UI)
        const scoreRand: boolean = !!msg.scoreRandom;
        const uiHome: number = Math.max(
          0,
          Math.min(99, Number(msg.homeScore ?? 0))
        );
        const uiAway: number = Math.max(
          0,
          Math.min(99, Number(msg.awayScore ?? 0))
        );
        const hScore = scoreRand ? Math.floor(Math.random() * 7) : uiHome;
        const aScore = scoreRand ? Math.floor(Math.random() * 7) : uiAway;
        if (tHomeScore) {
          await ensureEditable(tHomeScore);
          tHomeScore.characters = String(hScore);
        }
        if (tAwayScore) {
          await ensureEditable(tAwayScore);
          tAwayScore.characters = String(aScore);
        }

        // --- DATE ---
        if (tDate && dateMode !== "off") {
          let dOut = dateStr;
          if (dateMode === "sequential") dOut = datesSeq[i];
          else if (dateMode === "random") dOut = datesRand[i];
          await ensureEditable(tDate);
          tDate.characters = dOut;
        }
        // --- TIME ---
        if (tTime && timeMode !== "off") {
          let tOut = timeStr;
          if (timeMode === "sequential")
            tOut = TIME_SLOTS[i % TIME_SLOTS.length];
          else if (timeMode === "random")
            tOut = TIME_SLOTS[Math.floor(Math.random() * TIME_SLOTS.length)];
          await ensureEditable(tTime);
          tTime.characters = tOut;
        }
        // No role writing (tRole) since roleMode is null

        // Set club name text layers if present
        if (tHomeClub) {
          await ensureEditable(tHomeClub);
          tHomeClub.characters = HOME_CLUBS[i % HOME_CLUBS.length];
        }
        if (tAwayClub) {
          await ensureEditable(tAwayClub);
          tAwayClub.characters = AWAY_CLUBS[i % AWAY_CLUBS.length];
        }

        // Set badge fills if images are available
        if (homeTarget && homeBadges.length) {
          try {
            const img = figma.createImage(homeBadges[i % homeBadges.length]);
            setImageFillOnTarget(homeTarget, img);
          } catch {}
        }
        if (awayTarget && awayBadges.length) {
          try {
            const img = figma.createImage(awayBadges[i % awayBadges.length]);
            setImageFillOnTarget(awayTarget, img);
          } catch {}
        }

        count++;
      }
      if (count === 0) {
        figma.notify(
          "No matching layers found — select a frame (or any layer inside it) with names like 'competition', 'region', 'federation', 'venue', 'player-name', 'shirt-number'."
        );
      }
      figma.notify("Populated " + count + " item(s).");
      postToUI("populate-done", { count });
    } catch (e: any) {
      postToUI("error", "Populate failed: " + (e?.message || e));
      figma.notify("Populate failed — see UI log.");
    }
  }
};
