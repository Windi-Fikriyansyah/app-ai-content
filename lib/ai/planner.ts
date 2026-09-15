/**
 * AI Content Planner Engine — Production-Ready Architecture
 *
 * Pipeline:
 *   Business Data → Schedule Generator → Distribution Engine →
 *   AI Content Planner → Zod Validation → Business Rule Validator →
 *   Duplicate Detector → Quality Gate → Content Briefs
 *
 * Follows Lazy Generation: Only generates Content Briefs, NOT final images/captions.
 * All data must originate from verified database records.
 */

import { z } from "zod/v4";

// ═══════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════

export interface AIReviewCheck {
  label: string;
  passed: boolean;
}

export interface AIReviewResult {
  score: number;
  status: "READY FOR APPROVAL" | "NEEDS_REVISION";
  checks: AIReviewCheck[];
  issues?: string[];
  suggestions?: string[];
  threads_caption?: string;
}

export interface ContentPlanItem {
  id?: string;
  dayIndex: number;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  title: string;
  content_type: string;
  pillar: string;
  objective: string;
  topic: string;
  hook: string;
  key_points: string[];
  cta: string;
  visual_direction: string;
  format: "Feed" | "Carousel" | "Reels" | "Story";
  platform: "instagram";
  status: "PLANNED" | "GENERATING" | "READY FOR APPROVAL" | "REVIEW" | "APPROVED" | "SCHEDULED" | "PUBLISHED" | "FAILED" | string;
  // Enhanced fields from temuan.md
  angle?: string;
  audience_stage?: string;
  product_reference?: string | null;
  content_goal?: string;
  data_sources?: string[];
  // Lazy Generation & Reviewer fields
  caption?: string | null;
  threads_caption?: string | null;
  hashtags?: string[] | null;
  media_url?: string | null;
  media_urls?: string[] | null;
  carousel_slides?: Array<{
    slide: number;
    imageUrl: string;
    title?: string;
    prompt?: string;
  }> | null;
  ai_score?: number | null;
  ai_review?: AIReviewResult | null;
  caption_status?: string | null;
  image_status?: string | null;
  generation_error?: string | null;
  generated_at?: string | null;
  // Zernio Publishing fields
  zernio_post_id?: string | null;
  zernio_account_id?: string | null;
  scheduled_at?: string | null;
  published_at?: string | null;
}

export interface BusinessContext {
  businessName: string;
  category: string;
  description: string;
  location?: string;
  website?: string;
  whatsapp?: string;
  targetAudience: string;
  products: Array<{
    name: string;
    price?: string;
    description?: string;
    benefits?: string;
  }>;
  promotion?: {
    name?: string;
    discount?: string;
    startDate?: string;
    endDate?: string;
  };
  brandKit: {
    primaryColor: string;
    secondaryColor: string;
    visualStyle: string;
    writingTone: string;
    language?: string;
    emojiUsage?: string;
  };
  imageQuality?: "low" | "medium" | "high" | "auto";
  // Enhanced context fields
  testimonials?: Array<{
    customerName?: string;
    quote: string;
    rating?: number;
    product?: string;
  }>;
  brandStory?: string;
  founderStory?: string;
  recentContent?: Array<{
    title: string;
    topic: string;
    contentType: string;
    pillar: string;
    angle?: string;
    publishedAt: string;
  }>;
  performanceInsights?: {
    topContentTypes: string[];
    topTopics: string[];
    topFormats: string[];
    topPostingTimes: string[];
    weakContentTypes: string[];
  };
}

export interface ScheduleSlot {
  date: string; // YYYY-MM-DD
  dayName: string;
  time: string; // HH:mm
}

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const CONTENT_ANGLES = [
  "problem_pain_point",
  "common_mistake",
  "how_to",
  "checklist",
  "comparison",
  "myth_vs_fact",
  "faq",
  "beginner_guide",
  "expert_tip",
  "behind_the_scenes",
  "product_education",
  "product_benefit",
  "use_case",
  "seasonal",
  "story",
  "promotion",
  "offer",
  "community_question",
] as const;

/** Angles that require specific data to exist */
const CONDITIONAL_ANGLES: Record<string, (ctx: BusinessContext) => boolean> = {
  social_proof: (ctx) => (ctx.testimonials?.length ?? 0) > 0,
  before_after: () => false, // No before/after data structure yet
  story: (ctx) => !!(ctx.brandStory || ctx.founderStory),
  promotion: (ctx) => !!ctx.promotion?.name,
  offer: (ctx) => !!ctx.promotion?.name,
};

/** Map content types to their preferred angles */
const TYPE_ANGLE_MAP: Record<string, string[]> = {
  educational: ["how_to", "checklist", "myth_vs_fact", "faq", "beginner_guide", "expert_tip", "product_education", "common_mistake", "comparison"],
  promotional: ["product_benefit", "use_case", "promotion", "offer", "problem_pain_point"],
  engagement: ["community_question", "faq", "comparison", "myth_vs_fact"],
  branding: ["behind_the_scenes", "story", "expert_tip"],
  tips: ["how_to", "checklist", "expert_tip", "common_mistake", "beginner_guide"],
  storytelling: ["story", "behind_the_scenes", "use_case"],
  "social proof": ["social_proof"],
};

const DAY_NAME_MAP = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ═══════════════════════════════════════════════════════════════════
// ZOD SCHEMAS
// ═══════════════════════════════════════════════════════════════════

const ContentPlanSchema = z.object({
  title: z.string().min(5),
  content_type: z.enum([
    "Educational",
    "Promotional",
    "Engagement",
    "Branding",
    "Tips",
    "Storytelling",
    "Social Proof",
  ]),
  pillar: z.string().min(1),
  objective: z.enum(["awareness", "consideration", "conversion", "engagement"]),
  angle: z.string().min(1),
  audience_stage: z.enum(["awareness", "consideration", "conversion", "retention"]),
  content_goal: z.enum(["educate", "entertain", "inspire", "convert", "engage", "inform"]),
  topic: z.string().min(10),
  hook: z.string().min(10),
  key_points: z.array(z.string()).min(2).max(5),
  cta: z.string().min(5),
  visual_direction: z.string().min(10),
  format: z.enum(["Feed", "Carousel", "Reels", "Story"]),
  product_reference: z.string().nullable(),
  data_sources: z.array(z.string()).min(1),
});

const AIResponseSchema = z.object({
  plans: z.array(ContentPlanSchema).min(1),
});

// ═══════════════════════════════════════════════════════════════════
// 1. SCHEDULE GENERATOR
// ═══════════════════════════════════════════════════════════════════

/**
 * Generate posting schedule based on posting days within a 30-day window.
 * The number of posts is determined by the calendar, NOT hardcoded to 30.
 */
export function generatePostingSchedule(
  startDate: Date,
  postingDays: string[],
  postingTime: string,
  durationDays: number = 30
): ScheduleSlot[] {
  const targetDays = postingDays.length > 0 ? postingDays : ["Monday", "Wednesday", "Friday"];
  const times =
    postingTime && postingTime.includes(",")
      ? postingTime
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [postingTime || "19:00"];

  const slots: ScheduleSlot[] = [];

  const current = new Date(startDate);
  current.setDate(current.getDate() + 1); // Start from tomorrow

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + durationDays);

  while (current <= endDate) {
    const dayName = DAY_NAME_MAP[current.getDay()];
    if (targetDays.includes(dayName)) {
      for (const t of times) {
        slots.push({
          date: current.toISOString().split("T")[0],
          dayName,
          time: t,
        });
      }
    }
    current.setDate(current.getDate() + 1);
  }

  return slots;
}

// ═══════════════════════════════════════════════════════════════════
// 2. STRATEGY DISTRIBUTION ENGINE
// ═══════════════════════════════════════════════════════════════════

/**
 * Calculate weighted proportional allocation of content types.
 * E.g. { Educational: 40, Promotional: 20, ... } with 13 total posts
 * → { Educational: 5, Promotional: 3, Engagement: 2, Branding: 1, Tips: 1, Storytelling: 1 }
 */
export function calculateDistribution(
  strategyDistribution: Record<string, number>,
  totalPosts: number,
  availableTypes: string[]
): Record<string, number> {
  // Filter to only available types
  const filtered: Record<string, number> = {};
  let totalWeight = 0;

  for (const type of availableTypes) {
    const weight = strategyDistribution[type] || 0;
    if (weight > 0) {
      filtered[type] = weight;
      totalWeight += weight;
    }
  }

  // If no weights, distribute evenly
  if (totalWeight === 0) {
    const perType = Math.max(1, Math.floor(totalPosts / availableTypes.length));
    const result: Record<string, number> = {};
    let assigned = 0;
    for (const type of availableTypes) {
      const count = Math.min(perType, totalPosts - assigned);
      if (count > 0) {
        result[type] = count;
        assigned += count;
      }
    }
    // Distribute remainder
    while (assigned < totalPosts) {
      for (const type of availableTypes) {
        if (assigned >= totalPosts) break;
        result[type] = (result[type] || 0) + 1;
        assigned++;
      }
    }
    return result;
  }

  // Weighted proportional allocation
  const result: Record<string, number> = {};
  let assigned = 0;

  const types = Object.keys(filtered);
  for (const type of types) {
    const exact = (filtered[type] / totalWeight) * totalPosts;
    result[type] = Math.floor(exact);
    assigned += result[type];
  }

  // Distribute remainder by largest fractional part
  const remainders = types
    .map((type) => ({
      type,
      remainder: ((filtered[type] / totalWeight) * totalPosts) - Math.floor((filtered[type] / totalWeight) * totalPosts),
    }))
    .sort((a, b) => b.remainder - a.remainder);

  let remaining = totalPosts - assigned;
  for (const { type } of remainders) {
    if (remaining <= 0) break;
    result[type]++;
    remaining--;
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════
// 3. AVAILABLE ANGLES RESOLVER
// ═══════════════════════════════════════════════════════════════════

/**
 * Get available angles for a content type, filtered by data availability.
 */
function getAvailableAngles(contentType: string, context: BusinessContext): string[] {
  const typeKey = contentType.toLowerCase();
  const candidateAngles = TYPE_ANGLE_MAP[typeKey] || ["how_to", "expert_tip", "product_education"];

  return candidateAngles.filter((angle) => {
    const condition = CONDITIONAL_ANGLES[angle];
    if (condition) return condition(context);
    return true; // Unconditional angles are always available
  });
}

// ═══════════════════════════════════════════════════════════════════
// 4. BUSINESS RULE VALIDATOR
// ═══════════════════════════════════════════════════════════════════

interface ValidationResult {
  valid: boolean;
  issues: string[];
  cleaned: ContentPlanItem;
}

/**
 * Validate a single content plan item against business rules.
 * Ensures no fabricated claims, products, or testimonials.
 */
function validateContentPlan(
  plan: ContentPlanItem,
  context: BusinessContext
): ValidationResult {
  const issues: string[] = [];
  const cleaned = { ...plan };

  // Check product_reference exists
  if (plan.product_reference) {
    const exists = context.products.some(
      (p) => p.name.toLowerCase() === plan.product_reference!.toLowerCase()
    );
    if (!exists) {
      issues.push(`Product "${plan.product_reference}" not found in database`);
      cleaned.product_reference = null;
    }
  }

  // Check social proof without testimonials
  if (
    plan.content_type.toLowerCase() === "social proof" &&
    (!context.testimonials || context.testimonials.length === 0)
  ) {
    issues.push("Social proof content created without testimonials data");
  }

  // Check storytelling without brand/founder story
  if (
    plan.angle === "story" &&
    !context.brandStory &&
    !context.founderStory
  ) {
    issues.push("Story angle used without brandStory or founderStory data");
  }

  // Check promotion reference without active promotion
  if (
    (plan.angle === "promotion" || plan.angle === "offer") &&
    !context.promotion?.name
  ) {
    issues.push("Promotion/offer angle used without active promotion data");
  }

  // Check if price/discount is mentioned but doesn't match database
  const textToCheck = [plan.title, plan.topic, plan.hook, plan.cta, ...plan.key_points].join(" ");

  // Check for discount claims when no promotion exists
  if (/diskon|discount|potongan|promo\s+\d/i.test(textToCheck) && !context.promotion?.discount) {
    issues.push("Discount/promo claim without active promotion data");
  }

  // Check for price mentions that don't match any product
  const pricePattern = /Rp\.?\s*[\d.,]+/i;
  if (pricePattern.test(textToCheck)) {
    const hasMatchingProduct = context.products.some((p) => p.price && textToCheck.includes(p.price));
    if (!hasMatchingProduct) {
      issues.push("Price mentioned may not match any product in database");
    }
  }

  // Scan for suspicious invented claims in text fields
  const suspiciousPatterns = [
    /jaminan mutu/i,
    /garansi kepuasan/i,
    /rating tinggi/i,
    /pelanggan setia/i,
    /hasil nyata/i,
    /kualitas terjamin/i,
    /solusi terbaik/i,
    /respon cepat/i,
    /testimoni/i,
    /pengalaman terbaik/i,
    /rating kepuasan/i,
    /garansi\s+\d/i,
    /sertifikat/i,
    /penghargaan/i,
    /award/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(textToCheck)) {
      // Only flag if the data doesn't actually exist in context
      if (!context.testimonials || context.testimonials.length === 0) {
        issues.push(`Potentially fabricated claim detected: ${pattern.source}`);
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    cleaned,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 5. DUPLICATE DETECTOR
// ═══════════════════════════════════════════════════════════════════

interface DuplicateResult {
  hasDuplicates: boolean;
  duplicateIndices: number[];
}

/**
 * Detect duplicate topics and angle+type combinations.
 */
function detectDuplicates(plans: ContentPlanItem[]): DuplicateResult {
  const duplicateIndices: number[] = [];
  const seenTopics = new Map<string, number>();
  const seenCombos = new Map<string, number>();

  for (let i = 0; i < plans.length; i++) {
    const p = plans[i];
    const topicKey = p.topic.toLowerCase().trim().slice(0, 50);
    const comboKey = `${p.content_type}|${p.angle || ""}|${p.topic.toLowerCase().trim().slice(0, 30)}`;

    if (seenTopics.has(topicKey)) {
      duplicateIndices.push(i);
    } else {
      seenTopics.set(topicKey, i);
    }

    if (seenCombos.has(comboKey)) {
      if (!duplicateIndices.includes(i)) {
        duplicateIndices.push(i);
      }
    } else {
      seenCombos.set(comboKey, i);
    }
  }

  return {
    hasDuplicates: duplicateIndices.length > 0,
    duplicateIndices,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 6. QUALITY GATE
// ═══════════════════════════════════════════════════════════════════

interface QualityScore {
  score: number;
  breakdown: {
    distributionAccuracy: number;
    angleDiversity: number;
    formatDiversity: number;
    dataGrounding: number;
    noDuplicates: number;
  };
}

/**
 * Score the quality of a generated plan (0-100).
 */
function calculateQualityScore(
  plans: ContentPlanItem[],
  expectedDistribution: Record<string, number>,
  context: BusinessContext
): QualityScore {
  const total = plans.length;
  if (total === 0) {
    return {
      score: 0,
      breakdown: { distributionAccuracy: 0, angleDiversity: 0, formatDiversity: 0, dataGrounding: 0, noDuplicates: 0 },
    };
  }

  // 1. Distribution accuracy (30 points)
  const actualDist: Record<string, number> = {};
  for (const p of plans) {
    const t = p.content_type.toLowerCase();
    actualDist[t] = (actualDist[t] || 0) + 1;
  }
  let distError = 0;
  for (const [type, expected] of Object.entries(expectedDistribution)) {
    const actual = actualDist[type.toLowerCase()] || 0;
    distError += Math.abs(actual - expected);
  }
  const distributionAccuracy = Math.max(0, 30 - distError * 3);

  // 2. Angle diversity (20 points)
  const uniqueAngles = new Set(plans.map((p) => p.angle).filter(Boolean));
  const angleDiversity = Math.min(20, (uniqueAngles.size / Math.min(total, 10)) * 20);

  // 3. Format diversity (15 points)
  const uniqueFormats = new Set(plans.map((p) => p.format));
  const formatDiversity = Math.min(15, (uniqueFormats.size / 4) * 15);

  // 4. Data grounding (20 points)
  let grounded = 0;
  for (const p of plans) {
    if (p.data_sources && p.data_sources.length > 0) grounded++;
    if (p.product_reference) {
      const exists = context.products.some(
        (prod) => prod.name.toLowerCase() === p.product_reference!.toLowerCase()
      );
      if (exists) grounded += 0.5;
    }
  }
  const dataGrounding = Math.min(20, (grounded / total) * 20);

  // 5. No duplicates (15 points)
  const { duplicateIndices } = detectDuplicates(plans);
  const noDuplicates = Math.max(0, 15 - duplicateIndices.length * 5);

  const score = Math.round(distributionAccuracy + angleDiversity + formatDiversity + dataGrounding + noDuplicates);

  return {
    score,
    breakdown: {
      distributionAccuracy,
      angleDiversity,
      formatDiversity,
      dataGrounding,
      noDuplicates,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// 7. SAFE FALLBACK GENERATOR
// ═══════════════════════════════════════════════════════════════════

/**
 * Safe fallback: generates generic briefs based ONLY on verified database data.
 * No fabricated claims, no "jaminan mutu", no "solusi terbaik", no fake testimonials.
 */
export function generateSafeFallbackPlan(
  context: BusinessContext,
  schedule: ScheduleSlot[],
  distribution: Record<string, number>
): ContentPlanItem[] {
  const { businessName, category, description, targetAudience, products, promotion, brandKit } = context;
  const plans: ContentPlanItem[] = [];

  // Build ordered type queue from distribution
  const typeQueue: string[] = [];
  for (const [type, count] of Object.entries(distribution)) {
    for (let i = 0; i < count; i++) {
      typeQueue.push(type);
    }
  }

  // Shuffle to avoid clustering same types
  for (let i = typeQueue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [typeQueue[i], typeQueue[j]] = [typeQueue[j], typeQueue[i]];
  }

  const productNames = products.map((p) => p.name);

  for (let i = 0; i < schedule.length; i++) {
    const slot = schedule[i];
    const contentType = typeQueue[i] || typeQueue[typeQueue.length - 1] || "Educational";
    const availableAngles = getAvailableAngles(contentType, context);
    const angle = availableAngles[i % availableAngles.length] || "how_to";

    // Pick a product reference ONLY for types that need it
    let productRef: string | null = null;
    const dataSources: string[] = ["business_profile"];

    if (["promotional", "tips"].includes(contentType.toLowerCase()) && products.length > 0) {
      const prod = products[i % products.length];
      productRef = prod.name;
      dataSources.push(`product:${prod.name}`);
    }

    if (promotion?.name && contentType.toLowerCase() === "promotional") {
      dataSources.push("promotion");
    }

    dataSources.push("brand_kit");

    // Generate safe content based on type — NO fabricated claims
    const brief = generateSafeBrief(contentType, angle, context, productRef, i);

    plans.push({
      dayIndex: i + 1,
      scheduledDate: slot.date,
      scheduledTime: slot.time,
      title: brief.title,
      content_type: contentType.toLowerCase(),
      pillar: brief.pillar,
      objective: brief.objective,
      topic: brief.topic,
      hook: brief.hook,
      key_points: brief.keyPoints,
      cta: brief.cta,
      visual_direction: `Desain ${brandKit.visualStyle} dengan palet warna ${brandKit.primaryColor} dan ${brandKit.secondaryColor}`,
      format: brief.format,
      platform: "instagram",
      status: "PLANNED",
      angle,
      audience_stage: brief.audienceStage,
      product_reference: productRef,
      content_goal: brief.contentGoal,
      data_sources: dataSources,
    });
  }

  return plans;
}

interface SafeBrief {
  title: string;
  pillar: string;
  objective: string;
  topic: string;
  hook: string;
  keyPoints: string[];
  cta: string;
  format: "Feed" | "Carousel" | "Reels" | "Story";
  audienceStage: string;
  contentGoal: string;
}

function generateSafeBrief(
  contentType: string,
  angle: string,
  context: BusinessContext,
  productRef: string | null,
  index: number
): SafeBrief {
  const { businessName, category, description, targetAudience, products, promotion } = context;
  const audience = targetAudience || "pelanggan";
  const productInfo = productRef
    ? products.find((p) => p.name === productRef)
    : null;

  const formats: Array<"Feed" | "Carousel" | "Reels" | "Story"> = ["Feed", "Carousel", "Reels", "Story"];

  switch (contentType.toLowerCase()) {
    case "educational":
      return {
        title: productInfo
          ? `Apa yang perlu diketahui tentang ${productInfo.name} di industri ${category}`
          : `Hal penting yang perlu diketahui tentang ${category}`,
        pillar: "edukasi",
        objective: "awareness",
        topic: productInfo
          ? `Edukasi tentang ${productInfo.name}${productInfo.description ? `: ${productInfo.description}` : ""}`
          : `Edukasi tentang industri ${category} untuk ${audience}`,
        hook: `Banyak ${audience} belum tahu hal penting ini tentang ${category}.`,
        keyPoints: [
          `Informasi dasar tentang ${category} yang relevan untuk ${audience}`,
          productInfo?.description || `Cara memilih ${category} yang sesuai kebutuhan`,
          `Hal yang perlu diperhatikan saat memilih layanan ${businessName}`,
        ],
        cta: "Simpan postingan ini sebagai referensi!",
        format: formats[index % 2 === 0 ? 1 : 0], // Alternate Carousel/Feed
        audienceStage: "awareness",
        contentGoal: "educate",
      };

    case "promotional":
      if (promotion?.name && promotion?.discount) {
        return {
          title: `${promotion.name} — Penawaran dari ${businessName}`,
          pillar: "promosi",
          objective: "conversion",
          topic: `Promo ${promotion.name}${productInfo ? ` untuk ${productInfo.name}` : ""}`,
          hook: `Penawaran ${promotion.name}${promotion.discount ? ` diskon ${promotion.discount}` : ""} dari ${businessName}.`,
          keyPoints: [
            `Detail penawaran: ${promotion.name}${promotion.discount ? ` (diskon ${promotion.discount})` : ""}`,
            productInfo ? `Berlaku untuk ${productInfo.name}` : `Berlaku untuk layanan ${businessName}`,
            `Periode: ${promotion.startDate || "sekarang"} — ${promotion.endDate || "selama persediaan masih ada"}`,
          ],
          cta: context.whatsapp
            ? `Hubungi kami di WhatsApp ${context.whatsapp} untuk informasi lebih lanjut!`
            : "Hubungi kami melalui link di bio!",
          format: "Feed",
          audienceStage: "conversion",
          contentGoal: "convert",
        };
      }
      return {
        title: productInfo
          ? `Kenali ${productInfo.name} dari ${businessName}`
          : `Layanan ${category} dari ${businessName}`,
        pillar: "promosi",
        objective: "consideration",
        topic: productInfo
          ? `Informasi tentang ${productInfo.name}${productInfo.price ? ` (${productInfo.price})` : ""}`
          : `Layanan ${category} dari ${businessName}`,
        hook: productInfo
          ? `${productInfo.name}${productInfo.price ? ` tersedia mulai ${productInfo.price}` : ""} di ${businessName}.`
          : `${businessName} menyediakan layanan ${category} untuk ${audience}.`,
        keyPoints: [
          productInfo?.description || `Layanan ${category} yang tersedia di ${businessName}`,
          productInfo?.benefits || `Dirancang untuk kebutuhan ${audience}`,
          context.whatsapp ? `Informasi lengkap via WhatsApp ${context.whatsapp}` : "Hubungi kami untuk informasi lengkap",
        ],
        cta: "Klik link di bio untuk informasi selengkapnya!",
        format: "Feed",
        audienceStage: "consideration",
        contentGoal: "convert",
      };

    case "engagement":
      return {
        title: `Diskusi: Apa pendapat Anda tentang ${category}?`,
        pillar: "interaksi",
        objective: "engagement",
        topic: `Pertanyaan interaktif seputar ${category} untuk ${audience}`,
        hook: `Kami ingin tahu pendapat Anda tentang ${category}. Ceritakan pengalaman Anda!`,
        keyPoints: [
          `Pertanyaan terbuka untuk ${audience} tentang pengalaman dengan ${category}`,
          "Ajak audiens berbagi pendapat di kolom komentar",
          `Bangun diskusi seputar kebutuhan ${audience}`,
        ],
        cta: "Tulis jawaban Anda di kolom komentar! 👇",
        format: "Feed",
        audienceStage: "retention",
        contentGoal: "engage",
      };

    case "branding":
      return {
        title: `Mengenal ${businessName} lebih dekat`,
        pillar: "brand awareness",
        objective: "awareness",
        topic: `Profil dan nilai-nilai ${businessName} di industri ${category}`,
        hook: description
          ? `${businessName}: ${description.slice(0, 100)}${description.length > 100 ? "..." : ""}`
          : `Kenalan lebih dekat dengan ${businessName}, layanan ${category} Anda.`,
        keyPoints: [
          description || `${businessName} bergerak di industri ${category}`,
          `Melayani ${audience} dengan fokus pada kebutuhan pelanggan`,
          context.location ? `Berlokasi di ${context.location}` : `Tersedia untuk ${audience} di Indonesia`,
        ],
        cta: `Follow @${businessName.toLowerCase().replace(/\s+/g, "")} untuk update terbaru!`,
        format: index % 2 === 0 ? "Reels" : "Feed",
        audienceStage: "awareness",
        contentGoal: "inform",
      };

    case "tips":
      return {
        title: productInfo
          ? `Tips menggunakan ${productInfo.name} dengan optimal`
          : `Tips praktis seputar ${category}`,
        pillar: "tips & trik",
        objective: "engagement",
        topic: productInfo
          ? `Panduan penggunaan ${productInfo.name}`
          : `Tips praktis ${category} untuk ${audience}`,
        hook: productInfo
          ? `Sudah menggunakan ${productInfo.name}? Simak tips berikut agar hasilnya lebih optimal.`
          : `Tips ${category} yang bermanfaat untuk ${audience}.`,
        keyPoints: [
          productInfo ? `Cara memaksimalkan ${productInfo.name}` : `Cara memilih ${category} yang tepat`,
          `Kesalahan umum yang sering dilakukan oleh ${audience}`,
          `Konsultasikan kebutuhan Anda dengan tim ${businessName}`,
        ],
        cta: "Ketuk dua kali jika tips ini bermanfaat! ❤️",
        format: "Carousel",
        audienceStage: "consideration",
        contentGoal: "educate",
      };

    case "storytelling":
      if (context.brandStory) {
        return {
          title: `Cerita di balik ${businessName}`,
          pillar: "brand story",
          objective: "consideration",
          topic: `Brand story ${businessName}`,
          hook: context.brandStory.slice(0, 120),
          keyPoints: [
            `Perjalanan ${businessName} di industri ${category}`,
            `Dedikasi terhadap kebutuhan ${audience}`,
            description || `Visi ${businessName} ke depan`,
          ],
          cta: "Ceritakan pengalaman Anda bersama kami di komentar!",
          format: "Carousel",
          audienceStage: "consideration",
          contentGoal: "inspire",
        };
      }
      return {
        title: `Di balik layar ${businessName}`,
        pillar: "behind the scenes",
        objective: "awareness",
        topic: `Proses kerja dan aktivitas di ${businessName}`,
        hook: `Penasaran apa yang terjadi di balik layar ${businessName}?`,
        keyPoints: [
          `Aktivitas sehari-hari di ${businessName}`,
          `Proses yang kami lalui untuk melayani ${audience}`,
          `Komitmen ${businessName} dalam industri ${category}`,
        ],
        cta: "Follow kami untuk lebih banyak konten behind the scenes!",
        format: "Reels",
        audienceStage: "awareness",
        contentGoal: "entertain",
      };

    default:
      return {
        title: `Informasi terbaru dari ${businessName}`,
        pillar: "informasi",
        objective: "awareness",
        topic: `Update dari ${businessName} di industri ${category}`,
        hook: `Ada yang baru dari ${businessName} untuk ${audience}!`,
        keyPoints: [
          description || `${businessName} hadir di industri ${category}`,
          `Informasi terkini untuk ${audience}`,
        ],
        cta: "Kunjungi link di bio untuk info selengkapnya!",
        format: formats[index % formats.length],
        audienceStage: "awareness",
        contentGoal: "inform",
      };
  }
}

// ═══════════════════════════════════════════════════════════════════
// 8. AI CONTENT PLANNER (Main Entry Point)
// ═══════════════════════════════════════════════════════════════════

export async function generate30DayPlanWithAI(
  context: BusinessContext,
  preferences: {
    postsPerWeek: number;
    postingDays: string[];
    postingTime: string;
    contentTypes: string[];
    strategyDistribution: Record<string, number>;
  },
  startDate: Date = new Date()
): Promise<{
  success: boolean;
  plans?: ContentPlanItem[];
  source?: "openai";
  modelUsed?: string;
  qualityScore?: number;
  validationIssues?: string[];
  error?: string;
}> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  // Step 1: Generate posting schedule (backend-determined dates)
  const schedule = generatePostingSchedule(
    startDate,
    preferences.postingDays,
    preferences.postingTime,
    30
  );

  const totalPosts = schedule.length;
  if (totalPosts === 0) {
    return {
      success: false,
      error: "Jadwal posting tidak dapat dibuat. Silakan periksa pilihan hari posting di form Content Preferences.",
    };
  }

  // Step 2: Calculate weighted distribution
  const selectedTypes =
    preferences.contentTypes.length > 0
      ? preferences.contentTypes
      : ["Educational", "Promotional", "Engagement", "Branding", "Tips"];

  const distribution = calculateDistribution(
    preferences.strategyDistribution,
    totalPosts,
    selectedTypes
  );

  // Step 3: Check API Key — NO FALLBACK
  if (!apiKey || apiKey.length < 15 || apiKey.includes("your_openai_api_key")) {
    return {
      success: false,
      error: "API Key OpenAI belum dikonfigurasi di file .env.local atau tidak valid. Silakan isi OPENAI_API_KEY terlebih dahulu.",
    };
  }

  // Step 4: AI generation with retries
  let lastError = "Gagal membuat konten dengan OpenAI.";
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const aiResponse = await callOpenAI(
        context,
        preferences,
        schedule,
        distribution,
        model,
        apiKey,
        attempt
      );

      if (!aiResponse.success || !aiResponse.plans) {
        lastError = aiResponse.error || lastError;
        // Non-recoverable errors: don't waste time retrying
        if (
          aiResponse.status === 404 ||
          aiResponse.status === 401 ||
          aiResponse.status === 429
        ) {
          return {
            success: false,
            error: lastError,
          };
        }
        continue;
      }

      const aiResult = aiResponse.plans;

      // Step 5: Zod validation
      const { validPlans, zodIssues } = validateWithZod(aiResult);

      if (validPlans.length === 0) {
        lastError = `Validasi struktur konten gagal: ${zodIssues.slice(0, 2).join("; ")}`;
        console.warn(`[Planner] Attempt ${attempt}: All plans failed Zod validation.`);
        continue;
      }

      // Step 6: Assign schedule dates (backend controls dates)
      const scheduledPlans = assignScheduleDates(validPlans, schedule, preferences.postingTime);

      // Step 7: Business rule validation
      const allIssues: string[] = [...zodIssues];
      const validatedPlans: ContentPlanItem[] = [];

      for (const plan of scheduledPlans) {
        const result = validateContentPlan(plan, context);
        allIssues.push(...result.issues);
        validatedPlans.push(result.cleaned);
      }

      // Step 8: Duplicate detection
      const { hasDuplicates, duplicateIndices } = detectDuplicates(validatedPlans);
      if (hasDuplicates) {
        allIssues.push(`${duplicateIndices.length} potensi duplikasi terdeteksi`);
      }

      // Step 9: Quality gate
      const quality = calculateQualityScore(validatedPlans, distribution, context);

      if (quality.score < 70 && attempt < maxAttempts) {
        console.warn(
          `[Planner] Attempt ${attempt}: Quality score ${quality.score}/100 is below threshold. Retrying...`
        );
        lastError = `Kualitas konten di bawah standar (Skor: ${quality.score}/100). Mencoba ulang...`;
        continue;
      }

      console.log(
        `[Planner] Attempt ${attempt}: Quality score ${quality.score}/100. Issues: ${allIssues.length}`
      );

      return {
        success: true,
        plans: validatedPlans,
        source: "openai",
        modelUsed: model,
        qualityScore: quality.score,
        validationIssues: allIssues.length > 0 ? allIssues : undefined,
      };
    } catch (err: any) {
      lastError = err.message || "Terjadi kesalahan saat memproses konten AI.";
      console.warn(`[Planner] Attempt ${attempt} failed:`, err);
    }
  }

  // NO FALLBACK GENERATOR — Return explicit error alert!
  return {
    success: false,
    error: `Gagal membuat rencana konten AI: ${lastError}`,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 9. OPENAI API CALL
// ═══════════════════════════════════════════════════════════════════

async function callOpenAI(
  context: BusinessContext,
  preferences: {
    postsPerWeek: number;
    postingDays: string[];
    postingTime: string;
    contentTypes: string[];
    strategyDistribution: Record<string, number>;
  },
  schedule: ScheduleSlot[],
  distribution: Record<string, number>,
  model: string,
  apiKey: string,
  attempt: number
): Promise<{ success: boolean; plans?: any[]; error?: string; status?: number }> {
  // Build schedule string with concrete dates for AI
  const scheduleStr = schedule
    .map((s, i) => `${i + 1}. ${s.date} ${s.dayName} ${s.time}`)
    .join("\n");

  // Build distribution string
  const distributionStr = Object.entries(distribution)
    .map(([type, count]) => `- ${type}: ${count} posts`)
    .join("\n");

  // Build product summary
  const productsSummary =
    context.products.length > 0
      ? context.products
          .map(
            (p, i) =>
              `${i + 1}. ${p.name}${p.price ? ` (Harga: ${p.price})` : ""}${
                p.description ? ` — ${p.description}` : ""
              }${p.benefits ? ` | Manfaat: ${p.benefits}` : ""}`
          )
          .join("\n")
      : "Tidak ada produk/layanan spesifik terdaftar.";

  // Build promotion summary
  const promoStr = context.promotion?.name
    ? `Promo Aktif: ${context.promotion.name}${
        context.promotion.discount ? ` (Diskon: ${context.promotion.discount})` : ""
      }${context.promotion.startDate ? ` | Mulai: ${context.promotion.startDate}` : ""}${
        context.promotion.endDate ? ` | Berakhir: ${context.promotion.endDate}` : ""
      }`
    : "Tidak ada promo aktif saat ini.";

  // Build content history
  const historyStr =
    context.recentContent && context.recentContent.length > 0
      ? context.recentContent
          .map(
            (c) =>
              `- ${c.publishedAt}: "${c.title}" (${c.contentType}, ${c.pillar}${
                c.angle ? `, angle: ${c.angle}` : ""
              })`
          )
          .join("\n")
      : "Belum ada riwayat konten sebelumnya.";

  // Available angles
  const allAvailableAngles: string[] = [];
  for (const type of Object.keys(distribution)) {
    const angles = getAvailableAngles(type, context);
    for (const a of angles) {
      if (!allAvailableAngles.includes(a)) allAvailableAngles.push(a);
    }
  }

  // Data availability flags
  const dataFlags = [
    `Testimonials: ${context.testimonials && context.testimonials.length > 0 ? "YES" : "NO — Do NOT create social proof content"}`,
    `Brand Story: ${context.brandStory ? "YES" : "NO — Do NOT create brand story content"}`,
    `Founder Story: ${context.founderStory ? "YES" : "NO — Do NOT create founder story content"}`,
    `Active Promotion: ${context.promotion?.name ? "YES" : "NO — Do NOT create promotion/offer content unless referencing products only"}`,
    `Products: ${context.products.length > 0 ? `YES (${context.products.length} items)` : "NO — Focus on brand and industry knowledge"}`,
  ].join("\n");

  // Performance insights (when available)
  let performanceStr = "";
  if (context.performanceInsights) {
    const pi = context.performanceInsights;
    performanceStr = `\n=== PERFORMANCE INSIGHTS (USE TO OPTIMIZE) ===\n`;
    if (pi.topContentTypes.length > 0) performanceStr += `Top performing content types: ${pi.topContentTypes.join(", ")}\n`;
    if (pi.topTopics.length > 0) performanceStr += `Top performing topics: ${pi.topTopics.join(", ")}\n`;
    if (pi.topFormats.length > 0) performanceStr += `Top performing formats: ${pi.topFormats.join(", ")}\n`;
    if (pi.topPostingTimes.length > 0) performanceStr += `Best posting times: ${pi.topPostingTimes.join(", ")}\n`;
    if (pi.weakContentTypes.length > 0) performanceStr += `Weak content types (reduce): ${pi.weakContentTypes.join(", ")}\n`;
    performanceStr += `Use these insights to create more of what works and less of what doesn't.`;
  }

  const systemPrompt = `You are an expert Instagram Content Strategist for small businesses.

Your job is to create a strategic content calendar,
NOT captions and NOT final creative assets.

Your output must be based ONLY on verified information
provided in BUSINESS DATA.

NON-NEGOTIABLE RULES:

1. Never invent business facts.
2. Never invent products or services.
3. Never invent prices or discounts.
4. Never invent testimonials or reviews.
5. Never invent ratings or statistics.
6. Never invent guarantees or certifications.
7. Never claim customer results unless explicitly provided.
8. Never create social proof unless real social proof data exists.
9. Never create before/after claims unless real data exists.
10. Never repeat the same topic or angle unnecessarily.
11. Respect the requested content distribution EXACTLY.
12. Respect posting dates and times as provided.
13. Use the business's actual products/services when relevant.
14. Do not force products into every post.
15. Balance educational, engagement, branding and promotional content.
16. Every content idea must have a clear audience and objective.
17. Content must be useful even when it is not promotional.
18. Do not write the final caption.
19. Do not generate image prompts that contain unsupported claims.
20. If required information is unavailable, choose another content angle.

CONTENT QUALITY PRINCIPLES:

- Specific > generic
- Useful > promotional
- Original > repetitive
- Audience-focused > business-focused
- Evidence-based > invented claims
- Clear hook > clickbait

CONTENT ANGLES YOU MAY USE:
${allAvailableAngles.join(", ")}

Generate content strictly in Indonesian language.
Writing tone: ${context.brandKit.writingTone}
Visual style: ${context.brandKit.visualStyle}

OUTPUT FORMAT (valid JSON only):
{
  "plans": [
    {
      "title": "Short catchy title",
      "content_type": "Educational | Promotional | Engagement | Branding | Tips | Storytelling",
      "pillar": "Pillar name",
      "objective": "awareness | consideration | conversion | engagement",
      "angle": "one of the available angles",
      "audience_stage": "awareness | consideration | conversion | retention",
      "content_goal": "educate | entertain | inspire | convert | engage | inform",
      "topic": "Concise topic (min 10 chars)",
      "hook": "Attention-grabbing opening (min 10 chars)",
      "key_points": ["Point 1", "Point 2", "Point 3"],
      "cta": "Call to action",
      "visual_direction": "Visual description with brand colors",
      "format": "Feed | Carousel | Reels | Story",
      "product_reference": "exact product name or null",
      "data_sources": ["business_profile", "product:name", "brand_kit", "promotion"]
    }
  ]
}

Generate exactly ${schedule.length} content plans.`;

  const userPrompt = `=== BUSINESS DATA (FROM DATABASE) ===

Business Name: ${context.businessName}
Industry Category: ${context.category}
Description: ${context.description || "Tidak ada deskripsi"}
Target Audience: ${context.targetAudience || "Umum"}
Location: ${context.location || "Indonesia"}
WhatsApp: ${context.whatsapp || "-"}
Website: ${context.website || "-"}

=== PRODUCTS / SERVICES ===
${productsSummary}

=== PROMOTION ===
${promoStr}

=== BRAND KIT ===
Primary Color: ${context.brandKit.primaryColor}
Secondary Color: ${context.brandKit.secondaryColor}
Visual Style: ${context.brandKit.visualStyle}
Writing Tone: ${context.brandKit.writingTone}
Language: ${context.brandKit.language || "Bahasa Indonesia"}
Emoji Usage: ${context.brandKit.emojiUsage || "Medium"}

=== DATA AVAILABILITY ===
${dataFlags}

=== CONTENT DISTRIBUTION (MUST FOLLOW) ===
${distributionStr}
Total posts: ${schedule.length}

=== POSTING SCHEDULE (USE THESE EXACT DATES) ===
${scheduleStr}

=== CONTENT HISTORY (AVOID REPEATING) ===
${historyStr}
${performanceStr}

=== INSTRUCTIONS ===
${attempt > 1 ? "IMPORTANT: Previous attempt had quality issues. Ensure maximum diversity in angles, formats, and topics. Avoid any repetition.\n" : ""}
Create ${schedule.length} unique, strategic Instagram content briefs.
Follow the distribution exactly.
Every brief must reference real data from above.
Never invent facts.`;

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        instructions: systemPrompt,
        input: userPrompt,
      }),
    });
  } catch (netErr: any) {
    return {
      success: false,
      error: `Gagal terhubung ke API OpenAI: ${netErr.message || "Koneksi jaringan terputus atau timeout."}`,
    };
  }

  if (!response.ok) {
    const errorText = await response.text();
    let detail = errorText;
    try {
      const errObj = JSON.parse(errorText);
      if (errObj.error?.message) {
        detail = errObj.error.message;
      }
    } catch {
      // Keep raw errorText
    }

    console.warn(`[OpenAI Responses API] returned ${response.status}: ${detail}`);

    if (response.status === 404) {
      return {
        success: false,
        status: 404,
        error: `Model OpenAI '${model}' atau endpoint tidak ditemukan (404 Not Found). Detail: ${detail}`,
      };
    } else if (response.status === 401) {
      return {
        success: false,
        status: 401,
        error: `API Key OpenAI tidak valid atau tidak memiliki akses (401 Unauthorized). Silakan periksa kembali OPENAI_API_KEY di file .env.local. Detail: ${detail}`,
      };
    } else if (response.status === 429) {
      return {
        success: false,
        status: 429,
        error: `Batas kuota/rate limit OpenAI tercapai (429 Quota Exceeded). Periksa sisa saldo atau kuota API akun OpenAI Anda. Detail: ${detail}`,
      };
    }

    return {
      success: false,
      status: response.status,
      error: `OpenAI Responses API mengembalikan error (${response.status}): ${detail}`,
    };
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    return {
      success: false,
      error: "Gagal membaca respons dari OpenAI (format bukan JSON yang valid).",
    };
  }

  // Extract text content from Responses API (or fallback structures)
  let content: string | undefined = undefined;

  if (typeof data.output_text === "string" && data.output_text.trim()) {
    content = data.output_text;
  } else if (Array.isArray(data.output)) {
    for (const item of data.output) {
      if (typeof item === "string" && item.trim()) {
        content = item;
        break;
      }
      if (item?.content) {
        if (typeof item.content === "string") {
          content = item.content;
          break;
        } else if (Array.isArray(item.content)) {
          const textPart = item.content.find(
            (c: any) => c.text || c.type === "text" || c.type === "output_text"
          );
          if (textPart) {
            content = textPart.text || textPart.content;
            break;
          }
        }
      }
      if (item?.text && typeof item.text === "string") {
        content = item.text;
        break;
      }
    }
  } else if (data.choices?.[0]?.message?.content) {
    content = data.choices[0].message.content;
  }

  if (!content) {
    return {
      success: false,
      error: "OpenAI Responses API mengembalikan respons konten kosong.",
    };
  }

  // Clean codeblock formatting if model returned ```json ... ```
  let cleanJson = content.trim();
  if (cleanJson.startsWith("```json")) {
    cleanJson = cleanJson.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  } else if (cleanJson.startsWith("```")) {
    cleanJson = cleanJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cleanJson);
  } catch {
    // Attempt fallback to find JSON block { ... }
    const firstBrace = cleanJson.indexOf("{");
    const lastBrace = cleanJson.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        parsed = JSON.parse(cleanJson.slice(firstBrace, lastBrace + 1));
      } catch {
        return {
          success: false,
          error: "Konten yang dihasilkan OpenAI tidak dapat diuraikan sebagai JSON.",
        };
      }
    } else {
      return {
        success: false,
        error: "Konten yang dihasilkan OpenAI tidak dapat diuraikan sebagai JSON.",
      };
    }
  }

  const rawPlans: any[] = parsed.plans || parsed.data || [];
  if (!Array.isArray(rawPlans) || rawPlans.length === 0) {
    return {
      success: false,
      error: "AI tidak menghasilkan daftar rencana konten ('plans' array kosong).",
    };
  }

  return {
    success: true,
    plans: rawPlans,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 10. ZOD VALIDATION PIPELINE
// ═══════════════════════════════════════════════════════════════════

function validateWithZod(rawPlans: any[]): {
  validPlans: any[];
  zodIssues: string[];
} {
  const validPlans: any[] = [];
  const zodIssues: string[] = [];

  for (let i = 0; i < rawPlans.length; i++) {
    const result = ContentPlanSchema.safeParse(rawPlans[i]);
    if (result.success) {
      validPlans.push(result.data);
    } else {
      const issues = result.error.issues.map(
        (issue) => `Plan ${i + 1}: ${issue.path.join(".")} — ${issue.message}`
      );
      zodIssues.push(...issues);

      // Try to salvage with defaults
      const salvaged = salvagePlan(rawPlans[i]);
      if (salvaged) validPlans.push(salvaged);
    }
  }

  return { validPlans, zodIssues };
}

/**
 * Attempt to fix minor Zod failures by applying safe defaults.
 */
function salvagePlan(raw: any): any | null {
  try {
    return {
      title: raw.title || "Konten",
      content_type: ["Educational", "Promotional", "Engagement", "Branding", "Tips", "Storytelling", "Social Proof"].includes(raw.content_type)
        ? raw.content_type
        : "Educational",
      pillar: raw.pillar || raw.content_type || "general",
      objective: ["awareness", "consideration", "conversion", "engagement"].includes(raw.objective)
        ? raw.objective
        : "engagement",
      angle: raw.angle || "how_to",
      audience_stage: ["awareness", "consideration", "conversion", "retention"].includes(raw.audience_stage)
        ? raw.audience_stage
        : "awareness",
      content_goal: ["educate", "entertain", "inspire", "convert", "engage", "inform"].includes(raw.content_goal)
        ? raw.content_goal
        : "educate",
      topic: raw.topic || raw.title || "Topik konten",
      hook: raw.hook || raw.title || "Hook konten",
      key_points: Array.isArray(raw.key_points) && raw.key_points.length >= 2
        ? raw.key_points
        : [raw.topic || "Point 1", raw.title || "Point 2"],
      cta: raw.cta || "Komentar atau DM untuk info lebih lanjut!",
      visual_direction: raw.visual_direction || "Desain professional dengan brand colors",
      format: ["Feed", "Carousel", "Reels", "Story"].includes(raw.format)
        ? raw.format
        : "Feed",
      product_reference: raw.product_reference || null,
      data_sources: Array.isArray(raw.data_sources) && raw.data_sources.length > 0
        ? raw.data_sources
        : ["business_profile"],
    };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// 11. SCHEDULE DATE ASSIGNMENT
// ═══════════════════════════════════════════════════════════════════

/**
 * Assign backend-determined schedule dates to AI-generated plans.
 * AI does NOT control dates — the backend does.
 */
function assignScheduleDates(
  plans: any[],
  schedule: ScheduleSlot[],
  defaultTime: string
): ContentPlanItem[] {
  return plans.slice(0, schedule.length).map((p, idx) => {
    const slot = schedule[idx] || schedule[schedule.length - 1];
    return {
      dayIndex: idx + 1,
      scheduledDate: slot.date,
      scheduledTime: slot.time || defaultTime || "19:00",
      title: p.title,
      content_type: (p.content_type || "Educational").toLowerCase(),
      pillar: (p.pillar || p.content_type || "general").toLowerCase(),
      objective: p.objective || "engagement",
      topic: p.topic || "",
      hook: p.hook || "",
      key_points: Array.isArray(p.key_points) ? p.key_points : [],
      cta: p.cta || "",
      visual_direction: p.visual_direction || "",
      format: ["Feed", "Carousel", "Reels", "Story"].includes(p.format) ? p.format : "Feed",
      platform: "instagram" as const,
      status: "PLANNED" as const,
      angle: p.angle || undefined,
      audience_stage: p.audience_stage || undefined,
      product_reference: p.product_reference || null,
      content_goal: p.content_goal || undefined,
      data_sources: Array.isArray(p.data_sources) ? p.data_sources : ["business_profile"],
    };
  });
}
