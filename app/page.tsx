import { ChatShell } from "../components/chat-shell";
import { getRevenueSetupState } from "../lib/revenue-setup";

export default function Page() {
  return <ChatShell revenueSetup={getRevenueSetupState()} />;
}
