Saya menemukan beberapa masalah penting:

strategyDistribution sudah dikirim tetapi tidak benar-benar digunakan untuk menentukan distribusi konten.
Ada fallback content generator yang hardcoded, sehingga kualitasnya bisa turun drastis ketika OpenAI gagal.
Prompt mengatakan strictly database, tetapi beberapa bagian masih berpotensi mengarang fakta seperti "jaminan mutu", "respon cepat", "pelanggan setia", "hasil nyata", dan sebagainya.
social proof bahkan membuat testimoni palsu. Ini harus dihapus.
storytelling membuat "kisah nyata" padahal tidak ada data customer story. Ini juga berbahaya.
Prompt meminta 30 konten, tetapi tidak memberikan tanggal posting ke AI, sehingga AI tidak bisa melakukan seasonal planning berdasarkan hari/tanggal.
AI tidak diberi content history dan analytics sebelumnya, padahal itu penting untuk membuat strategi yang semakin pintar.
Semua content type diperlakukan terlalu generik. Planner seharusnya memilih content angle, bukan sekadar mengulang kategori.
Tidak ada mekanisme anti-repetition yang kuat.
Validasi output AI masih lemah karena langsung JSON.parse() lalu menerima hampir semua bentuk output.
gpt-4o-mini masih menjadi default model di kode.
Prompt mengatakan "30-day" tetapi sebenarnya kode membuat 30 posting, bukan necessarily kalender 30 hari. Kalau user memilih 3 post/week, 30 posting bisa berlangsung sekitar 10 minggu.

Jadi saya tidak menyarankan hanya memperbaiki beberapa baris. Content Planner-nya sebaiknya sedikit dirombak.

Arsitektur yang lebih bagus

Saya sarankan Content Planner dibuat seperti ini:

Business Profile
       +
Products / Services
       +
Promotions
       +
Brand Kit
       +
Content Preferences
       +
Posting Schedule
       +
Content History
       +
Analytics
       ↓
┌──────────────────────────┐
│    STRATEGY PLANNER      │
└────────────┬─────────────┘
             ↓
      Content Distribution
             ↓
      Content Concepts
             ↓
      30 Content Briefs
             ↓
        Validation
             ↓
      Duplicate Check
             ↓
        Save to DB

Yang penting:

AI Planner jangan langsung disuruh "buat 30 caption".

Planner harus berpikir sebagai content strategist.

1. Perbaiki konsep 30-day

Ini salah satu hal yang menurut saya paling penting.

Saat ini:

while (scheduledDates.length < 30)

artinya:

"buat 30 posting."

Padahal nama fitur Anda adalah:

Generate 30-Day Content Plan

Lebih baik database memiliki:

planStartDate
planEndDate

dan jumlah posting ditentukan dari:

postsPerWeek
+
postingDays

Misalnya:

Duration: 30 days
Posting days: Mon, Wed, Fri

Maka hasilnya sekitar:

Sep 10
Sep 12
Sep 14
Sep 17
Sep 19
...

bukan dipaksa menjadi 30 post.

Kalau user ingin 30 posting, buat pilihan berbeda:

Plan Duration:
○ 30 days
○ 60 days
○ 90 days
2. strategyDistribution harus benar-benar digunakan

Sekarang Anda sudah punya:

strategyDistribution: Record<string, number>

tetapi pada generator template hanya dilakukan:

const typeIndex = (planCount - 1) % selectedTypes.length;

Artinya:

Educational
Promotional
Engagement
Branding
Tips
Educational
Promotional
...

Ini bukan strategy distribution.

Misalnya user memilih:

{
  "Educational": 40,
  "Promotional": 20,
  "Engagement": 15,
  "Branding": 10,
  "Tips": 10,
  "Social Proof": 5
}

maka planner harus menghasilkan kira-kira:

Educational     12
Promotional      6
Engagement       4-5
Branding         3
Tips             3
Social Proof     1-2

bukan rotation sederhana.

3. Tambahkan Content Angle

Ini menurut saya missing paling besar.

Sekarang output Anda:

title
content_type
pillar
objective
topic
hook
key_points
cta
visual_direction
format

Sudah lumayan.

Tetapi tambahkan:

angle
audience_stage
product_reference
content_goal

Misalnya:

{
  "content_type": "educational",
  "pillar": "education",
  "angle": "common_mistake",
  "audience_stage": "awareness",
  "content_goal": "educate",
  "product_reference": "AC Split 1 PK"
}

Dengan begitu AI tidak hanya tahu:

"buat konten edukasi"

tetapi tahu:

"buat konten edukasi dengan angle kesalahan umum."

4. Tambahkan content_angle yang bervariasi

Planner sebaiknya mempunyai pilihan angle seperti:

Problem / Pain Point
Common Mistake
How To
Checklist
Comparison
Myth vs Fact
FAQ
Beginner Guide
Expert Tip
Before / After
Behind The Scenes
Product Education
Product Benefit
Use Case
Seasonal
Story
Community Question
Promotion
Offer
Social Proof

Tetapi AI hanya boleh menggunakan angle yang datanya tersedia.

Contoh:

Tidak ada testimonial?

Social Proof

jangan dibuat.

Tidak ada before/after?

Before / After

jangan dibuat.

5. Social Proof Anda sekarang salah

Bagian ini harus diubah.

Kode sekarang membuat:

"Apa Kata Pelanggan..."

kemudian:

"Pengalaman terbaik..."

dan:

Rating kepuasan tinggi...

Padahal BusinessContext tidak mempunyai:

testimonials
reviews
ratings
customerStories

Jadi AI/template generator berpotensi membuat social proof palsu.

Tambahkan data:

testimonials?: Array<{
  customerName?: string;
  quote: string;
  rating?: number;
  product?: string;
}>;

Dan rule:

IF testimonials.length === 0
THEN social proof content is unavailable
6. Storytelling juga harus diperbaiki

Sekarang Anda menghasilkan:

Kisah Nyata:
Bagaimana X Membantu Kebutuhan Pelanggan

Padahal tidak ada customer story.

Lebih aman:

Brand Story
Founder Story
Product Story
Behind The Scenes

hanya jika data tersedia.

Tambahkan:

brandStory?: string;
founderStory?: string;
customerStories?: ...
7. Jangan membuat klaim yang tidak ada di database

Ini juga penting.

Contoh sekarang:

Jaminan mutu
Respon cepat
Pelanggan setia
Kualitas terjamin
Garansi kepuasan

Padahal belum tentu bisnis punya data tersebut.

Prompt harus memiliki rule yang lebih keras:

NEVER invent:
- guarantees
- certifications
- awards
- ratings
- testimonials
- customer results
- statistics
- discounts
- delivery claims
- response times
- warranties
- availability
- prices
- product features

kecuali ada di database.

8. Jangan gunakan fallback "solusi terbaik"

Bagian ini:

benefits: `Solusi ${category} terbaik`

harus dihapus.

Karena itu claim yang tidak berasal dari database.

Kalau bisnis tidak memiliki product:

products = []

lebih baik:

productReference = null

dan AI membuat content berdasarkan:

business description
services
brand information

bukan membuat fake product.

9. Masukkan Content History

Ini sangat penting untuk SaaS Anda.

Planner harus menerima:

recentContent?: Array<{
  title: string;
  topic: string;
  contentType: string;
  pillar: string;
  publishedAt: string;
}>;

Contoh:

Last 10 posts:

Tips memilih AC
Promo AC 1 PK
Cara membersihkan AC
Promo service AC
Tips hemat listrik

AI kemudian harus menghindari:

Tips memilih AC

lagi dalam periode terlalu dekat.

10. Masukkan Analytics

Lebih bagus lagi:

performanceInsights?: {
  topContentTypes: string[];
  topTopics: string[];
  topFormats: string[];
  topPostingTimes: string[];
  weakContentTypes: string[];
};

Contoh:

Top:
Carousel
Educational
Tips

Weak:
Hard Selling

Planner kemudian membuat:

lebih banyak educational carousel

bukan sekadar random content.

11. Masukkan tanggal ke AI

Sekarang AI hanya mendapat:

Posts Per Week

tetapi tidak mendapat daftar tanggal yang sebenarnya.

Saya sarankan kirim:

SCHEDULE:

1. 2026-09-10 Thursday 19:00
2. 2026-09-12 Saturday 19:00
3. 2026-09-14 Monday 19:00
...

Dengan begitu AI bisa mempertimbangkan:

Weekend
Weekday
Beginning of month
End of month
Seasonal events
12. Perbaiki System Prompt

Prompt Anda sudah punya fondasi bagus, terutama aturan database-only.

Tetapi saya akan mengubahnya menjadi lebih ketat:

You are an expert Instagram Content Strategist for small businesses.

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
11. Respect the requested content distribution.
12. Respect posting dates and times.
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

Ini jauh lebih aman.

13. Output JSON juga perlu diperkuat

Saya sarankan:

{
  "plans": [
    {
      "scheduled_date": "2026-09-10",
      "scheduled_time": "19:00",
      "title": "...",
      "content_type": "educational",
      "pillar": "education",
      "angle": "common_mistake",
      "objective": "awareness",
      "audience_stage": "awareness",
      "topic": "...",
      "hook": "...",
      "key_points": [
        "...",
        "...",
        "..."
      ],
      "cta": "...",
      "format": "Carousel",
      "visual_direction": "...",
      "product_reference": null,
      "data_sources": [
        "business_profile",
        "service_1"
      ]
    }
  ]
}

Saya suka data_sources karena nanti sangat berguna untuk audit AI.

Misalnya user bertanya:

"Kenapa AI membuat konten ini?"

Sistem bisa menunjukkan:

Based on:
✓ Business Profile
✓ Service: AC Cleaning
✓ Brand Kit
14. Jangan biarkan AI menentukan tanggal sendiri

Ini penting.

Backend harus menentukan tanggal.

AI hanya menentukan:

content_type
angle
topic
objective

Backend yang menentukan:

scheduledDate
scheduledTime

Jadi:

Backend
 ↓
Generate valid schedule
 ↓
AI
 ↓
Assign content strategy
 ↓
Backend
 ↓
Validate

Bukan:

AI → bebas menentukan tanggal

Ini mencegah AI menghasilkan tanggal yang tidak sesuai preference.

15. Gunakan Structured Output + Zod

Ini wajib saya ubah.

Sekarang:

JSON.parse(content)

langsung dipercaya.

Lebih baik:

OpenAI
 ↓
Structured Output
 ↓
Zod validation
 ↓
Business rules validation
 ↓
Duplicate validation
 ↓
Database

Contoh:

const ContentPlanSchema = z.object({
  title: z.string().min(5),
  content_type: z.enum([
    "Educational",
    "Promotional",
    "Engagement",
    "Branding",
    "Tips",
    "Storytelling",
    "Social Proof"
  ]),
  pillar: z.string(),
  objective: z.enum([
    "awareness",
    "consideration",
    "conversion",
    "engagement"
  ]),
  topic: z.string().min(10),
  hook: z.string().min(10),
  key_points: z.array(z.string()).min(2).max(5),
  cta: z.string(),
  visual_direction: z.string(),
  format: z.enum([
    "Feed",
    "Carousel",
    "Reels",
    "Story"
  ])
});
16. Tambahkan Business Rule Validator

Setelah AI selesai:

AI Output
 ↓
Schema Validation
 ↓
Business Validation

Misalnya:

validateContentPlan(plan, context)

yang memeriksa:

✓ Product exists?
✓ Promotion exists?
✓ Price exists?
✓ CTA valid?
✓ Content type allowed?
✓ Format allowed?
✓ Duplicate topic?
✓ Unsupported claim?
17. Quality Gate

Saya bahkan akan membuat:

Planner
   ↓
Zod
   ↓
Business Validator
   ↓
Duplicate Detector
   ↓
Quality Score
   ↓
Database

Kalau:

score < 70

maka:

Regenerate

Maksimal:

2 attempts
18. Jangan selalu memasukkan produk

Kode sekarang terlalu bergantung pada:

const prod = productList[(planCount - 1) % productList.length];

Akibatnya produk berpotensi muncul terus-menerus.

Lebih baik:

Educational
→ bisa product atau industry knowledge

Engagement
→ audience problem

Branding
→ business / people / process

Tips
→ customer problem

Promotional
→ product/service

Social Proof
→ testimonial jika tersedia

Dengan demikian feed terasa seperti akun bisnis sungguhan, bukan katalog produk.

19. Content Mix yang lebih realistis

Misalnya:

40% Educational
20% Promotional
15% Engagement
10% Branding
10% Tips
5% Social Proof

Tapi jangan hanya menghitung jumlah.

Harus juga menjaga:

Format diversity
Topic diversity
Angle diversity
Product diversity
Objective diversity

Contoh 30 post:

Educational
├── Carousel
├── Reels
├── Feed
├── FAQ
├── Checklist
└── Myth vs Fact

Promotional
├── Product benefit
├── Offer
├── Use case
└── Problem → solution

Engagement
├── Question
├── Poll
├── This or That
└── Opinion
20. Kesimpulan Review

Kode sekarang: 6.5/10 untuk MVP prototype.

Fondasinya sudah bagus:

TypeScript interface ✅
Database context ✅
Lazy Generation concept ✅
OpenAI integration ✅
JSON output ✅
fallback mechanism ✅
scheduled dates ✅
brand context ✅

Tetapi untuk production SaaS, saya akan menaikkannya menjadi:

Business Data
      ↓
Strategy Engine
      ↓
Distribution Engine
      ↓
AI Content Planner
      ↓
Zod Validation
      ↓
Business Rule Validation
      ↓
Duplicate Detection
      ↓
Quality Gate
      ↓
30 Content Briefs

Dan yang paling penting, saya akan menghapus generator template hardcoded sebagai generator konten utama. Fallback boleh tetap ada untuk availability, tetapi fallback sebaiknya hanya membuat safe generic briefs berdasarkan data yang benar-benar tersedia, bukan membuat klaim seperti "jaminan mutu", "rating tinggi", "kisah nyata", atau "solusi terbaik".