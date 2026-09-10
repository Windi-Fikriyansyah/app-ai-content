"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  AlertCircle,
  Building2,
  Loader2,
  ArrowRight,
  Store,
  Info,
  Users,
  ShoppingBag,
  Plus,
  Trash2,
  Tag,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  Palette,
  ImageIcon,
  Smile,
  Briefcase,
  MessageSquare,
  GraduationCap,
  Megaphone,
  CheckCircle2,
} from "lucide-react";
import {
  saveWorkspaceStep,
  saveBusinessProfileStep,
  saveBrandKitStep,
  getSavedOnboardingProgress,
} from "./actions";

const LOCAL_STORAGE_KEY = "autocontent_onboarding_draft_v1";

interface ProductItem {
  id: string;
  name: string;
  price: string;
  description: string;
  benefits: string;
}

export default function OnboardingWizardPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // ═══════════════════════════════════════════════
  // STATE: Step 1 - Workspace
  // ═══════════════════════════════════════════════
  const [workspaceName, setWorkspaceName] = useState("Dapur Bu Ani");
  const [timezone, setTimezone] = useState("Asia/Jakarta (WIB)");

  // ═══════════════════════════════════════════════
  // STATE: Step 2 - Business Profile
  // ═══════════════════════════════════════════════
  const [businessName, setBusinessName] = useState("Dapur Bu Ani");
  const [category, setCategory] = useState("Kuliner & F&B");
  const [description, setDescription] = useState(
    "Katering rumahan sehat dan higienis yang menyediakan aneka nasi box, tumpeng mini, dan masakan khas Nusantara untuk acara keluarga & kantor."
  );
  const [location, setLocation] = useState("Jakarta Selatan");
  const [website, setWebsite] = useState("");
  const [whatsapp, setWhatsapp] = useState("0812-3456-7890");
  const [targetAudience, setTargetAudience] = useState(
    "Ibu rumah tangga, usia 25-45, pekerja kantoran pengada konsumsi acara"
  );

  // Products / Services
  const [products, setProducts] = useState<ProductItem[]>([
    {
      id: "prod-1",
      name: "Nasi Box Ayam Bakar",
      price: "Rp25.000",
      description: "Paket nasi pulen dengan ayam bakar madu bumbu rempah spesial",
      benefits: "Nasi + ayam bakar + lalapan segar + sambal terasi + tahu/tempe",
    },
  ]);

  // Promotions (Optional)
  const [showPromotion, setShowPromotion] = useState(false);
  const [promoName, setPromoName] = useState("");
  const [promoDiscount, setPromoDiscount] = useState("");
  const [promoStartDate, setPromoStartDate] = useState("");
  const [promoEndDate, setPromoEndDate] = useState("");

  // ═══════════════════════════════════════════════
  // STATE: Step 3 - Brand Kit
  // ═══════════════════════════════════════════════
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#4F46E5");
  const [secondaryColor, setSecondaryColor] = useState("#06B6D4");
  const [visualStyle, setVisualStyle] = useState("Modern");
  const [writingTone, setWritingTone] = useState("Friendly");
  const [language, setLanguage] = useState("Bahasa Indonesia");
  const [emojiUsage, setEmojiUsage] = useState("Medium");

  // ═══════════════════════════════════════════════
  // AUTO-RESTORE DRAFT ON MOUNT (Prevent Reset on Refresh)
  // ═══════════════════════════════════════════════
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.currentStep) setCurrentStep(data.currentStep);
        if (data.workspaceName) setWorkspaceName(data.workspaceName);
        if (data.timezone) setTimezone(data.timezone);
        if (data.businessName) setBusinessName(data.businessName);
        if (data.category) setCategory(data.category);
        if (data.description) setDescription(data.description);
        if (data.location) setLocation(data.location);
        if (data.website !== undefined) setWebsite(data.website);
        if (data.whatsapp) setWhatsapp(data.whatsapp);
        if (data.targetAudience) setTargetAudience(data.targetAudience);
        if (data.products && data.products.length > 0) setProducts(data.products);
        if (data.showPromotion !== undefined) setShowPromotion(data.showPromotion);
        if (data.promoName) setPromoName(data.promoName);
        if (data.promoDiscount) setPromoDiscount(data.promoDiscount);
        if (data.promoStartDate) setPromoStartDate(data.promoStartDate);
        if (data.promoEndDate) setPromoEndDate(data.promoEndDate);
        if (data.logoPreview) setLogoPreview(data.logoPreview);
        if (data.primaryColor) setPrimaryColor(data.primaryColor);
        if (data.secondaryColor) setSecondaryColor(data.secondaryColor);
        if (data.visualStyle) setVisualStyle(data.visualStyle);
        if (data.writingTone) setWritingTone(data.writingTone);
        if (data.language) setLanguage(data.language);
        if (data.emojiUsage) setEmojiUsage(data.emojiUsage);
        if (data.workspaceId) setWorkspaceId(data.workspaceId);
      } else {
        // Check server progress if localStorage is clean
        getSavedOnboardingProgress().then((progress) => {
          if (progress?.initialStep && progress.initialStep > 1) {
            setCurrentStep(progress.initialStep as 1 | 2 | 3);
          }
          if (progress?.workspaceName) setWorkspaceName(progress.workspaceName);
          if (progress?.businessName) setBusinessName(progress.businessName);
          if (progress?.workspaceId) setWorkspaceId(progress.workspaceId);
        });
      }
    } catch (e) {
      console.error("Failed to restore onboarding draft:", e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // ═══════════════════════════════════════════════
  // AUTO-SYNC TO LOCAL STORAGE
  // ═══════════════════════════════════════════════
  useEffect(() => {
    if (!isInitialized) return;
    try {
      const stateToSave = {
        currentStep,
        workspaceId,
        workspaceName,
        timezone,
        businessName,
        category,
        description,
        location,
        website,
        whatsapp,
        targetAudience,
        products,
        showPromotion,
        promoName,
        promoDiscount,
        promoStartDate,
        promoEndDate,
        logoPreview,
        primaryColor,
        secondaryColor,
        visualStyle,
        writingTone,
        language,
        emojiUsage,
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.warn("Storage quota warning or error:", e);
    }
  }, [
    isInitialized,
    currentStep,
    workspaceId,
    workspaceName,
    timezone,
    businessName,
    category,
    description,
    location,
    website,
    whatsapp,
    targetAudience,
    products,
    showPromotion,
    promoName,
    promoDiscount,
    promoStartDate,
    promoEndDate,
    logoPreview,
    primaryColor,
    secondaryColor,
    visualStyle,
    writingTone,
    language,
    emojiUsage,
  ]);

  // ═══════════════════════════════════════════════
  // PRODUCTS HELPER HANDLERS
  // ═══════════════════════════════════════════════
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

  const handleRemoveProduct = (id: string) => {
    if (products.length <= 1) {
      alert("Minimal masukkan 1 produk atau layanan utama.");
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdateProduct = (
    id: string,
    field: keyof Omit<ProductItem, "id">,
    val: string
  ) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: val } : p))
    );
  };

  // ═══════════════════════════════════════════════
  // LOGO UPLOAD & RESIZE (Super lightweight)
  // ═══════════════════════════════════════════════
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "image/svg+xml" || file.size < 80 * 1024) {
      const reader = new FileReader();
      reader.onload = () => {
        setLogoPreview(reader.result as string);
      };
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
      reader.onload = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    };
    img.src = objectUrl;
  };

  // ═══════════════════════════════════════════════
  // STEP 1: SAVE & NEXT
  // ═══════════════════════════════════════════════
  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) {
      setErrorMsg("Nama workspace wajib diisi.");
      return;
    }
    setErrorMsg(null);

    // If businessName is still empty or default, match workspace
    if (!businessName || businessName === "Dapur Bu Ani") {
      setBusinessName(workspaceName);
    }

    startTransition(async () => {
      const res = await saveWorkspaceStep({
        name: workspaceName,
        timezone,
      });

      if (res?.error) {
        setErrorMsg(res.error);
        return;
      }

      if (res?.workspaceId) {
        setWorkspaceId(res.workspaceId);
      }

      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  // ═══════════════════════════════════════════════
  // STEP 2: SAVE & NEXT
  // ═══════════════════════════════════════════════
  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      setErrorMsg("Nama bisnis wajib diisi.");
      return;
    }
    if (!description.trim()) {
      setErrorMsg("Deskripsi bisnis wajib diisi untuk referensi AI.");
      return;
    }
    if (!targetAudience.trim()) {
      setErrorMsg("Target audiens wajib diisi.");
      return;
    }
    const hasInvalidProduct = products.some((p) => !p.name.trim());
    if (hasInvalidProduct) {
      setErrorMsg("Harap isi nama produk atau layanan yang ditambahkan.");
      return;
    }
    setErrorMsg(null);

    startTransition(async () => {
      const res = await saveBusinessProfileStep({
        workspaceId: workspaceId || undefined,
        businessName,
        category,
        description,
        location,
        website: website || undefined,
        whatsapp,
        targetAudience,
        productsServices: products.map((p) => ({
          name: p.name,
          price: p.price,
          description: p.description,
          benefits: p.benefits,
        })),
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

      if (res?.error) {
        setErrorMsg(res.error);
        return;
      }

      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  // ═══════════════════════════════════════════════
  // STEP 3: FINALIZE ONBOARDING
  // ═══════════════════════════════════════════════
  const handleFinalSubmit = () => {
    setErrorMsg(null);

    startTransition(async () => {
      const res = await saveBrandKitStep({
        workspaceId: workspaceId || undefined,
        logoUrl: logoPreview || undefined,
        primaryColor,
        secondaryColor,
        visualStyle,
        writingTone,
        language,
        emojiUsage,
      });

      if (res?.error) {
        setErrorMsg(res.error);
        return;
      }

      // Clear draft on successful completion
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch (e) {
        console.error(e);
      }

      router.push("/");
      router.refresh();
    });
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* ── PROGRESS STEPPER ── */}
      <div className="w-full max-w-2xl mb-8">
        <div className="flex items-center justify-between relative">
          {/* Background Connecting Line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-outline-variant/40 -translate-y-1/2 z-0" />
          {/* Active Colored Progress Line */}
          <div
            className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 z-0 transition-all duration-300"
            style={{
              width:
                currentStep === 1 ? "0%" : currentStep === 2 ? "50%" : "100%",
            }}
          />

          {/* Stepper Node 1 */}
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className="relative z-10 flex flex-col items-center cursor-pointer group"
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-200 ${
                currentStep > 1
                  ? "bg-primary text-on-primary"
                  : currentStep === 1
                  ? "bg-primary text-on-primary ring-4 ring-primary/20"
                  : "bg-surface-container border border-outline-variant text-outline"
              }`}
            >
              {currentStep > 1 ? (
                <Check className="w-[18px] h-[18px]" />
              ) : (
                "1"
              )}
            </div>
            <span
              className={`mt-2 font-label-sm text-label-sm font-medium ${
                currentStep >= 1 ? "text-on-surface" : "text-outline"
              }`}
            >
              Workspace
            </span>
          </button>

          {/* Stepper Node 2 */}
          <button
            type="button"
            onClick={() => {
              if (currentStep > 2 || workspaceName.trim()) setCurrentStep(2);
            }}
            className="relative z-10 flex flex-col items-center cursor-pointer group"
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-200 ${
                currentStep > 2
                  ? "bg-primary text-on-primary"
                  : currentStep === 2
                  ? "bg-primary text-on-primary ring-4 ring-primary/20"
                  : "bg-surface-container border border-outline-variant text-outline"
              }`}
            >
              {currentStep > 2 ? (
                <Check className="w-[18px] h-[18px]" />
              ) : (
                "2"
              )}
            </div>
            <span
              className={`mt-2 font-label-sm text-label-sm font-medium ${
                currentStep >= 2 ? "text-on-surface" : "text-outline"
              }`}
            >
              Business Profile
            </span>
          </button>

          {/* Stepper Node 3 */}
          <div className="relative z-10 flex flex-col items-center">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-200 ${
                currentStep === 3
                  ? "bg-primary text-on-primary ring-4 ring-primary/20"
                  : "bg-surface-container border border-outline-variant text-outline"
              }`}
            >
              3
            </div>
            <span
              className={`mt-2 font-label-sm text-label-sm font-medium ${
                currentStep === 3 ? "text-on-surface" : "text-outline"
              }`}
            >
              Brand Kit
            </span>
          </div>
        </div>
      </div>

      {/* ── AUTO-SAVE INDICATOR ── */}
      <div className="w-full max-w-2xl mb-4 flex items-center justify-between text-xs text-outline px-1">
        <span className="flex items-center gap-1 text-on-surface-variant font-label-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed-dim"></span>
          Progres otomatis tersimpan saat Anda berpindah langkah
        </span>
        <span className="text-[11px] text-outline">
          Refresh aman tanpa kehilangan data
        </span>
      </div>

      {/* ── ERROR ALERT ── */}
      {errorMsg && (
        <div className="w-full max-w-2xl mb-6 p-4 rounded-xl bg-error-container border border-error/30 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
          <div className="text-on-error-container text-body-sm font-medium">
            {errorMsg}
          </div>
        </div>
      )}

      {/* ── STEP 1: CREATE WORKSPACE ── */}
      {currentStep === 1 && (
        <div className="w-full max-w-2xl bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary-container/10 text-primary-container font-label-sm text-label-sm font-semibold mb-2">
              <Building2 className="w-4 h-4" />
              Langkah 1 dari 3
            </div>
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight">
              Buat Workspace Bisnis Anda
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              Workspace memisahkan kampanye, jadwal kalender, dan data brand
              Anda secara terstruktur.
            </p>
          </div>

          <form onSubmit={handleNextStep1} className="space-y-5">
            <div>
              <label
                htmlFor="ws-name"
                className="block font-label-md text-label-md font-medium text-on-surface mb-1.5"
              >
                Nama Workspace <span className="text-error">*</span>
              </label>
              <div className="relative">
                <input
                  id="ws-name"
                  type="text"
                  required
                  placeholder="Contoh: Dapur Bu Ani"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-outline-variant/80 bg-surface-container-lowest text-on-surface font-body-md text-body-md placeholder:text-outline/70 focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
                />
              </div>
              <p className="font-label-sm text-label-sm text-outline mt-1.5">
                Bisa menggunakan nama merek, restoran, toko, atau agensi Anda.
              </p>
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
                className="w-full h-11 px-3.5 rounded-lg border border-outline-variant/80 bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
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
              <p className="font-label-sm text-label-sm text-outline mt-1.5">
                AI akan menjadwalkan konten Instagram mengikuti zona waktu ini.
              </p>
            </div>

            <div className="pt-4 border-t border-outline-variant/30 flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="h-11 px-6 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-semibold flex items-center gap-2 shadow-xs active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-[18px] h-[18px] animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <span>Lanjut ke Profil Bisnis</span>
                    <ArrowRight className="w-[18px] h-[18px]" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── STEP 2: SETUP BUSINESS PROFILE ── */}
      {currentStep === 2 && (
        <div className="w-full max-w-3xl bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary-container/10 text-primary-container font-label-sm text-label-sm font-semibold mb-2">
              <Store className="w-4 h-4" />
              Langkah 2 dari 3
            </div>
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight">
              Setup Business Profile
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              Ini langkah yang sangat penting karena menjadi <strong>knowledge base utama AI</strong>. AI tidak akan mengarang fakta yang tidak ada di profil ini.
            </p>
          </div>

          <form onSubmit={handleNextStep2} className="space-y-6">
            {/* 1. Basic Information */}
            <div className="space-y-4">
              <h2 className="font-headline-sm text-label-md font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant/30 pb-2">
                <Info className="w-[18px] h-[18px] text-primary" />
                Basic Information
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="bp-name"
                    className="block font-label-md text-label-md font-medium text-on-surface mb-1"
                  >
                    Business Name <span className="text-error">*</span>
                  </label>
                  <input
                    id="bp-name"
                    type="text"
                    required
                    placeholder="Nama bisnis Anda"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-outline-variant/80 bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container"
                  />
                </div>

                <div>
                  <label
                    htmlFor="bp-cat"
                    className="block font-label-md text-label-md font-medium text-on-surface mb-1"
                  >
                    Category <span className="text-error">*</span>
                  </label>
                  <select
                    id="bp-cat"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-outline-variant/80 bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container"
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
                  Business Description <span className="text-error">*</span>
                </label>
                <textarea
                  id="bp-desc"
                  rows={3}
                  required
                  placeholder="Jelaskan apa yang ditawarkan bisnis Anda, keunggulan utama, dan ciri khas..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-lg border border-outline-variant/80 bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="bp-loc"
                    className="block font-label-md text-label-md font-medium text-on-surface mb-1"
                  >
                    Location <span className="text-error">*</span>
                  </label>
                  <input
                    id="bp-loc"
                    type="text"
                    required
                    placeholder="Kota / Alamat"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-outline-variant/80 bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container"
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
                    placeholder="0812-xxxx-xxxx"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-outline-variant/80 bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container"
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
                    placeholder="https://bisnisanda.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-outline-variant/80 bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container"
                  />
                </div>
              </div>
            </div>

            {/* 2. Target Audience */}
            <div className="space-y-2 pt-2 border-t border-outline-variant/30">
              <h2 className="font-headline-sm text-label-md font-bold text-on-surface flex items-center gap-2">
                <Users className="w-[18px] h-[18px] text-primary" />
                Target Audience
              </h2>
              <label
                htmlFor="bp-aud"
                className="block font-label-sm text-label-sm text-on-surface-variant"
              >
                Who are your customers? Siapa pembeli ideal konten Anda?
              </label>
              <input
                id="bp-aud"
                type="text"
                required
                placeholder="Contoh: Ibu rumah tangga, usia 25-45, pekerja kantoran"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-outline-variant/80 bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container"
              />
            </div>

            {/* 3. Products / Services */}
            <div className="space-y-3 pt-2 border-t border-outline-variant/30">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-headline-sm text-label-md font-bold text-on-surface flex items-center gap-2">
                    <ShoppingBag className="w-[18px] h-[18px] text-primary" />
                    Products / Services
                  </h2>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    Tambahkan produk atau layanan utama yang ingin dipromosikan AI.
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
                    key={p.id}
                    className="p-4 rounded-xl border border-outline-variant/60 bg-surface-container-low/40 space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-label-sm font-semibold text-primary">
                        Item #{idx + 1}
                      </span>
                      {products.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(p.id)}
                          className="text-outline hover:text-error transition-colors text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          Hapus
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-label-sm text-label-sm font-medium text-on-surface mb-1">
                          Product / Service Name <span className="text-error">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Nasi Box Ayam Bakar"
                          value={p.name}
                          onChange={(e) =>
                            handleUpdateProduct(p.id, "name", e.target.value)
                          }
                          className="w-full h-9 px-3 rounded-md border border-outline-variant/70 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary-container"
                        />
                      </div>
                      <div>
                        <label className="block font-label-sm text-label-sm font-medium text-on-surface mb-1">
                          Price
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: Rp25.000"
                          value={p.price}
                          onChange={(e) =>
                            handleUpdateProduct(p.id, "price", e.target.value)
                          }
                          className="w-full h-9 px-3 rounded-md border border-outline-variant/70 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary-container"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-label-sm text-label-sm font-medium text-on-surface mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        placeholder="Deskripsi singkat produk/layanan"
                        value={p.description}
                        onChange={(e) =>
                          handleUpdateProduct(p.id, "description", e.target.value)
                        }
                        className="w-full h-9 px-3 rounded-md border border-outline-variant/70 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary-container"
                      />
                    </div>

                    <div>
                      <label className="block font-label-sm text-label-sm font-medium text-on-surface mb-1">
                        Benefits
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Nasi + ayam bakar + lalapan + sambal terasi"
                        value={p.benefits}
                        onChange={(e) =>
                          handleUpdateProduct(p.id, "benefits", e.target.value)
                        }
                        className="w-full h-9 px-3 rounded-md border border-outline-variant/70 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary-container"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Promotion (Optional) */}
            <div className="pt-2 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => setShowPromotion(!showPromotion)}
                className="flex items-center justify-between w-full text-left font-headline-sm text-label-md font-bold text-on-surface hover:text-primary transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Tag className="w-[18px] h-[18px] text-tertiary" />
                  <span>Promotion (Opsional)</span>
                  <span className="text-xs font-normal text-outline">
                    {showPromotion ? "Sembunyikan" : "Buka form promo"}
                  </span>
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
                        Current Promotion Name
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Diskon Grand Opening / Promo Weekend"
                        value={promoName}
                        onChange={(e) => setPromoName(e.target.value)}
                        className="w-full h-9 px-3 rounded-md border border-outline-variant/70 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary-container"
                      />
                    </div>
                    <div>
                      <label className="block font-label-sm text-label-sm font-medium text-on-surface mb-1">
                        Discount / Penawaran
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Diskon 20% / Beli 5 Gratis 1"
                        value={promoDiscount}
                        onChange={(e) => setPromoDiscount(e.target.value)}
                        className="w-full h-9 px-3 rounded-md border border-outline-variant/70 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary-container"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-label-sm text-label-sm font-medium text-on-surface mb-1">
                        Start Date
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
                        End Date
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

            {/* Buttons */}
            <div className="pt-4 border-t border-outline-variant/30 flex items-center justify-between">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setCurrentStep(1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="h-11 px-5 rounded-lg border border-outline-variant/80 text-on-surface hover:bg-surface-container font-label-md text-label-md font-medium transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <ArrowLeft className="w-[18px] h-[18px]" />
                <span>Kembali</span>
              </button>

              <button
                type="submit"
                disabled={isPending}
                className="h-11 px-6 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-semibold flex items-center gap-2 shadow-xs active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-[18px] h-[18px] animate-spin" />
                    <span>Menyimpan Profil...</span>
                  </>
                ) : (
                  <>
                    <span>Save & Continue</span>
                    <ArrowRight className="w-[18px] h-[18px]" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── STEP 3: SETUP BRAND KIT ── */}
      {currentStep === 3 && (
        <div className="w-full max-w-3xl bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary-container/10 text-primary-container font-label-sm text-label-sm font-semibold mb-2">
              <Palette className="w-4 h-4" />
              Langkah 3 dari 3
            </div>
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight">
              Setup Brand Kit
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              Make your content look like your brand. Atur identitas visual dan gaya bahasa agar postingan konsisten.
            </p>
          </div>

          <div className="space-y-6">
            {/* 1. Upload Logo */}
            <div>
              <label className="block font-label-md text-label-md font-bold text-on-surface mb-2">
                Upload Logo
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
                    Format PNG, JPG, atau SVG transparan (otomatis dikompresi).
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Brand Colors */}
            <div className="pt-2 border-t border-outline-variant/30">
              <h2 className="font-headline-sm text-label-md font-bold text-on-surface mb-3">
                Brand Colors
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Primary Color */}
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

                {/* Secondary Color */}
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
              <label className="block font-headline-sm text-label-md font-bold text-on-surface mb-2">
                Visual Style
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
              <label className="block font-headline-sm text-label-md font-bold text-on-surface mb-2">
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
                <label className="block font-headline-sm text-label-md font-bold text-on-surface mb-2">
                  Language
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
                <label className="block font-headline-sm text-label-md font-bold text-on-surface mb-2">
                  Emoji Usage
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

            {/* Buttons */}
            <div className="pt-4 border-t border-outline-variant/30 flex items-center justify-between">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setCurrentStep(2);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="h-11 px-5 rounded-lg border border-outline-variant/80 text-on-surface hover:bg-surface-container font-label-md text-label-md font-medium transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <ArrowLeft className="w-[18px] h-[18px]" />
                <span>Kembali</span>
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={handleFinalSubmit}
                className="h-11 px-6 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-semibold flex items-center gap-2 shadow-xs active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-[18px] h-[18px] animate-spin" />
                    <span>Menyimpan & Menyiapkan AI...</span>
                  </>
                ) : (
                  <>
                    <span>Selesaikan & Masuk ke Dashboard</span>
                    <CheckCircle2 className="w-[18px] h-[18px]" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
