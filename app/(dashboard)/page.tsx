import React from "react";

export default function DashboardPage() {
  return (
    <>
      {/* SECTION 1: WELCOME HERO & QUICK PROMPT LAUNCHER */}
      <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-3 sm:p-space-xl shadow-sm relative overflow-hidden">
        {/* Subtle ambient laser glow backdrop */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute right-40 -bottom-20 w-60 h-60 bg-tertiary-fixed-dim/15 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col gap-space-lg">
          {/* Banner Header & Status */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-container text-primary font-label-sm text-label-sm mb-2 border border-primary/20">
                <span className="material-symbols-outlined text-xs" data-icon="bolt">
                  bolt
                </span>
                <span>Autonomous Pipeline Active</span>
              </div>
              <h1 className="font-headline-md text-headline-sm sm:text-headline-md text-on-surface tracking-tight">
                Halo Alex, AI Agent Anda telah mengotomatisasi{" "}
                <span className="text-primary font-extrabold underline decoration-primary/30 underline-offset-4">
                  48 postingan
                </span>{" "}
                minggu ini.
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                Semua saluran berjalan sesuai jadwal. Tingkat akurasi tone Brand Kit saat ini berada di 98.4%.
              </p>
            </div>

            {/* Quick Metrics Micro-Trio */}
            <div className="flex items-center gap-space-md border border-outline-variant/30 p-2.5 rounded-lg bg-surface/80 shrink-0">
              <div className="px-2 text-center">
                <span className="block font-code-sm text-xs text-outline">Queue</span>
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold">12 Post</span>
              </div>
              <div className="w-px h-6 bg-outline-variant/30"></div>
              <div className="px-2 text-center">
                <span className="block font-code-sm text-xs text-outline">Saved Time</span>
                <span className="font-headline-sm text-headline-sm text-tertiary font-bold">16.4 Jam</span>
              </div>
            </div>
          </div>

          {/* Inline Prompt Bar: Autonomous Prompt Launcher */}
          <div className="bg-surface rounded-xl border border-outline-variant/50 p-2 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
              <div className="flex items-center gap-2 px-3 text-primary">
                <span className="material-symbols-outlined" data-icon="neurology">
                  neurology
                </span>
              </div>
              <input
                className="flex-1 bg-transparent border-0 font-body-md text-body-md text-on-surface focus:ring-0 focus:outline-none placeholder:text-outline text-sm"
                placeholder="Ketik ide atau topik: misal 'Buat 5 carousel LinkedIn tentang tren AI 2025 dengan tone profesional'..."
                type="text"
                defaultValue="Buat 5 carousel LinkedIn tentang tren AI 2025 dengan tone profesional dan studi kasus B2B SaaS"
              />
              <div className="flex items-center gap-2 justify-end pt-2 md:pt-0 border-t md:border-t-0 border-outline-variant/30">
                <div className="flex items-center gap-1">
                  <span className="px-2 py-1 rounded bg-surface-container text-on-surface-variant font-code-sm text-xs">
                    LinkedIn
                  </span>
                  <span className="px-2 py-1 rounded bg-surface-container text-on-surface-variant font-code-sm text-xs">
                    Carousel
                  </span>
                </div>
                <button className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-container text-on-primary rounded-lg font-label-md text-label-md transition-transform active:scale-[0.98] shadow-xs">
                  <span className="material-symbols-outlined text-sm" data-icon="bolt">
                    bolt
                  </span>
                  <span>Generate Cepat</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: KPI STATS CARDS (4 Grid Layout) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-lg">
        {/* Metric Card 1 */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-sm flex flex-col justify-between hover:border-outline transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant">Total Konten Diotomatisasi</p>
              <h3 className="font-headline-lg text-headline-lg text-on-surface mt-1 tracking-tight font-extrabold">
                1,284
              </h3>
            </div>
            <div className="w-9 h-9 rounded-lg bg-surface-container text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-lg" data-icon="auto_mode">
                auto_mode
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-xs">
            <span className="inline-flex items-center font-label-sm text-label-sm text-tertiary font-bold">
              <span className="material-symbols-outlined text-sm mr-0.5" data-icon="trending_up">
                trending_up
              </span>
              +18.4%
            </span>
            <span className="text-outline font-body-sm text-body-sm">dibanding bulan lalu</span>
          </div>
        </div>

        {/* Metric Card 2 */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-sm flex flex-col justify-between hover:border-outline transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant">AI Agent Runs</p>
              <h3 className="font-headline-lg text-headline-lg text-on-surface mt-1 tracking-tight font-extrabold">
                342
              </h3>
            </div>
            <div className="w-9 h-9 rounded-lg bg-secondary-container text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-lg" data-icon="precision_manufacturing">
                precision_manufacturing
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-xs">
            <span className="inline-flex items-center font-label-sm text-label-sm text-tertiary font-bold">
              <span className="material-symbols-outlined text-sm mr-0.5" data-icon="check_circle">
                check_circle
              </span>
              99.2% Sukses
            </span>
            <span className="text-outline font-body-sm text-body-sm">eksekusi tanpa galat</span>
          </div>
        </div>

        {/* Metric Card 3 */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-sm flex flex-col justify-between hover:border-outline transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant">Jadwal Antrean Aktif</p>
              <h3 className="font-headline-lg text-headline-lg text-on-surface mt-1 tracking-tight font-extrabold">
                38 <span className="font-headline-sm text-headline-sm text-outline font-normal">konten</span>
              </h3>
            </div>
            <div className="w-9 h-9 rounded-lg bg-surface-container text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-lg" data-icon="queue">
                queue
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
              <span>IG · LinkedIn · 𝕏 · TT</span>
            </div>
            <span className="text-tertiary font-label-sm font-semibold">Ready to post</span>
          </div>
        </div>

        {/* Metric Card 4 */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-sm flex flex-col justify-between hover:border-outline transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant">Rata-rata Engagement</p>
              <h3 className="font-headline-lg text-headline-lg text-on-surface mt-1 tracking-tight font-extrabold">
                5.8%
              </h3>
            </div>
            <div className="w-9 h-9 rounded-lg bg-surface-variant text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-lg" data-icon="query_stats">
                query_stats
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-xs">
            <span className="inline-flex items-center font-label-sm text-label-sm text-tertiary font-bold">
              <span className="material-symbols-outlined text-sm mr-0.5" data-icon="north_east">
                north_east
              </span>
              +2.1%
            </span>
            <span className="text-outline font-body-sm text-body-sm">vs konten non-AI</span>
          </div>
        </div>
      </section>

      {/* SECTION 3: MAIN PIPELINE & LIVE AGENT ACTIVITY (COL-8 / COL-4) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        {/* Left: Jadwal & Saluran Aktif (Content Pipeline) - Col 8 */}
        <div className="lg:col-span-8 flex flex-col gap-space-base">
          {/* Section Header Card */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-space-md border-b border-outline-variant/20">
              <div>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">
                  Jadwal & Saluran Aktif (Content Pipeline)
                </h2>
                <p className="font-body-sm text-body-sm text-outline">
                  Distribusi otomasi omni-channel sepanjang minggu ini
                </p>
              </div>
              {/* Filter Tags */}
              <div className="flex items-center gap-1.5 overflow-x-auto shrink-0">
                <button className="px-2.5 py-1 rounded bg-secondary-container text-primary font-label-sm text-label-sm whitespace-nowrap">
                  Semua (38)
                </button>
                <button className="px-2.5 py-1 rounded bg-surface hover:bg-surface-container text-on-surface-variant font-label-sm text-label-sm whitespace-nowrap">
                  Review (4)
                </button>
                <button className="px-2.5 py-1 rounded bg-surface hover:bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                  Terjadwal (18)
                </button>
                <button className="px-2.5 py-1 rounded bg-surface hover:bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                  Tayang (16)
                </button>
              </div>
            </div>

            {/* Mini Calendar Horizon Strip */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-space-md pb-space-sm min-w-0">
              <div className="text-center p-2 rounded-lg bg-surface border border-outline-variant/20">
                <span className="block font-label-sm text-label-sm text-outline">SEN</span>
                <span className="font-headline-sm text-headline-sm font-bold text-on-surface">24</span>
                <span className="block mt-1 w-1.5 h-1.5 mx-auto rounded-full bg-tertiary"></span>
              </div>
              <div className="text-center p-2 rounded-lg bg-surface border border-outline-variant/20">
                <span className="block font-label-sm text-label-sm text-outline">SEL</span>
                <span className="font-headline-sm text-headline-sm font-bold text-on-surface">25</span>
                <span className="block mt-1 w-1.5 h-1.5 mx-auto rounded-full bg-tertiary"></span>
              </div>
              <div className="text-center p-2 rounded-lg bg-primary text-on-primary shadow-xs">
                <span className="block font-label-sm text-label-sm opacity-80">RAB</span>
                <span className="font-headline-sm text-headline-sm font-bold">26</span>
                <span className="block mt-1 w-1.5 h-1.5 mx-auto rounded-full bg-white"></span>
              </div>
              <div className="text-center p-2 rounded-lg bg-surface border border-outline-variant/20">
                <span className="block font-label-sm text-label-sm text-outline">KAM</span>
                <span className="font-headline-sm text-headline-sm font-bold text-on-surface">27</span>
                <span className="block mt-1 w-1.5 h-1.5 mx-auto rounded-full bg-primary-container"></span>
              </div>
              <div className="text-center p-2 rounded-lg bg-surface border border-outline-variant/20">
                <span className="block font-label-sm text-label-sm text-outline">JUM</span>
                <span className="font-headline-sm text-headline-sm font-bold text-on-surface">28</span>
                <span className="block mt-1 w-1.5 h-1.5 mx-auto rounded-full bg-primary-container"></span>
              </div>
              <div className="text-center p-2 rounded-lg bg-surface border border-outline-variant/20">
                <span className="block font-label-sm text-label-sm text-outline">SAB</span>
                <span className="font-headline-sm text-headline-sm font-bold text-on-surface">29</span>
                <span className="block mt-1 w-1.5 h-1.5 mx-auto rounded-full bg-outline-variant"></span>
              </div>
              <div className="text-center p-2 rounded-lg bg-surface border border-outline-variant/20">
                <span className="block font-label-sm text-label-sm text-outline">MIN</span>
                <span className="font-headline-sm text-headline-sm font-bold text-on-surface">30</span>
                <span className="block mt-1 w-1.5 h-1.5 mx-auto rounded-full bg-outline-variant"></span>
              </div>
            </div>

            {/* Pipeline Cards Stream */}
            <div className="space-y-space-md mt-space-md">
              {/* Card 1: Instagram Carousel - Draft Dihasilkan AI */}
              <div className="p-space-md rounded-lg border border-outline-variant/40 bg-surface/50 hover:bg-surface-container-lowest hover:border-primary/50 transition-all flex flex-col sm:flex-row gap-space-md">
                <div className="w-full sm:w-28 h-24 rounded-lg bg-surface-container-high overflow-hidden relative shrink-0">
                  <img
                    className="w-full h-full object-cover"
                    alt="Social media carousel slide mockup"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAkrVVUTWG72M-gxggHBJbGnqEfBE03z-X89iXiS9hoTiabcvt4hjchNJJ6Cu63RKp1wMj4tjAjN-7ulhnWfYseMOnEEn-s930f-xQlMotv2BuJEkmEwUaeTIEedR3wh9BMGAcVLZL7sMXog88iIN27_b1MmKnHYI7XktB2ETFDNYH_78yEk-8lTOn9ZWEApI75r3YLtZ7MpkCDC0---KSPIVKn7QXtcopnqh30bki1S9ZoPa6SCjNr"
                  />
                  <span className="absolute bottom-1 right-1 bg-black/60 text-white font-code-sm text-[9px] px-1 rounded">
                    5 Slides
                  </span>
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200 font-label-sm text-[11px] font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                          Instagram Carousel
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-secondary-container text-primary font-label-sm text-[11px] font-medium">
                          Draft Dihasilkan AI
                        </span>
                      </div>
                      <h4 className="font-headline-sm text-sm font-bold text-on-surface mt-1.5">
                        7 Strategi Growth Marketing Menggunakan AI Agents di 2025
                      </h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1 mt-0.5">
                        Slide 1: Pengantar Autonomous Funnel. Slide 2: Dynamic Segmentation. Slide 3: Automated Ad Copy...
                      </p>
                    </div>
                    <button className="p-1 text-outline hover:text-on-surface">
                      <span className="material-symbols-outlined text-base" data-icon="more_vert">
                        more_vert
                      </span>
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 mt-2 border-t border-outline-variant/20 text-xs">
                    <div className="flex items-center gap-2 text-outline font-label-sm">
                      <span className="material-symbols-outlined text-sm text-primary" data-icon="smart_toy">
                        smart_toy
                      </span>
                      <span>
                        Oleh: <strong className="text-on-surface">Agent Copywriter v2.4</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-code-sm text-code-sm text-outline">Jadwal: Besok, 10:00 WIB</span>
                      <button className="px-2.5 py-1 bg-primary text-white rounded font-label-sm text-xs hover:bg-primary-container">
                        Review
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: TikTok Video Script - Menunggu Review Brand Kit */}
              <div className="p-space-md rounded-lg border border-outline-variant/40 bg-surface/50 hover:bg-surface-container-lowest hover:border-primary/50 transition-all flex flex-col sm:flex-row gap-space-md">
                <div className="w-full sm:w-28 h-24 rounded-lg bg-surface-container-high overflow-hidden relative shrink-0">
                  <img
                    className="w-full h-full object-cover"
                    alt="Video recording studio setup"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAzTjaOlGgzjSf6SPPYOQ_DNAcjbksdAxUSXfP8AO-nyDCF5F1Dpj7Im092wpqtgkjdEj088HgC-DcxX3T6z9CRJSCTtS91vdV8ID8jxwjrdb6iLFTgsEWiOyCSAemxwbcJ4TzJTj-1jVwXRX2CvB19AZjqekn50CdS3bwIh1rnWzpbOtj8YhxjPWSpnqFGSH9JY8PtuiE09I_Y9KZ4Kx0tSe3ID9HPCfi4apBW4Su6L_TJhapSeNIF"
                  />
                  <span className="absolute bottom-1 right-1 bg-black/60 text-white font-code-sm text-[9px] px-1 rounded">
                    00:45s
                  </span>
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-900 border border-slate-300 font-label-sm text-[11px] font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
                          TikTok Video Script
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-label-sm text-[11px] font-medium">
                          Menunggu Review Brand Kit
                        </span>
                      </div>
                      <h4 className="font-headline-sm text-sm font-bold text-on-surface mt-1.5">
                        Hook 3 Detik: &ldquo;Stop Bikin Konten Manual Kalau Mau Scale Up Bisnis!&rdquo;
                      </h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1 mt-0.5">
                        Audio: Trending Sound #B2BGrowth. Visual Cue: Tunjukkan dashboard auto-publish berkecepatan tinggi...
                      </p>
                    </div>
                    <button className="p-1 text-outline hover:text-on-surface">
                      <span className="material-symbols-outlined text-base" data-icon="more_vert">
                        more_vert
                      </span>
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 mt-2 border-t border-outline-variant/20 text-xs">
                    <div className="flex items-center gap-2 text-outline font-label-sm">
                      <span className="material-symbols-outlined text-sm text-primary" data-icon="movie_filter">
                        movie_filter
                      </span>
                      <span>
                        Oleh: <strong className="text-on-surface">Agent ScriptGen v1.8</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-code-sm text-code-sm text-outline">Jadwal: 27 Feb, 19:30 WIB</span>
                      <button className="px-2.5 py-1 bg-surface-container hover:bg-surface-variant text-on-surface rounded font-label-sm text-xs">
                        Approve Tone
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: LinkedIn Thought Leadership - Terjadwal Otomatis */}
              <div className="p-space-md rounded-lg border border-outline-variant/40 bg-surface/50 hover:bg-surface-container-lowest hover:border-primary/50 transition-all flex flex-col sm:flex-row gap-space-md">
                <div className="w-full sm:w-28 h-24 rounded-lg bg-surface-container-high overflow-hidden relative shrink-0">
                  <img
                    className="w-full h-full object-cover"
                    alt="Corporate editorial metrics chart"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuC7JhktxiujhFqxpUpG-fOs_MOXx3ZDOqWasfBtKR6TAVAhzGwrQq7crqDC1K3JBqSb6Ol5fvp9q5tgpR4d8j-sLcrN-M-cVXH1zhKLDEajfbt9B6XTrcY-FZiclhwKw9g-X-G_Wk-TqslA_-xocEJDsXC_W6IWIXy6T2GjNU5aFXB0xhr8i5AcrZETZT5D2fXBoVfdK3H3kcB7h791fAFv2LCEGgvuL8_3rFSoo_YUcZAUpGDB3ghT"
                  />
                  <span className="absolute bottom-1 right-1 bg-primary text-white font-code-sm text-[9px] px-1 rounded">
                    Auto-Queue
                  </span>
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-label-sm text-[11px] font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                          LinkedIn Thought Leadership
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-label-sm text-[11px] font-medium">
                          Terjadwal Otomatis
                        </span>
                      </div>
                      <h4 className="font-headline-sm text-sm font-bold text-on-surface mt-1.5">
                        Mengapa 78% Head of Marketing Berpindah ke Model Autonomous Content Ops
                      </h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1 mt-0.5">
                        Analisis data 500 startup Seri A: bagaimana efisiensi tim meningkat 4x lipat tanpa menambah headcount...
                      </p>
                    </div>
                    <button className="p-1 text-outline hover:text-on-surface">
                      <span className="material-symbols-outlined text-base" data-icon="more_vert">
                        more_vert
                      </span>
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 mt-2 border-t border-outline-variant/20 text-xs">
                    <div className="flex items-center gap-2 text-outline font-label-sm">
                      <span className="material-symbols-outlined text-sm text-primary" data-icon="bolt">
                        bolt
                      </span>
                      <span>
                        Oleh: <strong className="text-on-surface">Agent ExecutiveGhost v3.1</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-code-sm text-code-sm text-tertiary font-semibold">
                        Tayang Otomatis: 28 Feb, 08:30 WIB
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Aktivitas AI Agent Real-Time - Col 4 */}
        <div className="lg:col-span-4 flex flex-col gap-space-base">
          <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-sm flex flex-col h-full">
            {/* Feed Header with Live Radar Indicator */}
            <div className="flex items-center justify-between pb-space-md border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-tertiary"></span>
                </span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Aktivitas AI Agent</h3>
              </div>
              <span className="font-code-sm text-[11px] px-2 py-0.5 rounded bg-surface text-outline border border-outline-variant/30">
                Live stream
              </span>
            </div>

            {/* Real-Time Activity Log List */}
            <div className="relative pl-6 space-y-6 mt-space-lg flex-1 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-outline-variant/40">
              {/* Log Item 1 */}
              <div className="relative group">
                <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-surface-container-lowest"></div>
                <div className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm font-bold text-primary">Agent TrendWatcher</span>
                    <span className="font-code-sm text-[11px] text-outline">2 mnt lalu</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface mt-1 leading-snug">
                    Mendeteksi lonjakan topik viral di LinkedIn:{" "}
                    <strong className="text-primary font-code-sm">#MarketingAutomation</strong> (+340% volume percakapan).
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-surface text-outline font-label-sm text-[10px] rounded border border-outline-variant/30">
                      Auto-Brief dibuat
                    </span>
                  </div>
                </div>
              </div>

              {/* Log Item 2 */}
              <div className="relative group">
                <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-tertiary ring-4 ring-surface-container-lowest"></div>
                <div className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm font-bold text-on-surface">Agent Copywriter</span>
                    <span className="font-code-sm text-[11px] text-outline">15 mnt lalu</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-snug">
                    Menyelesaikan 3 variasi caption & call-to-action untuk kampanye{" "}
                    <span className="font-medium text-on-surface">Produk X</span>.
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-tertiary-fixed-dim/20 text-tertiary font-label-sm text-[10px] rounded">
                      Ready for review
                    </span>
                  </div>
                </div>
              </div>

              {/* Log Item 3 */}
              <div className="relative group">
                <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-surface-container-lowest"></div>
                <div className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm font-bold text-on-surface">Agent Scheduler</span>
                    <span className="font-code-sm text-[11px] text-outline">1 jam lalu</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-snug">
                    Berhasil mempublikasikan thread di <strong className="text-on-surface">𝕏 (Twitter)</strong>: &ldquo;5 Cara Automasi Konten B2B&rdquo;.
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 font-label-sm text-[10px] rounded border border-blue-200">
                      2.4k views · 48 retweets
                    </span>
                  </div>
                </div>
              </div>

              {/* Log Item 4 */}
              <div className="relative group">
                <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-primary-container ring-4 ring-surface-container-lowest"></div>
                <div className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm font-bold text-on-surface">Agent ImageGen</span>
                    <span className="font-code-sm text-[11px] text-outline">2 jam lalu</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-snug">
                    Selesai merender 4 aset visual banner SVG & WebP disesuaikan dengan palet warna{" "}
                    <strong className="text-on-surface">Brand Kit</strong>.
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-surface text-outline font-label-sm text-[10px] rounded border border-outline-variant/30">
                      Asset library updated
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Agent Performance Health Bar */}
            <div className="mt-space-lg pt-space-md border-t border-outline-variant/20 bg-surface -mx-space-lg -mb-space-lg p-space-md rounded-b-xl">
              <div className="flex items-center justify-between text-xs">
                <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                  Autonomous Cluster Load
                </span>
                <span className="font-code-sm text-code-sm text-tertiary font-bold">Optimal (34ms)</span>
              </div>
              <div className="w-full bg-outline-variant/30 h-1.5 rounded-full overflow-hidden mt-2">
                <div className="bg-tertiary h-full rounded-full" style={{ width: "28%" }}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: ALUR OTOMATISASI POPULER (Quick Trigger Workflow Cards) */}
      <section className="flex flex-col gap-space-md pb-space-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Alur Otomatisasi Populer</h3>
            <p className="font-body-sm text-body-sm text-outline">
              Jalankan resep pipeline instan untuk melipatgandakan output konten Anda
            </p>
          </div>
          <button className="text-primary hover:underline font-label-md text-label-md flex items-center gap-1">
            <span>Lihat Semua Workflow</span>
            <span className="material-symbols-outlined text-sm" data-icon="arrow_forward">
              arrow_forward
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
          {/* Workflow 1: Blog-to-Social Multi-Format */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-sm flex flex-col justify-between hover:border-primary/60 hover:shadow-md transition-all group">
            <div>
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-secondary-container text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl" data-icon="sync_alt">
                    sync_alt
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-surface-container text-primary font-code-sm text-[11px] font-semibold">
                  RSS Trigger
                </span>
              </div>
              <h4 className="font-headline-sm text-base font-bold text-on-surface mt-space-md group-hover:text-primary transition-colors">
                Blog-to-Social Multi-Format
              </h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1.5 leading-relaxed">
                Mendeteksi postingan artikel baru via RSS Feed, otomatis mengekstrak poin penting, dan menjadwalkan Carousel IG + Thread Twitter.
              </p>
              {/* Trigger Visual Micro Chain */}
              <div className="mt-4 p-2.5 rounded-lg bg-surface border border-outline-variant/20 flex flex-wrap items-center justify-between gap-1 text-[11px] font-code-sm text-outline">
                <span>RSS Feed</span>
                <span className="material-symbols-outlined text-xs" data-icon="chevron_right">
                  chevron_right
                </span>
                <span>AI Repurposing</span>
                <span className="material-symbols-outlined text-xs" data-icon="chevron_right">
                  chevron_right
                </span>
                <span>Auto-Calendar</span>
              </div>
            </div>
            <div className="mt-6 pt-3 border-t border-outline-variant/20 flex items-center justify-between">
              <span className="text-xs font-label-sm text-outline">Aktif di 3 channel</span>
              <button className="px-3 py-1.5 rounded-lg bg-surface hover:bg-primary hover:text-white text-on-surface font-label-md text-label-md border border-outline-variant/30 transition-colors cursor-pointer">
                Trigger Run
              </button>
            </div>
          </div>

          {/* Workflow 2: Daily Trending News Curator */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-sm flex flex-col justify-between hover:border-primary/60 hover:shadow-md transition-all group">
            <div>
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-tertiary-fixed-dim/20 text-tertiary flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl" data-icon="travel_explore">
                    travel_explore
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-code-sm text-[11px] font-semibold">
                  Daily Cron
                </span>
              </div>
              <h4 className="font-headline-sm text-base font-bold text-on-surface mt-space-md group-hover:text-primary transition-colors">
                Daily Trending News Curator
              </h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1.5 leading-relaxed">
                Menyisir Google Trends & Twitter Search setiap pagi, membuat draf rangkuman 150 kata, dan mengirim notifikasi review ke Telegram.
              </p>
              {/* Trigger Visual Micro Chain */}
              <div className="mt-4 p-2.5 rounded-lg bg-surface border border-outline-variant/20 flex items-center justify-between text-[11px] font-code-sm text-outline">
                <span>Google Trends</span>
                <span className="material-symbols-outlined text-xs" data-icon="chevron_right">
                  chevron_right
                </span>
                <span>Draft Summary</span>
                <span className="material-symbols-outlined text-xs" data-icon="chevron_right">
                  chevron_right
                </span>
                <span>Telegram Bot</span>
              </div>
            </div>
            <div className="mt-6 pt-3 border-t border-outline-variant/20 flex items-center justify-between">
              <span className="text-xs font-label-sm text-outline">Pukul 07:00 WIB</span>
              <button className="px-3 py-1.5 rounded-lg bg-surface hover:bg-primary hover:text-white text-on-surface font-label-md text-label-md border border-outline-variant/30 transition-colors cursor-pointer">
                Trigger Run
              </button>
            </div>
          </div>

          {/* Workflow 3: Weekly Video Script & Hooks Generator */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-sm flex flex-col justify-between hover:border-primary/60 hover:shadow-md transition-all group">
            <div>
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-surface-variant text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl" data-icon="smart_display">
                    smart_display
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-surface-container text-primary font-code-sm text-[11px] font-semibold">
                  Scheduled
                </span>
              </div>
              <h4 className="font-headline-sm text-base font-bold text-on-surface mt-space-md group-hover:text-primary transition-colors">
                Weekly Video Script & Hooks
              </h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1.5 leading-relaxed">
                Menghasilkan paket 5 ide script video pendek TikTok / Reels lengkap dengan 3 variasi hook pembuka visual & copywriting persuasif.
              </p>
              {/* Trigger Visual Micro Chain */}
              <div className="mt-4 p-2.5 rounded-lg bg-surface border border-outline-variant/20 flex items-center justify-between text-[11px] font-code-sm text-outline">
                <span>Senin 09:00</span>
                <span className="material-symbols-outlined text-xs" data-icon="chevron_right">
                  chevron_right
                </span>
                <span>5 Hooks Gen</span>
                <span className="material-symbols-outlined text-xs" data-icon="chevron_right">
                  chevron_right
                </span>
                <span>Notion Ready</span>
              </div>
            </div>
            <div className="mt-6 pt-3 border-t border-outline-variant/20 flex items-center justify-between">
              <span className="text-xs font-label-sm text-outline">Tiap Senin pagi</span>
              <button className="px-3 py-1.5 rounded-lg bg-surface hover:bg-primary hover:text-white text-on-surface font-label-md text-label-md border border-outline-variant/30 transition-colors cursor-pointer">
                Trigger Run
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
