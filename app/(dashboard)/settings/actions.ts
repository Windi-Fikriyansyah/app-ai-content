"use server";

import { createClient } from "@/lib/supabase/server";

export interface SettingsData {
  user: {
    id: string;
    email: string;
  };
  workspace: {
    id?: string;
    name: string;
    timezone: string;
  };
  businessProfile: {
    id?: string;
    businessName: string;
    category: string;
    description: string;
    location: string;
    website?: string;
    whatsapp: string;
    targetAudience: string;
  };
  productsServices: Array<{
    id?: string;
    name: string;
    price: string;
    description: string;
    benefits: string;
  }>;
  promotion?: {
    id?: string;
    name?: string;
    discount?: string;
    startDate?: string;
    endDate?: string;
  };
  brandKit: {
    id?: string;
    logoUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    visualStyle: string;
    writingTone: string;
    language: string;
    emojiUsage: string;
  };
}

// ═══════════════════════════════════════════════════════════════════
// GET SETTINGS DATA
// ═══════════════════════════════════════════════════════════════════
export async function getSettingsData(): Promise<{
  success: boolean;
  data?: SettingsData;
  error?: string;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isConfigured =
    supabaseUrl &&
    supabaseKey &&
    supabaseUrl !== "your-supabase-url-here" &&
    supabaseUrl.startsWith("http");

  if (!isConfigured) {
    // Return sensible fallback for local development
    return {
      success: true,
      data: {
        user: { id: "dev-user", email: "dev@autocontent.ai" },
        workspace: { name: "Dapur Bu Ani", timezone: "Asia/Jakarta (WIB)" },
        businessProfile: {
          businessName: "Dapur Bu Ani",
          category: "Kuliner & F&B",
          description:
            "Katering rumahan sehat dan higienis yang menyediakan aneka nasi box, tumpeng mini, dan masakan khas Nusantara untuk acara keluarga & kantor.",
          location: "Jakarta Selatan",
          website: "",
          whatsapp: "0812-3456-7890",
          targetAudience:
            "Ibu rumah tangga, usia 25-45, pekerja kantoran pengada konsumsi acara",
        },
        productsServices: [
          {
            id: "prod-1",
            name: "Nasi Box Ayam Bakar",
            price: "Rp25.000",
            description:
              "Paket nasi pulen dengan ayam bakar madu bumbu rempah spesial",
            benefits:
              "Nasi + ayam bakar + lalapan segar + sambal terasi + tahu/tempe",
          },
        ],
        promotion: {
          name: "",
          discount: "",
          startDate: "",
          endDate: "",
        },
        brandKit: {
          logoUrl: "",
          primaryColor: "#4F46E5",
          secondaryColor: "#06B6D4",
          visualStyle: "Modern",
          writingTone: "Friendly",
          language: "Bahasa Indonesia",
          emojiUsage: "Medium",
        },
      },
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Pengguna tidak terautentikasi." };
    }

    const metadata = user.user_metadata || {};

    // Defaults from metadata
    let workspaceName = metadata.workspace_name || "Dapur Bu Ani";
    let timezone = "Asia/Jakarta (WIB)";
    let workspaceId: string | undefined = metadata.workspace_id;

    let businessProfileData = {
      businessName: metadata.business_name || workspaceName,
      category: "Kuliner & F&B",
      description:
        "Katering rumahan sehat dan higienis yang menyediakan aneka nasi box, tumpeng mini, dan masakan khas Nusantara.",
      location: "Jakarta Selatan",
      website: "",
      whatsapp: "0812-3456-7890",
      targetAudience: "Ibu rumah tangga, usia 25-45, pekerja kantor",
    };

    let productsServices: Array<{
      id?: string;
      name: string;
      price: string;
      description: string;
      benefits: string;
    }> = [
      {
        id: "prod-1",
        name: "Nasi Box Ayam Bakar",
        price: "Rp25.000",
        description: "Paket nasi pulen ayam bakar madu",
        benefits: "Nasi + ayam bakar + lalapan + sambal terasi",
      },
    ];

    let promotionData: {
      name?: string;
      discount?: string;
      startDate?: string;
      endDate?: string;
    } = {};

    let brandKitData = {
      logoUrl: "",
      primaryColor: "#4F46E5",
      secondaryColor: "#06B6D4",
      visualStyle: "Modern",
      writingTone: "Friendly",
      language: "Bahasa Indonesia",
      emojiUsage: "Medium",
    };

    // Attempt to query database tables
    try {
      // 1. Workspace
      const { data: ws } = await supabase
        .from("workspaces")
        .select("id, name, timezone")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ws) {
        workspaceId = ws.id;
        workspaceName = ws.name || workspaceName;
        timezone = ws.timezone || timezone;

        // 2. Business Profile
        const { data: bp } = await supabase
          .from("business_profiles")
          .select(
            "id, business_name, category, description, location, website, whatsapp, target_audience"
          )
          .eq("workspace_id", workspaceId)
          .maybeSingle();

        if (bp) {
          businessProfileData = {
            businessName: bp.business_name || businessProfileData.businessName,
            category: bp.category || businessProfileData.category,
            description: bp.description || businessProfileData.description,
            location: bp.location || businessProfileData.location,
            website: bp.website || "",
            whatsapp: bp.whatsapp || businessProfileData.whatsapp,
            targetAudience:
              bp.target_audience || businessProfileData.targetAudience,
          };

          // 3. Products / Services
          const { data: prods } = await supabase
            .from("products_services")
            .select("id, name, price, description, benefits")
            .eq("business_profile_id", bp.id);

          if (prods && prods.length > 0) {
            productsServices = prods.map((p) => ({
              id: p.id,
              name: p.name || "",
              price: p.price || "",
              description: p.description || "",
              benefits: p.benefits || "",
            }));
          }

          // 4. Promotions
          const { data: promo } = await supabase
            .from("promotions")
            .select("id, name, discount, start_date, end_date")
            .eq("business_profile_id", bp.id)
            .maybeSingle();

          if (promo) {
            promotionData = {
              name: promo.name || "",
              discount: promo.discount || "",
              startDate: promo.start_date || "",
              endDate: promo.end_date || "",
            };
          }
        }

        // 5. Brand Kit
        const { data: bk } = await supabase
          .from("brand_kits")
          .select(
            "id, logo_url, primary_color, secondary_color, visual_style, writing_tone, language, emoji_usage"
          )
          .eq("workspace_id", workspaceId)
          .maybeSingle();

        if (bk) {
          brandKitData = {
            logoUrl: bk.logo_url || "",
            primaryColor: bk.primary_color || brandKitData.primaryColor,
            secondaryColor: bk.secondary_color || brandKitData.secondaryColor,
            visualStyle: bk.visual_style || brandKitData.visualStyle,
            writingTone: bk.writing_tone || brandKitData.writingTone,
            language: bk.language || brandKitData.language,
            emojiUsage: bk.emoji_usage || brandKitData.emojiUsage,
          };
        }
      }
    } catch (dbErr) {
      console.warn("DB query notice (using fallback data):", dbErr);
    }

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email || "",
        },
        workspace: {
          id: workspaceId,
          name: workspaceName,
          timezone,
        },
        businessProfile: businessProfileData,
        productsServices,
        promotion: promotionData,
        brandKit: brandKitData,
      },
    };
  } catch (err: unknown) {
    console.error("Error in getSettingsData:", err);
    return { success: false, error: "Gagal memuat data pengaturan." };
  }
}

// ═══════════════════════════════════════════════════════════════════
// UPDATE WORKSPACE SETTINGS
// ═══════════════════════════════════════════════════════════════════
export async function updateWorkspaceSettings(data: {
  workspaceId?: string;
  name: string;
  timezone: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sesi tidak ditemukan." };
  }

  try {
    let wsId = data.workspaceId || user.user_metadata?.workspace_id;

    if (wsId) {
      await supabase
        .from("workspaces")
        .update({
          name: data.name,
          timezone: data.timezone,
          updated_at: new Date().toISOString(),
        })
        .eq("id", wsId);
    } else {
      const { data: newWs } = await supabase
        .from("workspaces")
        .insert({
          owner_id: user.id,
          name: data.name,
          timezone: data.timezone,
        })
        .select("id")
        .single();
      if (newWs) wsId = newWs.id;
    }

    // Update user auth metadata
    await supabase.auth.updateUser({
      data: {
        workspace_id: wsId,
        workspace_name: data.name,
      },
    });

    return { success: true, message: "Pengaturan Workspace berhasil disimpan." };
  } catch (err) {
    console.error("Error updating workspace:", err);
    return { error: "Gagal memperbarui workspace." };
  }
}

// ═══════════════════════════════════════════════════════════════════
// UPDATE BUSINESS PROFILE SETTINGS
// ═══════════════════════════════════════════════════════════════════
export async function updateBusinessProfileSettings(data: {
  workspaceId?: string;
  businessName: string;
  category: string;
  description: string;
  location: string;
  website?: string;
  whatsapp: string;
  targetAudience: string;
  productsServices: Array<{
    name: string;
    price: string;
    description: string;
    benefits: string;
  }>;
  promotion?: {
    name?: string;
    discount?: string;
    startDate?: string;
    endDate?: string;
  };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sesi tidak ditemukan." };
  }

  try {
    let wsId = data.workspaceId || user.user_metadata?.workspace_id;
    if (!wsId) {
      const { data: ws } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (ws) wsId = ws.id;
    }

    if (wsId) {
      const { data: existingBp } = await supabase
        .from("business_profiles")
        .select("id")
        .eq("workspace_id", wsId)
        .maybeSingle();

      let bpId = existingBp?.id;

      if (bpId) {
        await supabase
          .from("business_profiles")
          .update({
            business_name: data.businessName,
            category: data.category,
            description: data.description,
            location: data.location,
            website: data.website || null,
            whatsapp: data.whatsapp,
            target_audience: data.targetAudience,
            updated_at: new Date().toISOString(),
          })
          .eq("id", bpId);
      } else {
        const { data: newBp } = await supabase
          .from("business_profiles")
          .insert({
            workspace_id: wsId,
            business_name: data.businessName,
            category: data.category,
            description: data.description,
            location: data.location,
            website: data.website || null,
            whatsapp: data.whatsapp,
            target_audience: data.targetAudience,
          })
          .select("id")
          .single();
        if (newBp) bpId = newBp.id;
      }

      if (bpId) {
        // Sync products
        await supabase
          .from("products_services")
          .delete()
          .eq("business_profile_id", bpId);

        if (data.productsServices?.length > 0) {
          await supabase.from("products_services").insert(
            data.productsServices.map((p) => ({
              business_profile_id: bpId,
              name: p.name,
              price: p.price,
              description: p.description,
              benefits: p.benefits,
            }))
          );
        }

        // Sync promotion
        await supabase
          .from("promotions")
          .delete()
          .eq("business_profile_id", bpId);

        if (data.promotion?.name) {
          await supabase.from("promotions").insert({
            business_profile_id: bpId,
            name: data.promotion.name,
            discount: data.promotion.discount || null,
            start_date: data.promotion.startDate || null,
            end_date: data.promotion.endDate || null,
          });
        }
      }
    }

    await supabase.auth.updateUser({
      data: {
        business_name: data.businessName,
      },
    });

    return {
      success: true,
      message: "Business Profile & Produk/Layanan berhasil disimpan.",
    };
  } catch (err) {
    console.error("Error updating business profile:", err);
    return { error: "Gagal memperbarui Business Profile." };
  }
}

// ═══════════════════════════════════════════════════════════════════
// UPDATE BRAND KIT SETTINGS
// ═══════════════════════════════════════════════════════════════════
export async function updateBrandKitSettings(data: {
  workspaceId?: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  visualStyle: string;
  writingTone: string;
  language: string;
  emojiUsage: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sesi tidak ditemukan." };
  }

  try {
    let wsId = data.workspaceId || user.user_metadata?.workspace_id;
    if (!wsId) {
      const { data: ws } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (ws) wsId = ws.id;
    }

    if (wsId) {
      const { data: existingBk } = await supabase
        .from("brand_kits")
        .select("id")
        .eq("workspace_id", wsId)
        .maybeSingle();

      if (existingBk?.id) {
        await supabase
          .from("brand_kits")
          .update({
            logo_url: data.logoUrl || null,
            primary_color: data.primaryColor,
            secondary_color: data.secondaryColor,
            visual_style: data.visualStyle,
            writing_tone: data.writingTone,
            language: data.language,
            emoji_usage: data.emojiUsage,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingBk.id);
      } else {
        await supabase.from("brand_kits").insert({
          workspace_id: wsId,
          logo_url: data.logoUrl || null,
          primary_color: data.primaryColor,
          secondary_color: data.secondaryColor,
          visual_style: data.visualStyle,
          writing_tone: data.writingTone,
          language: data.language,
          emoji_usage: data.emojiUsage,
        });
      }
    }

    return { success: true, message: "Brand Kit berhasil diperbarui." };
  } catch (err) {
    console.error("Error updating brand kit:", err);
    return { error: "Gagal memperbarui Brand Kit." };
  }
}
