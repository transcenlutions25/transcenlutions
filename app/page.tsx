import { ChatShell } from "../components/chat-shell";
import { getDeploymentReadinessState } from "../lib/deployment-readiness";
import { getLaunchReadinessState } from "../lib/launch-readiness";
import { getRevenueSetupState } from "../lib/revenue-setup";

export default function Page() {
  return (
    <ChatShell
      deploymentReadiness={getDeploymentReadinessState()}
      launchReadiness={getLaunchReadinessState()}
      revenueSetup={getRevenueSetupState()}
    />
  );
}
