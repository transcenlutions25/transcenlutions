import { ChatShell } from "../components/chat-shell";
import { getDeploymentReadinessState } from "../lib/deployment-readiness";
import { getLaunchReadinessState } from "../lib/launch-readiness";
import { getRevenueSetupState } from "../lib/revenue-setup";
import { desktopBridgeUrl } from "../lib/desktop-bridge";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <>
      <ChatShell
        desktopEnabled={Boolean(desktopBridgeUrl())}
        deploymentReadiness={getDeploymentReadinessState()}
        launchReadiness={getLaunchReadinessState()}
        revenueSetup={getRevenueSetupState()}
      />
    </>
  );
}
