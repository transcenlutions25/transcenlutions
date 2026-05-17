import { Lock, ShieldAlert, ShieldCheck } from "lucide-react";
import {
  actionRegistry,
  governanceCarePoints,
  governanceRules,
} from "../lib/governance";
import { permissionLabels, riskTierLabels } from "../lib/public-copy";

const permissionIcons = {
  allowed: ShieldCheck,
  requires_approval: Lock,
  blocked: ShieldAlert,
};

export function GovernancePanel() {
  const registryItems = Object.values(actionRegistry).filter(
    (item) => item.type !== "none",
  );

  return (
    <section className="panel governance-panel" aria-label="Governance rules">
      <div className="section-heading">
        <p className="eyebrow">Governance</p>
        <span>Active</span>
      </div>
      <h2>One rule path for every move.</h2>

      <div className="governance-rule-grid">
        {registryItems.map((item) => {
          const Icon = permissionIcons[item.defaultPermission];

          return (
            <article key={item.type}>
              <div>
                <Icon size={15} />
                <strong>{item.label}</strong>
              </div>
              <span>
                {permissionLabels[item.defaultPermission]} /{" "}
                {riskTierLabels[item.defaultRiskTier]} / {item.defaultRiskScore}
              </span>
            </article>
          );
        })}
      </div>

      <div className="governance-boundaries">
        {governanceRules.map((rule) => {
          const Icon = permissionIcons[rule.permissionStatus];

          return (
            <span key={rule.id}>
              <Icon size={14} />
              {permissionLabels[rule.permissionStatus]}:{" "}
              {riskTierLabels[rule.riskTier]} {rule.riskScore}
            </span>
          );
        })}
      </div>

      <div className="governance-care-list">
        {governanceCarePoints.map((point) => (
          <p key={point}>{point}</p>
        ))}
      </div>
    </section>
  );
}
