import { supabase } from "@/integrations/supabase/client";

type DownloadPhotoResponse = {
  success: boolean;
  data?: string;
  contentType?: string;
  error?: string;
};

export async function getComplyCubePhoto(
  photoId: string
): Promise<{ base64: string; contentType: string }> {
  if (!photoId) {
    throw new Error("photoId is required");
  }

  const { data, error } = await supabase.functions.invoke<DownloadPhotoResponse>(
    "download-photo",
    {
      body: { photoId },
    }
  );

  if (error) {
    throw new Error(error.message || "Failed to download photo");
  }

  if (!data?.success || !data.data) {
    throw new Error(data?.error || "No photo data returned");
  }

  const contentType = data.contentType || "image/jpeg";

  return {
    base64: `data:${contentType};base64,${data.data}`,
    contentType,
  };
}

