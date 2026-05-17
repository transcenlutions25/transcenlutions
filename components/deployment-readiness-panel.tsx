"use client";

import {
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  Globe2,
  Rocket,
  ServerCog,
} from "lucide-react";
import type { DeploymentReadinessState } from "../lib/deployment-readiness";

interface DeploymentReadinessPanelProps {
  deploymentReadiness: DeploymentReadinessState;
}

const statusLabels: Record<string, string> = {
  configured: "configured",
  missing: "setup required",
  review_needed: "founder review needed",
  test_only: "test only",
};

export function DeploymentReadinessPanel({
  deploymentReadiness,
}: DeploymentReadinessPanelProps) {
  return (
    <section className="deployment-command" aria-label="Deployment readiness">
      <div className="section-header">
        <p className="eyebrow">Deployment Readiness</p>
        <h2>Open the real doors before public launch.</h2>
        <p>
          Tay does not treat external services as live until domain, hosting,
          email, Stripe, legal pages, and support routes are actually ready.
        </p>
      </div>

      <div className="deployment-truth-grid">
        <article className="deployment-card deployment-card--primary">
          <div className="card-title-row">
            <span className="icon-disc">
              <Rocket size={17} />
            </span>
            <p className="eyebrow">Mode</p>
          </div>
          <h3>{deploymentReadiness.title}</h3>
          <p>{deploymentReadiness.description}</p>
          <dl className="deployment-metrics">
            <div>
              <dt>Environment</dt>
              <dd>{deploymentReadiness.environment}</dd>
            </div>
            <div>
              <dt>Production ready</dt>
              <dd>{deploymentReadiness.productionReadyPercent}%</dd>
            </div>
          </dl>
        </article>

        <article className="deployment-card">
          <div className="card-title-row">
            <span className="icon-disc">
              <ServerCog size={17} />
            </span>
            <p className="eyebrow">Top Priority</p>
          </div>
          <h3>{deploymentReadiness.topPriority}</h3>
          <p>Clear this before pointing real traffic at the platform.</p>
        </article>

        <article className="deployment-card">
          <div className="card-title-row">
            <span className="icon-disc">
              <Globe2 size={17} />
            </span>
            <p className="eyebrow">Hosting Target</p>
          </div>
          <h3>{deploymentReadiness.hostingTarget}</h3>
          <p>Production hosting remains setup-required until explicitly set.</p>
        </article>
      </div>

      <div className="deployment-checklist-grid">
        {deploymentReadiness.checklist.map((item) => (
          <article
            className={`deployment-checklist-item deployment-checklist-item--${item.status}`}
            key={item.id}
          >
            <div>
              {item.status === "configured" ? (
                <CheckCircle2 size={16} />
              ) : (
                <CircleAlert size={16} />
              )}
              <strong>{item.label}</strong>
            </div>
            <p>{item.detail}</p>
            <span>{statusLabels[item.status]}</span>
          </article>
        ))}
      </div>

      <div className="deployment-routes">
        <div>
          <p className="eyebrow">Public Info Routes</p>
          <h3>Starter pages exist, final review still matters.</h3>
          <p>
            These pages are included so the platform behaves like a serious
            public product, but the copy stays marked for founder review until
            finalized.
          </p>
        </div>
        <div className="deployment-route-grid">
          {deploymentReadiness.legalRoutes.map((route) => (
            <a href={route} key={route}>
              <ExternalLink size={15} />
              {route}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
