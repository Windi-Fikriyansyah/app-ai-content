"use client";

import React, { useState, useEffect, useTransition, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CheckCircle2,
  AlertCircle,
  X,
  Building2,
  Store,
  Palette,
  Loader2,
  Save,
  Plus,
  Trash2,
  Tag,
  ChevronUp,
  ChevronDown,
  ImageIcon,
  Smile,
  Briefcase,
  MessageSquare,
  GraduationCap,
  Megaphone,
} from "lucide-react";
import {
  getSettingsData,
  updateWorkspaceSettings,
  updateBusinessProfileSettings,
  updateBrandKitSettings,
  SettingsData,
} from "./actions";

interface ProductItem {
  id?: string;
  name: string;
  price: string;
  description: string;
  benefits: string;
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsSkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse">
      <div className="h-8 bg-surface-container-high rounded-md w-64"></div>
      <div className="h-4 bg-surface-container rounded-md w-96"></div>
      <div className="h-12 bg-surface-container-high rounded-xl w-full"></div>
      <div className="h-96 bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6"></div>
    </div>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"workspace" | "business" | "brand">(
    tabParam === "business"
      ? "business"
      : tabParam === "brand"
      ? "brand"
      : "workspace"
  );

  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // ═══════════════════════════════════════════════
  // STATE: Workspace
  // ═══════════════════════════════════════════════
  const [workspaceId, setWorkspaceId] = useState<string | undefined>();
  const [workspaceName, setWorkspaceName] = useState("");
  const [timezone, setTimezone] = useState("Asia/Jakarta (WIB)");
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");

  // ═══════════════════════════════════════════════
  // STATE: Business Profile
  // ═══════════════════════════════════════════════
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("Kuliner & F&B");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [showPromotion, setShowPromotion] = useState(false);
  const [promoName, setPromoName] = useState("");
  const [promoDiscount, setPromoDiscount] = useState("");
  const [promoStartDate, setPromoStartDate] = useState("");
  const [promoEndDate, setPromoEndDate] = useState("");

  // ═══════════════════════════════════════════════
  // STATE: Brand Kit
  // ═══════════════════════════════════════════════
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#4F46E5");
  const [secondaryColor, setSecondaryColor] = useState("#06B6D4");
  const [visualStyle, setVisualStyle] = useState("Modern");
  const [writingTone, setWritingTone] = useState("Friendly");
  const [language, setLanguage] = useState("Bahasa Indonesia");
  const [emojiUsage, setEmojiUsage] = useState("Medium");

  // Sync tab with URL if param changes
  useEffect(() => {
    if (tabParam === "business") setActiveTab("business");
    else if (tabParam === "brand") setActiveTab("brand");
    else if (tabParam === "workspace") setActiveTab("workspace");
  }, [tabParam]);

  const handleTabChange = (tab: "workspace" | "business" | "brand") => {
    setActiveTab(tab);
    setFeedback(null);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("tab", tab);
    router.replace(`/settings?${newParams.toString()}`, { scroll: false });
  };

  // Load initial settings data
  useEffect(() => {
    getSettingsData().then((res) => {
      if (res.data) {
        const d = res.data;
        setUserId(d.user.id);
        setUserEmail(d.user.email);

        setWorkspaceId(d.workspace.id);
        setWorkspaceName(d.workspace.name);
        setTimezone(d.workspace.timezone);

        setBusinessName(d.businessProfile.businessName);
        setCategory(d.businessProfile.category);
        setDescription(d.businessProfile.description);
        setLocation(d.businessProfile.location);
        setWebsite(d.businessProfile.website || "");
        setWhatsapp(d.businessProfile.whatsapp);
        setTargetAudience(d.businessProfile.targetAudience);

        if (d.productsServices && d.productsServices.length > 0) {
          setProducts(d.productsServices);
        } else {
          setProducts([
            {
              id: "prod-1",
              name: "Produk Unggulan",
              price: "Rp50.000",
              description: "Deskripsi produk utama",
              benefits: "Keunggulan & manfaat produk",
            },
          ]);
        }

        if (d.promotion?.name) {
          setShowPromotion(true);
          setPromoName(d.promotion.name);
          setPromoDiscount(d.promotion.discount || "");
          setPromoStartDate(d.promotion.startDate || "");
          setPromoEndDate(d.promotion.endDate || "");
        }

        setLogoPreview(d.brandKit.logoUrl || null);
        setPrimaryColor(d.brandKit.primaryColor);
        setSecondaryColor(d.brandKit.secondaryColor);
        setVisualStyle(d.brandKit.visualStyle);
        setWritingTone(d.brandKit.writingTone);
        setLanguage(d.brandKit.language);
        setEmojiUsage(d.brandKit.emojiUsage);
      }
      setLoading(false);
    });
  }, []);

  // Products helpers
  const handleAddProduct = () => {
    setProducts((prev) => [
      ...prev,
      {
        id: `prod-${Date.now()}`,
        name: "",
        price: "",
        description: "",
        benefits: "",
      },
    ]);
  };

  const handleRemoveProduct = (index: number) => {
    if (products.length <= 1) {
      alert("Minimal sisakan 1 produk atau layanan.");
      return;
    }
    setProducts((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateProduct = (
    index: number,
    field: keyof Omit<ProductItem, "id">,
    val: string
  ) => {
    setProducts((prev) =>
      prev.map((p, idx) => (idx === index ? { ...p, [field]: val } : p))
    );
  };

  // Logo upload with canvas compression
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "image/svg+xml" || file.size < 80 * 1024) {
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxDim = 360;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/webp", 0.8);
        setLogoPreview(compressed);
      }
    };
    img.onerror = () => {
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    };
    img.src = objectUrl;
  };

  // Save Workspace
  const handleSaveWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const res = await updateWorkspaceSettings({
        workspaceId,
        name: workspaceName,
        timezone,
      });
      if (res.error) {
        setFeedback({ type: "error", message: res.error });
      } else {
        setFeedback({
          type: "success",
          message: res.message || "Pengaturan workspace berhasil disimpan.",
        });
      }
    });
  };

  // Save Business Profile
  const handleSaveBusinessProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const hasInvalid = products.some((p) => !p.name.trim());
    if (hasInvalid) {
      setFeedback({
        type: "error",
        message: "Nama produk/layanan tidak boleh kosong.",
      });
      return;
    }

    startTransition(async () => {
      const res = await updateBusinessProfileSettings({
        workspaceId,
        businessName,
        category,
        description,
        location,
        website: website || undefined,
        whatsapp,
        targetAudience,
        productsServices: products,
        promotion:
          showPromotion && promoName
            ? {
                name: promoName,
                discount: promoDiscount || undefined,
                startDate: promoStartDate || undefined,
                endDate: promoEndDate || undefined,
              }
            : undefined,
      });

      if (res.error) {
        setFeedback({ type: "error", message: res.error });
      } else {
        setFeedback({
          type: "success",
          message: res.message || "Profil bisnis & produk berhasil disimpan.",
        });
      }
    });
  };

  // Save Brand Kit
  const handleSaveBrandKit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const res = await updateBrandKitSettings({
        workspaceId,
        logoUrl: logoPreview || undefined,
        primaryColor,
        secondaryColor,
        visualStyle,
        writingTone,
        language,
        emojiUsage,
      });

      if (res.error) {
        setFeedback({ type: "error", message: res.error });
      } else {
        setFeedback({
          type: "success",
          message: res.message || "Brand kit berhasil disimpan.",
        });
      }
    });
  };

  if (loading) return <SettingsSkeleton />;

  return (
    <div className="w-full space-y-6">
      {/* ── HEADER ── */}
      <div>
        <div className="flex items-center gap-2 mb-1 text-outline font-label-sm text-label-sm">
          <span>Dashboard</span>
          <span>/</span>
          <span className="text-on-surface font-semibold">Pengaturan</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
          Pengaturan & Penyesuaian
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Kelola informasi workspace, profil bisnis, katalog produk, dan identitas brand yang menjadi referensi AI Anda.
        </p>
      </div>

      {/* ── FEEDBACK TOAST / ALERT ── */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 transition-all ${
            feedback.type === "success"
              ? "bg-tertiary-fixed/30 border-tertiary-fixed-dim text-on-tertiary-fixed"
              : "bg-error-container border-error/30 text-on-error-container"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span className="font-label-md text-label-md font-semibold">
              {feedback.message}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs hover:opacity-70 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── TAB NAVIGATION ── */}
      <div className="flex border-b border-outline-variant/50 gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => handleTabChange("workspace")}
          className={`pb-3 px-3 sm:px-4 font-label-md text-label-md font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === "workspace"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Workspace & Akun</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("business")}
          className={`pb-3 px-3 sm:px-4 font-label-md text-label-md font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === "business"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Business Profile & Produk</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("brand")}
          className={`pb-3 px-3 sm:px-4 font-label-md text-label-md font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === "brand"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Brand Kit</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TAB 1: WORKSPACE & AKUN
          ══════════════════════════════════════════════════════════════ */}
      {activeTab === "workspace" && (
        <div className="space-y-6">
          <form
            onSubmit={handleSaveWorkspace}
            className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs"
          >
            <div>
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                Detail Workspace
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                Konfigurasi identitas workspace dan zona waktu penerbitan konten.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label
                  htmlFor="ws-name"
                  className="block font-label-md text-label-md font-medium text-on-surface mb-1.5"
                >
                  Nama Workspace <span className="text-error">*</span>
                </label>
                <input
                  id="ws-name"
                  type="text"
                  required
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-outline-variant/80 bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container"
                />
              </div>

              <div>
                <label
                  htmlFor="ws-tz"
                  className="block font-label-md text-label-md font-medium text-on-surface mb-1.5"
                >
                  Zona Waktu Posting
                </label>
                <select
                  id="ws-tz"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-outline-variant/80 bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container"
                >
                  <option value="Asia/Jakarta (WIB)">
                    Asia/Jakarta (WIB - UTC+7)
                  </option>
                  <option value="Asia/Makassar (WITA)">
                    Asia/Makassar (WITA - UTC+8)
                  </option>
                  <option value="Asia/Jayapura (WIT)">
                    Asia/Jayapura (WIT - UTC+9)
                  </option>
                  <option value="UTC">UTC (Universal Time)</option>
                </select>
              </div>
            </div>

            {/* Info Akun / Meta */}
            <div className="p-4 rounded-xl bg-surface-container-low/50 border border-outline-variant/40 space-y-2">
              <span className="font-label-sm text-label-sm font-semibold text-primary uppercase tracking-wider">
                Informasi Akun
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-on-surface">
                <div>
                  <span className="text-outline block text-xs">Email Terdaftar:</span>
                  <span className="font-medium">{userEmail || "dev@autocontent.ai"}</span>
                </div>
                <div>
                  <span className="text-outline block text-xs">Workspace ID:</span>
                  <span className="font-mono text-xs text-on-surface-variant">
                    {workspaceId || "ws_default_active"}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="h-11 px-6 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-[18px] h-[18px] animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-[18px] h-[18px]" />
                    <span>Simpan Perubahan Workspace</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 2: BUSINESS PROFILE & PRODUK
          ══════════════════════════════════════════════════════════════ */}
      {activeTab === "business" && (
        <div className="space-y-6">
          <form
            onSubmit={handleSaveBusinessProfile}
            className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs"
          >
            <div>
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                Business Profile (Knowledge Base AI)
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                Data ini menjadi sumber kebenaran konten bagi AI. AI tidak akan mengarang promo, produk, atau fakta yang tidak ada di sini.
              </p>
            </div>

            {/* 1. Basic Info */}
            <div className="space-y-4">
              <h3 className="font-label-md text-label-md font-bold text-on-surface border-b border-outline-variant/30 pb-2">
                1. Informasi Dasar Bisnis
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="bp-name"
                    className="block font-label-md text-label-md font-medium text-on-surface mb-1"
                  >
                    Nama Bisnis <span className="text-error">*</span>
                  </label>
                  <input
                    id="bp-name"
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-outline-variant/80 bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary-container"
                  />
                </div>

                <div>
                  <label
                    htmlFor="bp-cat"
                    className="block font-label-md text-label-md font-medium text-on-surface mb-1"
                  >
                    Kategori Bisnis <span className="text-error">*</span>
                  </label>
                  <select
                    id="bp-cat"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-outline-variant/80 bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary-container"
                  >
                    <option value="Kuliner & F&B">Kuliner & F&B (Restoran / Kafe / Katering)</option>
                    <option value="Fashion & Pakaian">Fashion & Aksesoris</option>
                    <option value="Kecantikan & Salon">Kecantikan, Klinik & Salon / Barbershop</option>
                    <option value="Jasa & Servis">Jasa AC, Perbaikan, Bengkel, Servis</option>
                    <option value="Travel & Pariwisata">Travel & Pariwisata</option>
                    <option value="Properti & Real Estate">Properti & Real Estate</option>
                    <option value="Toko Retail & Produk">Toko Retail & E-commerce</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="bp-desc"
                  className="block font-label-md text-label-md font-medium text-on-surface mb-1"
                >
                  Deskripsi Bisnis <span className="text-error">*</span>
                </label>
                <textarea
                  id="bp-desc"
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-lg border border-outline-variant/80 bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary-container"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="bp-loc"
                    className="block font-label-md text-label-md font-medium text-on-surface mb-1"
                  >
                    Lokasi <span className="text-error">*</span>
                  </label>
                  <input
                    id="bp-loc"
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-outline-variant/80 bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary-container"
                  />
                </div>

                <div>
                  <label
                    htmlFor="bp-wa"
                    className="block font-label-md text-label-md font-medium text-on-surface mb-1"
                  >
                    WhatsApp <span className="text-error">*</span>
                  </label>
                  <input
                    id="bp-wa"
                    type="text"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-outline-variant/80 bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary-container"
                  />
                </div>

                <div>
                  <label
                    htmlFor="bp-web"
                    className="block font-label-md text-label-md font-medium text-on-surface mb-1"
                  >
                    Website (Opsional)
                  </label>
                  <input
                    id="bp-web"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-outline-variant/80 bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary-container"
                  />
                </div>
              </div>
            </div>

            {/* 2. Target Audience */}
            <div className="space-y-2 pt-2 border-t border-outline-variant/30">
              <h3 className="font-label-md text-label-md font-bold text-on-surface">
                2. Target Audience
              </h3>
              <label
                htmlFor="bp-aud"
                className="block font-label-sm text-label-sm text-on-surface-variant"
              >
                Siapa pelanggan ideal Anda?
              </label>
              <input
                id="bp-aud"
                type="text"
                required
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-outline-variant/80 bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary-container"
              />
            </div>

            {/* 3. Products & Services */}
            <div className="space-y-3 pt-2 border-t border-outline-variant/30">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-label-md text-label-md font-bold text-on-surface">
                    3. Katalog Produk & Layanan
                  </h3>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    Produk yang dapat diangkat AI menjadi konten edukasi, review, atau promosi.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddProduct}
                  className="px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/5 font-label-sm text-label-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Item
                </button>
              </div>

              <div className="space-y-3">
                {products.map((p, idx) => (
                  <div
                    key={p.id || idx}
                    className="p-4 rounded-xl border border-outline-variant/60 bg-surface-container-low/40 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-label-sm font-semibold text-primary">
                        Item #{idx + 1}
                      </span>
                      {products.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(idx)}
                          className="text-outline hover:text-error transition-colors text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          Hapus
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block font-label-sm text-label-sm font-medium text-on-surface mb-1">
                          Nama Produk / Layanan <span className="text-error">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={p.name}
                          onChange={(e) =>
                            handleUpdateProduct(idx, "name", e.target.value)
                          }
                          className="w-full h-9 px-3 rounded-md border border-outline-variant/70 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary-container"
                        />
                      </div>
                      <div>
                        <label className="block font-label-sm text-label-sm font-medium text-on-surface mb-1">
                          Harga (Price)
                        </label>
                        <input
                          type="text"
                          value={p.price}
                          onChange={(e) =>
                            handleUpdateProduct(idx, "price", e.target.value)
                          }
                          className="w-full h-9 px-3 rounded-md border border-outline-variant/70 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary-container"
                        />
                      </div>
                      <div>
                        <label className="block font-label-sm text-label-sm font-medium text-on-surface mb-1">
                          Deskripsi Singkat
                        </label>
                        <input
                          type="text"
                          value={p.description}
                          onChange={(e) =>
                            handleUpdateProduct(idx, "description", e.target.value)
                          }
                          className="w-full h-9 px-3 rounded-md border border-outline-variant/70 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary-container"
                        />
                      </div>
                      <div>
                        <label className="block font-label-sm text-label-sm font-medium text-on-surface mb-1">
                          Benefits / Keunggulan
                        </label>
                        <input
                          type="text"
                          value={p.benefits}
                          onChange={(e) =>
                            handleUpdateProduct(idx, "benefits", e.target.value)
                          }
                          className="w-full h-9 px-3 rounded-md border border-outline-variant/70 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary-container"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Promotion */}
            <div className="pt-2 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => setShowPromotion(!showPromotion)}
                className="flex items-center justify-between w-full text-left font-label-md text-label-md font-bold text-on-surface hover:text-primary transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Tag className="w-[18px] h-[18px] text-tertiary" />
                  <span>4. Promosi Sedang Berjalan (Opsional)</span>
                </div>
                {showPromotion ? (
                  <ChevronUp className="w-5 h-5 text-on-surface-variant" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-on-surface-variant" />
                )}
              </button>

              {showPromotion && (
                <div className="mt-3 p-4 rounded-xl border border-outline-variant/60 bg-surface-container-low/30 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-label-sm text-label-sm font-medium text-on-surface mb-1">
                        Nama Promosi
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Diskon 20% Akhir Pekan"
                        value={promoName}
                        onChange={(e) => setPromoName(e.target.value)}
                        className="w-full h-9 px-3 rounded-md border border-outline-variant/70 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary-container"
                      />
                    </div>
                    <div>
                      <label className="block font-label-sm text-label-sm font-medium text-on-surface mb-1">
                        Diskon / Penawaran
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Diskon 20% / Cashback 10rb"
                        value={promoDiscount}
                        onChange={(e) => setPromoDiscount(e.target.value)}
                        className="w-full h-9 px-3 rounded-md border border-outline-variant/70 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary-container"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-label-sm text-label-sm font-medium text-on-surface mb-1">
                        Tanggal Mulai
                      </label>
                      <input
                        type="date"
                        value={promoStartDate}
                        onChange={(e) => setPromoStartDate(e.target.value)}
                        className="w-full h-9 px-3 rounded-md border border-outline-variant/70 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary-container"
                      />
                    </div>
                    <div>
                      <label className="block font-label-sm text-label-sm font-medium text-on-surface mb-1">
                        Tanggal Selesai
                      </label>
                      <input
                        type="date"
                        value={promoEndDate}
                        onChange={(e) => setPromoEndDate(e.target.value)}
                        className="w-full h-9 px-3 rounded-md border border-outline-variant/70 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary-container"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="h-11 px-6 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-[18px] h-[18px] animate-spin" />
                    <span>Menyimpan Profil...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-[18px] h-[18px]" />
                    <span>Simpan Perubahan Business Profile</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 3: BRAND KIT
          ══════════════════════════════════════════════════════════════ */}
      {activeTab === "brand" && (
        <div className="space-y-6">
          <form
            onSubmit={handleSaveBrandKit}
            className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs"
          >
            <div>
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                Brand Kit
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                Pengaturan visual dan gaya bahasa ini memastikan setiap materi grafis dan caption yang dibuat AI selaras dengan brand Anda.
              </p>
            </div>

            {/* 1. Upload Logo */}
            <div>
              <label className="block font-label-md text-label-md font-bold text-on-surface mb-2">
                Logo Brand
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border-2 border-dashed border-outline-variant/80 hover:border-primary/60 transition-colors bg-surface-container-low/20">
                <div className="w-20 h-20 rounded-xl bg-surface-container-highest flex items-center justify-center overflow-hidden border border-outline-variant/50 shrink-0">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-outline" />
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <label className="inline-block px-4 py-2 rounded-lg bg-surface-container border border-outline-variant hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm font-medium cursor-pointer transition-colors shadow-2xs">
                    <span>{logoPreview ? "Ganti Logo" : "Pilih File Logo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="font-label-sm text-label-sm text-outline mt-1.5">
                    Format PNG, JPG, SVG. Otomatis dikompresi ringan dan proporsional.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Brand Colors */}
            <div className="pt-2 border-t border-outline-variant/30">
              <h3 className="font-label-md text-label-md font-bold text-on-surface mb-3">
                Warna Brand (Brand Colors)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-xl border border-outline-variant/60 flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                  />
                  <div className="flex-1">
                    <label className="block font-label-sm text-label-sm font-semibold text-on-surface">
                      Primary Color
                    </label>
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-24 h-7 text-xs font-mono uppercase bg-surface-container-low px-2 rounded border border-outline-variant/50 text-on-surface"
                    />
                  </div>
                  <div
                    className="w-8 h-8 rounded-lg border border-black/10 shadow-xs"
                    style={{ backgroundColor: primaryColor }}
                  />
                </div>

                <div className="p-3 rounded-xl border border-outline-variant/60 flex items-center gap-3">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                  />
                  <div className="flex-1">
                    <label className="block font-label-sm text-label-sm font-semibold text-on-surface">
                      Secondary Color
                    </label>
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-24 h-7 text-xs font-mono uppercase bg-surface-container-low px-2 rounded border border-outline-variant/50 text-on-surface"
                    />
                  </div>
                  <div
                    className="w-8 h-8 rounded-lg border border-black/10 shadow-xs"
                    style={{ backgroundColor: secondaryColor }}
                  />
                </div>
              </div>
            </div>

            {/* 3. Visual Style */}
            <div className="pt-2 border-t border-outline-variant/30">
              <label className="block font-label-md text-label-md font-bold text-on-surface mb-2">
                Visual Style
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                {[
                  { id: "Minimal", desc: "Sederhana & Bersih" },
                  { id: "Modern", desc: "Trendi & Estetik" },
                  { id: "Elegant", desc: "Anggun & Mewah" },
                  { id: "Playful", desc: "Ceria & Menyenangkan" },
                  { id: "Luxury", desc: "Eksklusif & Premium" },
                  { id: "Bold", desc: "Tegas & Kontras Tinggi" },
                  { id: "Natural", desc: "Organik & Hangat" },
                ].map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setVisualStyle(style.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      visualStyle === style.id
                        ? "border-primary bg-primary-fixed/20 text-on-surface ring-2 ring-primary/20"
                        : "border-outline-variant/60 bg-surface-container-lowest hover:bg-surface-container-low text-on-surface-variant"
                    }`}
                  >
                    <div className="font-label-md text-label-md font-bold text-on-surface flex items-center justify-between">
                      <span>{style.id}</span>
                      {visualStyle === style.id && (
                        <span className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <div className="text-[11px] text-outline mt-0.5">
                      {style.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Writing Tone */}
            <div className="pt-2 border-t border-outline-variant/30">
              <label className="block font-label-md text-label-md font-bold text-on-surface mb-2">
                Writing Tone
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "Friendly", icon: Smile },
                  { id: "Professional", icon: Briefcase },
                  { id: "Casual", icon: MessageSquare },
                  { id: "Educational", icon: GraduationCap },
                  { id: "Persuasive", icon: Megaphone },
                ].map((tone) => {
                  const ToneIcon = tone.icon;
                  return (
                    <button
                      key={tone.id}
                      type="button"
                      onClick={() => setWritingTone(tone.id)}
                      className={`px-3.5 py-2 rounded-lg border font-label-md text-label-md font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                        writingTone === tone.id
                          ? "border-primary bg-primary text-on-primary shadow-2xs"
                          : "border-outline-variant/70 bg-surface-container-lowest hover:bg-surface-container text-on-surface"
                      }`}
                    >
                      <ToneIcon className="w-[18px] h-[18px]" />
                      <span>{tone.id}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Language & Emoji */}
            <div className="pt-2 border-t border-outline-variant/30 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-label-md text-label-md font-bold text-on-surface mb-2">
                  Bahasa Konten (Language)
                </label>
                <div className="flex flex-wrap gap-2">
                  {["Bahasa Indonesia", "English", "Mixed"].map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setLanguage(lang)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all cursor-pointer ${
                        language === lang
                          ? "border-primary bg-primary text-on-primary"
                          : "border-outline-variant/70 bg-surface-container-lowest hover:bg-surface-container text-on-surface"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-label-md text-label-md font-bold text-on-surface mb-2">
                  Tingkat Penggunaan Emoji
                </label>
                <div className="flex flex-wrap gap-2">
                  {["None", "Low", "Medium", "High"].map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setEmojiUsage(em)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all cursor-pointer ${
                        emojiUsage === em
                          ? "border-primary bg-primary text-on-primary"
                          : "border-outline-variant/70 bg-surface-container-lowest hover:bg-surface-container text-on-surface"
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="h-11 px-6 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-[18px] h-[18px] animate-spin" />
                    <span>Menyimpan Brand Kit...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-[18px] h-[18px]" />
                    <span>Simpan Perubahan Brand Kit</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
