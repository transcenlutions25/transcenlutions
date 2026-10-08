import Link from "next/link";
import { ChatShell } from "../components/chat-shell";
import { getDeploymentReadinessState } from "../lib/deployment-readiness";
import { getLaunchReadinessState } from "../lib/launch-readiness";
import { getRevenueSetupState } from "../lib/revenue-setup";
import { desktopBridgeUrl } from "../lib/desktop-bridge";

export const dynamic = "force-dynamic";

const intelligenceLinkStyle = {
  color: "#f3d36a",
  fontWeight: 700,
  textDecoration: "none",
} as const;

export default function Page() {
  return (
    <>
      <nav
        aria-label="Transcenlutions operating intelligence"
        style={{
          alignItems: "center",
          background: "linear-gradient(90deg, #08080d, #17102b, #071c4d)",
          borderBottom: "1px solid rgba(243, 211, 106, 0.5)",
          color: "white",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.9rem",
          justifyContent: "center",
          padding: "0.55rem 1rem",
        }}
      >
        <strong>Operating intelligence</strong>
        <Link href="/acquisition" style={intelligenceLinkStyle}>Acquisition & Funding</Link>
        <Link href="/creative-intelligence" style={intelligenceLinkStyle}>Creative Intelligence 2026</Link>
      </nav>
      <ChatShell
        desktopEnabled={Boolean(desktopBridgeUrl())}
        deploymentReadiness={getDeploymentReadinessState()}
        launchReadiness={getLaunchReadinessState()}
        revenueSetup={getRevenueSetupState()}
      />
    </>
  );
}
