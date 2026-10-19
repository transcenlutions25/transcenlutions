import { authorityTree, listAgents, skillTree } from "../../../../lib/tay/registry";
import { modelStatus } from "../../../../lib/tay/model";
import { fail, json, requireUser } from "../../../../lib/tay/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The Agent Tree, Skill Tree and Authority Tree the interface renders.
 * Read-only: authority is decided in `lib/tay/registry.ts` on every request,
 * never by anything this route returns.
 */
export async function GET() {
  try {
    const { user } = await requireUser();
    const model = await modelStatus();
    return json({
      ok: true,
      viewer: { id: user.id, isOwner: user.isOwner, role: user.role },
      agents: listAgents(),
      skills: skillTree(),
      authority: authorityTree(),
      model,
    });
  } catch (error) {
    return fail(error);
  }
}
