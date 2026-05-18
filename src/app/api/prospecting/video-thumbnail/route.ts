import { handleVideoThumbnailRequest } from "@/lib/crm/video-thumbnail-service";

export async function POST(req: Request) {
  return handleVideoThumbnailRequest(req);
}
