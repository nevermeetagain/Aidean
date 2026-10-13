import { success } from "@/lib/api/response";
import { systemService } from "@/lib/services/system.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await systemService.getSiteConfig();
  return success(config);
}
