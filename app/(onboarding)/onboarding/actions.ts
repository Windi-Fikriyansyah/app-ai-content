"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface WorkspaceStepData {
  name: string;
  timezone: string;
}

export interface BusinessProfileStepData {
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
}

export interface BrandKitStepData {
  workspaceId?: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  visualStyle: string;
  writingTone: string;
  language: string;
  emojiUsage: string;
}

// ═══════════════════════════════════════════════════════════════════
// STEP 1: SAVE WORKSPACE
// ═══════════════════════════════════════════════════════════════════
export async function saveWorkspaceStep(data: WorkspaceStepData) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isConfigured =
    supabaseUrl &&
    supabaseKey &&
    supabaseUrl !== "your-supabase-url-here" &&
    supabaseUrl.startsWith("http");

  if (!isConfigured) {
    return { success: true, workspaceId: "local-ws-id" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sesi tidak ditemukan. Silakan login kembali." };
  }

  try {
    let workspaceId: string | null = null;

    // Check if workspace already exists for this owner
    const { data: existingWs } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingWs?.id) {
      workspaceId = existingWs.id;
      await supabase
        .from("workspaces")
        .update({
          name: data.name,
          timezone: data.timezone || "Asia/Jakarta",
          updated_at: new Date().toISOString(),
        })
        .eq("id", workspaceId);
    } else {
      const { data: newWs, error: insertErr } = await supabase
        .from("workspaces")
        .insert({
          owner_id: user.id,
          name: data.name,
          timezone: data.timezone || "Asia/Jakarta",
        })
        .select("id")
        .single();

      if (!insertErr && newWs) {
        workspaceId = newWs.id;
      }
    }

    // Save progress to user metadata
    await supabase.auth.updateUser({
      data: {
        workspace_id: workspaceId,
        workspace_name: data.name,
        onboarding_step: 2,
      },
    });

    return { success: true, workspaceId };
  } catch (err) {
    console.error("Error saving workspace step:", err);
    // Fallback: still record in metadata
    await supabase.auth.updateUser({
      data: {
        workspace_name: data.name,
        onboarding_step: 2,
      },
    });
    return { success: true, workspaceId: null };
  }
}

// ═══════════════════════════════════════════════════════════════════
// STEP 2: SAVE BUSINESS PROFILE
// ═══════════════════════════════════════════════════════════════════
export async function saveBusinessProfileStep(data: BusinessProfileStepData) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isConfigured =
    supabaseUrl &&
    supabaseKey &&
    supabaseUrl !== "your-supabase-url-here" &&
    supabaseUrl.startsWith("http");

  if (!isConfigured) {
    return { success: true, profileId: "local-bp-id" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sesi tidak ditemukan. Silakan login kembali." };
  }

  try {
    // Resolve workspace ID
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
      // Check if business profile exists for this workspace
      const { data: existingBp } = await supabase
        .from("business_profiles")
        .select("id")
        .eq("workspace_id", wsId)
        .maybeSingle();

      let bpId: string | null = existingBp?.id || null;

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

    // Update metadata progress
    await supabase.auth.updateUser({
      data: {
        business_name: data.businessName,
        onboarding_step: 3,
      },
    });

    return { success: true };
  } catch (err) {
    console.error("Error saving business profile step:", err);
    await supabase.auth.updateUser({
      data: {
        business_name: data.businessName,
        onboarding_step: 3,
      },
    });
    return { success: true };
  }
}

// ═══════════════════════════════════════════════════════════════════
// STEP 3: SAVE BRAND KIT & FINALIZE ONBOARDING
// ═══════════════════════════════════════════════════════════════════
export async function saveBrandKitStep(data: BrandKitStepData) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isConfigured =
    supabaseUrl &&
    supabaseKey &&
    supabaseUrl !== "your-supabase-url-here" &&
    supabaseUrl.startsWith("http");

  if (!isConfigured) {
    return { success: true, redirect: "/" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sesi tidak ditemukan. Silakan login kembali." };
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
      // Check existing brand kit
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

    // Finalize onboarding in user metadata
    await supabase.auth.updateUser({
      data: {
        onboarding_completed: true,
        onboarding_step: 3,
      },
    });

    return { success: true, redirect: "/" };
  } catch (err) {
    console.error("Error saving brand kit step:", err);
    await supabase.auth.updateUser({
      data: {
        onboarding_completed: true,
      },
    });
    return { success: true, redirect: "/" };
  }
}

// ═══════════════════════════════════════════════════════════════════
// GET SAVED PROGRESS (If available on server)
// ═══════════════════════════════════════════════════════════════════
export async function getSavedOnboardingProgress() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isConfigured =
    supabaseUrl &&
    supabaseKey &&
    supabaseUrl !== "your-supabase-url-here" &&
    supabaseUrl.startsWith("http");

  if (!isConfigured) {
    return { initialStep: 1 };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { initialStep: 1 };

    const metadata = user.user_metadata || {};
    const step = metadata.onboarding_step ? Number(metadata.onboarding_step) : 1;
    const workspaceName = metadata.workspace_name || "";
    const businessName = metadata.business_name || "";
    const workspaceId = metadata.workspace_id || "";

    return {
      initialStep: step >= 1 && step <= 3 ? step : 1,
      workspaceName,
      businessName,
      workspaceId,
    };
  } catch {
    return { initialStep: 1 };
  }
}

export async function logoutUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isConfigured =
    supabaseUrl &&
    supabaseKey &&
    supabaseUrl !== "your-supabase-url-here" &&
    supabaseUrl.startsWith("http");

  if (isConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}
