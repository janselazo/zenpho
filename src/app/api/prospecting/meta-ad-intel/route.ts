import { handleMetaAdIntelRequest } from "@/lib/crm/meta-ad-intel-service";

export async function POST(req: Request) {
  return handleMetaAdIntelRequest(req);
}
