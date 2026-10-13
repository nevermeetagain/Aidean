import { success } from "@/lib/api/response";
import { systemService } from "@/lib/services/system.service";

export async function GET() {
  const config = await systemService.getSiteConfig();
  return success(config);
}
