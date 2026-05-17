import { ChatShell } from "../components/chat-shell";
import { getLaunchReadinessState } from "../lib/launch-readiness";
import { getRevenueSetupState } from "../lib/revenue-setup";

export default function Page() {
  return (
    <ChatShell
      launchReadiness={getLaunchReadinessState()}
      revenueSetup={getRevenueSetupState()}
    />
  );
}
