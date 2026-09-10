import { createAdminClient } from "../supabase/admin";

export const STORAGE_BUCKET = "content-media";

/**
 * Ensures that the target storage bucket exists and is configured as public.
 */
export async function ensureContentMediaBucket(): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
    if (listErr) {
      console.warn(`[Storage] Warning listing buckets: ${listErr.message}`);
      return false;
    }

    const bucketExists = buckets?.some((b) => b.name === STORAGE_BUCKET);
    if (!bucketExists) {
      console.log(`[Storage] Creating public bucket "${STORAGE_BUCKET}"...`);
      const { error: createErr } = await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
      });
      if (createErr && !createErr.message.includes("already exists")) {
        console.warn(`[Storage] Could not create bucket: ${createErr.message}`);
        return false;
      }
    }
    return true;
  } catch (err: any) {
    console.warn(`[Storage] ensureContentMediaBucket error: ${err.message}`);
    return false;
  }
}

/**
 * Uploads an image Buffer to Supabase Storage and returns the public URL.
 *
 * Architecture Flow:
 * OpenAI Image API → b64_json (or url) → Buffer → Supabase Storage → Public URL → Database
 */
export async function uploadImageBufferToSupabase(
  buffer: Buffer,
  formatPrefix: string = "post",
  contentType: string = "image/png"
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  try {
    const supabase = createAdminClient();
    await ensureContentMediaBucket();

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const cleanPrefix = (formatPrefix || "post").toLowerCase().replace(/[^a-z0-9]/g, "-");
    const filePath = `posts/${cleanPrefix}-${timestamp}-${randomSuffix}.png`;

    console.log(`[Storage] 📤 Uploading image (${buffer.length} bytes) to "${STORAGE_BUCKET}/${filePath}"...`);

    const { error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadErr) {
      console.error(`[Storage] ❌ Supabase Storage upload error: ${uploadErr.message}`);
      return { success: false, error: uploadErr.message };
    }

    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      console.error(`[Storage] ❌ Could not retrieve public URL for ${filePath}`);
      return { success: false, error: "Gagal mendapatkan Public URL dari Supabase Storage." };
    }

    console.log(`[Storage] 🌐 Public URL generated: ${urlData.publicUrl}`);
    return { success: true, publicUrl: urlData.publicUrl };
  } catch (err: any) {
    console.error(`[Storage] ❌ Unexpected upload error:`, err);
    return { success: false, error: err.message || "Gagal mengunggah gambar ke Supabase Storage." };
  }
}
