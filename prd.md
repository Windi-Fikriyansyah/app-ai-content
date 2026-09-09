1. Product Overview

AI Social Media Manager adalah SaaS yang membantu bisnis membuat dan mengelola konten Instagram secara otomatis menggunakan AI.

User cukup mengisi informasi bisnis dan Brand Kit.

Sistem kemudian:

Business Profile
       ↓
Brand Kit
       ↓
AI Content Planner
       ↓
30 Content Plans
       ↓
Lazy Generation
       ↓
Caption + Image
       ↓
AI Reviewer
       ↓
Approval
       ↓
Zernio
       ↓
Instagram
       ↓
Analytics
       ↓
AI Optimization

Konsep utama:

User tidak perlu membuat konten satu per satu.

User dapat membuat rencana konten 30 hari dalam satu klik, tetapi konten lengkap hanya dibuat ketika sudah mendekati jadwal posting.

2. Tujuan Produk
Primary Goal

Membantu UMKM menjalankan social media marketing dengan effort minimal.

Target outcome

User dapat:

membuat content plan 30 hari
menghasilkan caption otomatis
menghasilkan gambar AI
melakukan review dengan AI
melakukan approval
menjadwalkan konten
otomatis publish ke Instagram
melihat performa konten
mendapatkan rekomendasi konten berikutnya
3. Target User
Persona 1 — UMKM

Contoh:

salon
barbershop
restoran
coffee shop
toko fashion
jasa AC
travel
properti
bengkel
klinik
Persona 2 — Freelancer

Mengelola social media beberapa client.

Persona 3 — Agency

Mengelola banyak business/workspace sekaligus.

4. Scope MVP

MVP fokus pada:

Social Platform

Instagram

Format:

Feed
Carousel
Reels
Story
AI
Content Planner
Caption Writer
Image Generator
Content Reviewer
Analytics/Optimization Agent
Publishing

Menggunakan Zernio sebagai publishing infrastructure.

SaaS sendiri tetap menjadi source of truth untuk content management.

5. Application Menu

Dashboard:

Dashboard
│
├── Overview
├── AI Agent
├── Content Calendar
├── Content Library
├── Social Accounts
├── Analytics
├── Business Profile
├── Brand Kit
└── Settings
6. Dashboard

Dashboard menjadi halaman overview bisnis.

Statistics
Posts This Month
Scheduled Posts
Published Posts
AI Generated Posts
Engagement

Contoh:

┌─────────────────────────────────────┐
│ Posts This Month        24 / 30     │
│ Scheduled              12           │
│ Published              18           │
│ Engagement             +24.5%       │
└─────────────────────────────────────┘
Upcoming Posts

Menampilkan:

tanggal
jam
thumbnail
caption preview
platform
status
AI Activity

Contoh:

✓ Generated caption
✓ Generated image
✓ Content approved
⏳ Preparing tomorrow's post
7. Business Profile

Business Profile menjadi sumber informasi utama AI.

Data
Business Name
Business Category
Business Description
Target Audience
Location
Website
WhatsApp
Instagram
Business Hours
Products
Product Name
Description
Price
Benefits
Features
Image
Services
Service Name
Description
Price
Benefits
Duration
Promotions
Promotion Name
Description
Discount
Start Date
End Date
Terms
USPs

Contoh:

Gratis konsultasi
Buka sampai malam
Garansi 30 hari
Bisa COD

AI tidak boleh mengarang informasi bisnis yang tidak ada di database.

8. Brand Kit

Brand Kit digunakan AI untuk menjaga konsistensi branding.

Visual
Logo
Primary Color
Secondary Color
Font
Visual Style
Writing Style
Tone
Language
Emoji Usage
CTA Style
Hashtag Style

Contoh:

Tone:
Friendly

Language:
Bahasa Indonesia

Emoji:
Moderate

Style:
Casual + persuasive

CTA:
Soft CTA
9. AI Agent

AI Agent menjadi pusat automation.

Submenu:

AI Agent
│
├── Content Generation
├── Automation
└── Agent Activity
10. Content Generation

User dapat memilih:

Generate Content Plan

Input:

Duration:
30 Days

Posts / Week:
5

Content Types:
☑ Educational
☑ Promotional
☑ Engagement
☑ Branding
☑ Social Proof

Kemudian:

Generate Plan

AI tidak langsung membuat 30 gambar.

AI hanya membuat content plan.

11. Content Planner Agent

Tugas:

Membuat strategi konten berdasarkan:

Business Profile
Products
Services
Promotions
Brand Kit
Content History
Previous Performance

Output:

{
  "title": "Tips memilih AC yang hemat listrik",
  "content_type": "educational",
  "pillar": "education",
  "objective": "engagement",
  "topic": "Tips memilih AC hemat listrik",
  "hook": "AC kamu boros listrik?",
  "key_points": [
    "Pilih kapasitas sesuai ruangan",
    "Perhatikan rating energi",
    "Rutin membersihkan filter"
  ],
  "cta": "Simpan tips ini",
  "visual_direction": "Clean educational Instagram carousel"
}
12. Content Calendar

Calendar menjadi source of truth utama SaaS.

View:

Month
Week
Day

Contoh:

MON
09 Sep

Educational
Tips AC hemat listrik

PLANNED

Status:

PLANNED
GENERATING
DRAFT
REVIEW
APPROVAL
APPROVED
SCHEDULED
PUBLISHING
PUBLISHED
FAILED
CANCELLED
13. Lazy Generation

Ini adalah bagian penting dari architecture.

Saat user membuat 30 hari:

Yang dibuat:

30 Content Plans

Bukan:

30 Images
30 Captions
30 AI Reviews

Contoh:

1 Sep → Plan
2 Sep → Plan
3 Sep → Plan
...
30 Sep → Plan

Kemudian sistem melihat jadwal.

Misalnya posting:

10 September 19:00

Maka sekitar:

8–9 September

sistem mulai:

Content Plan
      ↓
Caption Agent
      ↓
Image Agent
      ↓
Review Agent

Caption dan Image dapat dijalankan parallel.

14. Generation Flow
PLANNED
   ↓
Check Schedule
   ↓
H-1 / H-2
   ↓
GENERATING
   ↓
┌───────────────┐
│               │
▼               ▼
Caption       Image
│               │
└───────┬───────┘
        ↓
      Review
        ↓
    APPROVAL
        ↓
    APPROVED
        ↓
      Zernio
        ↓
    SCHEDULED
15. Caption Agent

Input:

Content Brief
Business Profile
Brand Kit

Output:

{
  "hook": "...",
  "caption": "...",
  "cta": "...",
  "hashtags": [
    "#tipsac",
    "#jasaservice"
  ]
}

Rules:

tidak boleh mengarang harga
tidak boleh mengarang promo
tidak boleh membuat testimonial palsu
tidak boleh membuat statistik palsu
mengikuti tone Brand Kit
mengikuti bahasa bisnis
16. Image Agent

Image dibuat berdasarkan:

Content Brief
+
Brand Kit
+
Business Assets

Prioritas:

Existing Business Image
        ↓
Template
        ↓
AI Generated Image

Jadi tidak semua post harus menggunakan AI image.

17. AI Reviewer

Reviewer memeriksa:

Content
relevansi
akurasi
readability
CTA
branding
engagement potential
Visual
kualitas
kesesuaian brand
readability
Instagram suitability

Output:

{
  "score": 92,
  "status": "APPROVE",
  "issues": [],
  "suggestions": []
}

Status:

APPROVE
NEEDS_REVISION
REJECT

Maximum:

3 revision attempts
18. Approval

Ada dua mode.

Manual Approval

Default.

AI
 ↓
Review
 ↓
User Approval
 ↓
Zernio
Auto Pilot

User mengaktifkan:

☑ Auto Approve
☑ Auto Publish

Flow:

AI
 ↓
Review
 ↓
Approved automatically
 ↓
Zernio
 ↓
Instagram
19. Content Library

Menampilkan seluruh konten.

Filter:

All
Draft
Scheduled
Published
Failed
Archived

Search:

Search content...

Filter:

Content Type
Date
Status
Platform
Campaign
20. Content Detail

Halaman detail:

┌───────────────────────────────┐
│ Image                         │
│                               │
│                               │
└───────────────────────────────┘

Caption

CTA

Hashtags

Content Type

Scheduled Date

Platform

AI Score

Action:

Edit
Regenerate
Approve
Schedule
Cancel
Delete
21. Social Accounts

User dapat connect:

Instagram

Integration ditangani melalui Zernio.

SaaS menyimpan:

provider
provider_account_id
username
profile_image
status
timezone

Jangan menyimpan credential/social token secara sembarangan jika Zernio sudah menangani OAuth/token management.

22. Zernio Integration

Zernio menjadi:

Publishing Infrastructure
SaaS
 ↓
Zernio API
 ↓
Instagram

Zernio menangani:

social account connection
media upload
scheduling
publishing
retry
platform-specific handling
webhook
publishing status

Sedangkan SaaS menangani:

AI
content planning
calendar
brand
approval
business data
billing
user experience
23. Publishing Flow

Setelah user approve:

APPROVED
   ↓
Prepare Media
   ↓
Upload Media
   ↓
Create Zernio Post
   ↓
Save Zernio Post ID
   ↓
SCHEDULED

Database:

zernio_post_id
zernio_account_id
scheduled_at
timezone
publish_status
24. Webhook

Zernio mengirim event ke:

/api/webhooks/zernio

Contoh:

scheduled
publishing
published
failed

Flow:

Zernio
   ↓
Webhook
   ↓
Next.js API
   ↓
PostgreSQL
   ↓
Content status updated

Contoh:

SCHEDULED
     ↓
PUBLISHING
     ↓
PUBLISHED

Jika gagal:

SCHEDULED
     ↓
PUBLISHING
     ↓
FAILED
25. Analytics

Analytics mengambil data performa social account.

Metrics:

Reach
Impressions
Likes
Comments
Shares
Saves
Followers
Engagement Rate

Per-content:

Post
Reach
Likes
Comments
Shares
Saves
Engagement Rate
26. AI Analytics Agent

AI menganalisa performa.

Contoh:

Konten edukasi mendapatkan engagement 34% lebih tinggi dibandingkan konten promosi dalam 30 hari terakhir.

Kemudian AI memberikan rekomendasi:

Increase:
Educational Content
Tips
Carousel

Decrease:
Hard Selling

Feedback masuk kembali ke Content Planner.

Analytics
    ↓
AI Analysis
    ↓
Content Strategy
    ↓
Next Content Plan
27. AI Agent Activity

Menampilkan aktivitas AI secara realtime-ish.

Contoh:

14:01
Content Planner
Generated 30 content plans

14:05
Caption Agent
Generated caption for Sep 9

14:05
Image Agent
Generated image for Sep 9

14:06
Reviewer
Score: 94

14:07
Publisher
Scheduled via Zernio
28. Automation

User dapat menentukan:

Posts per week
Posting days
Posting time
Timezone
Auto Generate
Auto Review
Auto Approve
Auto Publish

Contoh:

Monday     19:00
Wednesday  19:00
Friday     19:00
29. Notification

Notification:

Content ready for approval
Generation failed
Publishing failed
Post published
Instagram disconnected

Channel MVP:

In-app notification
Email
30. Full Next.js Architecture

Saya rekomendasikan:

                    ┌───────────────┐
                    │    Browser    │
                    └───────┬───────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │     Next.js      │
                  │ App Router       │
                  └────────┬─────────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
       PostgreSQL        Redis          R2/S3
            │              │
            │              ▼
            │          BullMQ
            │              │
            │              ▼
            │        Worker Service
            │              │
            │       ┌──────┼───────┐
            │       ▼      ▼       ▼
            │      AI    Image   Review
            │
            ▼
       Application Data

                     ↓

                  Zernio
                     ↓
                 Instagram
31. Tech Stack
Frontend
Next.js
TypeScript
React
Tailwind CSS
shadcn/ui
Backend

Tetap:

Next.js

Gunakan:

Route Handlers
Server Actions
Server Components

Tidak perlu Laravel.

32. Database

Saya rekomendasikan:

PostgreSQL

ORM:

Prisma

atau:

Drizzle

Untuk project ini saya lebih condong ke Prisma karena development speed dan developer experience.

33. Queue

Gunakan:

Redis
+
BullMQ

Queue:

content-planning
content-generation
caption-generation
image-generation
content-review
social-publish
analytics-sync
notification
34. Worker

Jangan menjalankan pekerjaan AI berat langsung dari request HTTP.

Contoh:

POST /api/content/generate

cukup:

Create Job
     ↓
Redis
     ↓
BullMQ
     ↓
Worker

Worker menjalankan:

OpenAI
Image Generation
Zernio
Analytics
35. Deployment Architecture

Untuk production:

                 Vercel
                   │
                   ▼
             Next.js App
                   │
          ┌────────┼────────┐
          ▼        ▼        ▼
      Postgres   Redis      R2
                        

                  │
                  ▼
             Worker Server
                  │
          ┌───────┼────────┐
          ▼       ▼        ▼
        OpenAI   Zernio   Jobs
Vercel

Untuk:

frontend
API
dashboard
authentication
webhook
lightweight server operations
Worker VPS

Untuk:

BullMQ
AI generation jobs
image generation jobs
analytics jobs
publishing jobs

Ini penting karena Vercel bukan tempat ideal untuk long-running worker.

36. Project Structure

Saya sarankan:

src/
│
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   │
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── ai-agent/
│   │   ├── calendar/
│   │   ├── content/
│   │   ├── analytics/
│   │   ├── social-accounts/
│   │   ├── business/
│   │   ├── brand-kit/
│   │   └── settings/
│   │
│   └── api/
│       ├── ai/
│       ├── content/
│       ├── social/
│       ├── analytics/
│       ├── webhooks/
│       └── cron/
│
├── components/
│   ├── ui/
│   ├── dashboard/
│   ├── calendar/
│   ├── content/
│   ├── ai-agent/
│   └── analytics/
│
├── lib/
│   ├── ai/
│   │   ├── planner.ts
│   │   ├── caption.ts
│   │   ├── image.ts
│   │   ├── reviewer.ts
│   │   └── analytics.ts
│   │
│   ├── zernio/
│   │   ├── client.ts
│   │   ├── accounts.ts
│   │   ├── media.ts
│   │   └── publishing.ts
│   │
│   ├── db/
│   ├── redis/
│   ├── storage/
│   └── utils/
│
├── workers/
│   ├── planner.worker.ts
│   ├── caption.worker.ts
│   ├── image.worker.ts
│   ├── review.worker.ts
│   ├── publish.worker.ts
│   └── analytics.worker.ts
│
└── types/
37. Database Schema

Core tables:

users
workspaces
subscriptions

business_profiles
brand_kits

products
services
promotions

social_accounts

content_calendars
content_posts
content_assets

content_generations
content_reviews

publish_jobs

ai_agent_logs

analytics
notifications
38. Workspace Architecture

Saya sangat menyarankan menggunakan:

Workspace

bukan hanya user_id.

Karena nanti bisa mendukung Agency.

User
  │
  ├── Workspace A
  │      ├── Business A
  │      └── Instagram A
  │
  ├── Workspace B
  │      ├── Business B
  │      └── Instagram B
  │
  └── Workspace C

Dengan begitu satu user bisa mengelola banyak bisnis.

39. AI Cost Tracking

Setiap AI generation harus dicatat.

Table:

content_generations

Fields:

id
workspace_id
content_post_id
agent_type
provider
model
input_tokens
output_tokens
image_resolution
estimated_cost
status
created_at
completed_at

Contoh:

Caption
GPT
$0.002

Image
GPT Image
$0.04

Review
GPT
$0.001

Sehingga admin dapat mengetahui:

AI Cost / Workspace
AI Cost / User
AI Cost / Post
AI Cost / Month
40. Cost Optimization

Lazy generation adalah salah satu fitur paling penting untuk menjaga margin.

Jangan:

Generate 30 plans
Generate 30 captions
Generate 30 images
Generate 30 reviews

langsung.

Lebih baik:

Generate 30 plans
       ↓
Wait
       ↓
H-2
       ↓
Generate caption + image
       ↓
Review

Jika user menghapus post pada tanggal 20:

AI image tanggal 20 belum dibuat.

Tidak ada biaya terbuang.

41. Cron System

Scheduler menjalankan pengecekan:

Every 15 minutes

Contoh:

Cron
 ↓
Find posts scheduled within 48 hours
 ↓
Check status
 ↓
Dispatch generation job

Endpoint:

/api/cron/content-generation

Cron harus menggunakan secret:

CRON_SECRET
42. Idempotency

Sangat penting agar post tidak digenerate atau dipublish dua kali.

Contoh:

content_post_id
generation_type

harus memiliki unique constraint.

Misalnya:

post_123 + image

tidak boleh dibuat dua kali secara tidak sengaja.

Publishing juga:

content_post_id + zernio_post_id

harus dapat dilacak.

43. Error Handling

Jika AI gagal:

GENERATION_FAILED

Sistem retry:

Attempt 1
Attempt 2
Attempt 3

Jika tetap gagal:

FAILED

User mendapat notification.

44. Security

Wajib:

Authentication
Authorization
Workspace isolation
Rate limiting
API validation
Webhook verification
Encrypted secrets
Environment variables
Audit logs

Semua API harus memastikan:

User → Workspace → Resource

Contoh user tidak boleh mengakses:

/content/123

jika content tersebut bukan milik workspace-nya.

45. Subscription

Struktur sudah dipersiapkan untuk SaaS billing.

Contoh:

Starter
30 posts/month
1 Instagram
AI captions
AI images
Pro
100 posts/month
3 Instagram
Analytics
Auto Pilot
Agency
Unlimited/High limit
Multiple workspaces
Multiple brands

Billing dapat ditambahkan kemudian.

46. MVP Development Order

Saya sarankan jangan langsung mengerjakan semuanya.

Urutannya:

Phase 1 — Foundation
Next.js
TypeScript
Tailwind
shadcn
PostgreSQL
Prisma
Authentication
Workspace
Phase 2 — Business
Business Profile
Products
Services
Promotions
Brand Kit
Phase 3 — Content
Content Calendar
Content Post
Content Library
Phase 4 — AI
Content Planner
Caption Agent
Image Agent
Reviewer
Phase 5 — Queue
Redis
BullMQ
Worker
Lazy Generation
Phase 6 — Zernio
Connect Instagram
Media upload
Schedule
Publish
Webhook
Phase 7 — Analytics
Analytics
AI Analytics
Content recommendations
Phase 8 — SaaS
Subscription
Usage limits
Billing
Notifications
47. MVP User Journey

User pertama kali masuk:

Register
   ↓
Create Workspace
   ↓
Business Profile
   ↓
Brand Kit
   ↓
Connect Instagram
   ↓
Generate 30-Day Plan
   ↓
Calendar populated

Kemudian:

H-2
 ↓
AI generates caption
 ↓
AI generates image
 ↓
AI reviews

Jika manual:

User receives notification
 ↓
Review
 ↓
Approve

Kemudian:

SaaS
 ↓
Zernio
 ↓
Instagram

Setelah publish:

Instagram
 ↓
Analytics
 ↓
AI Analytics
 ↓
Future Content Strategy
48. Prinsip Architecture

Saya akan menetapkan 5 prinsip utama untuk project ini:

1. Next.js adalah application utama

Tidak perlu Laravel.

Frontend + Backend
        ↓
      Next.js
2. SaaS adalah source of truth

Calendar dan content lifecycle berada di database SaaS.

Bukan di Zernio.

3. Zernio hanya publishing infrastructure
AI + Content Management
       = SaaS

Social Publishing
       = Zernio
4. AI generation asynchronous

Jangan:

HTTP Request
 ↓
Generate Image
 ↓
Wait 20 seconds
 ↓
Response

Tetapi:

HTTP Request
 ↓
Create Job
 ↓
Response

Redis
 ↓
Worker
 ↓
AI
5. Lazy Generation
Plan first
Generate later

Ini yang membuat biaya AI lebih efisien.

49. Target MVP

MVP dianggap selesai jika user bisa melakukan:

Register
   ↓
Create Business
   ↓
Setup Brand
   ↓
Connect Instagram
   ↓
Generate 30-day content plan
   ↓
View Calendar
   ↓
AI generates content H-1/H-2
   ↓
Review
   ↓
Approve
   ↓
Schedule via Zernio
   ↓
Instagram publishes
   ↓
View analytics

Dengan architecture ini, saya justru menyarankan tidak membuat microservices dulu. Buat satu repository Next.js untuk application + satu worker process yang masih berada di repository yang sama. Nanti kalau user sudah banyak, worker AI/image/publishing baru dipisahkan secara horizontal.

Kalau mengikuti PRD ini, stack final yang saya pilih adalah:

Next.js + TypeScript
React
Tailwind CSS
shadcn/ui
Prisma
PostgreSQL
Redis
BullMQ
OpenAI API
GPT Image
Zernio API
Cloudflare R2
Vercel
VPS Worker
Sentry

Ini menurut saya jauh lebih sederhana dan cocok untuk MVP dibanding Next.js + Laravel, tetapi tetap punya jalur scaling yang jelas.