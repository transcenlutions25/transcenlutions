import type {
  ActionResult,
  ApprovalDecision,
  SessionLogEntry,
  SuggestedAction,
  TayResponse,
} from "./types";
import { analyzeBuyerReply } from "./buyer-replies";
import { createOfferDeliveryArtifact } from "./artifacts";
import { findDeliveryKitForOffer } from "./delivery";
import { createFounderFocusResult } from "./founder-os";
import { findRevenueOfferForRequest, getOfferPaymentState } from "./revenue";
import { findSalesKitForOffer } from "./sales";

export function executeSuggestedAction(response: TayResponse): ActionResult {
  const { action, intent } = response;

  if (action.permissionStatus === "blocked") {
    return {
      status: "failed",
      result: "Tay stopped this request for safety.",
      nextStep: response.nextStep,
    };
  }

  if (action.permissionStatus === "requires_approval") {
    return {
      status: "failed",
      result: "Tay paused this request because it needs approval first.",
      nextStep: response.nextStep,
    };
  }

  if (action.type === "create_task") {
    return {
      status: "completed",
      result:
        "Task created: define the passive-income outcome, name the business asset, and confirm the request reaches a visible result.",
      nextStep:
        "Next step: choose the smallest business asset Tay should structure next: offer, workflow, content engine, or operating task.",
    };
  }

  if (action.type === "prepare_offer") {
    return createRevenueOfferResult(response);
  }

  if (action.type === "recommend_follow_up") {
    return createBuyerReplyResult(response);
  }

  if (action.type === "route_focus") {
    return createFounderFocusResult(response.userText);
  }

  if (action.type === "draft_plan") {
    return {
      status: "completed",
      result:
        "Plan drafted: define the income goal, identify the asset, list the next action, confirm boundaries, then execute one visible step.",
      nextStep: "Next step: choose the first plan item to turn into a business task.",
    };
  }

  if (action.type === "log_note") {
    return {
      status: "completed",
      result: "Note saved in the current activity record.",
      nextStep: "Next step: add another note, plan, or passive-income build request.",
    };
  }

  return {
    status: "failed",
    result: `No executable action exists for ${intent}.`,
    nextStep: response.nextStep,
  };
}

export function resolveApproval(
  response: TayResponse,
  decision: ApprovalDecision,
): ActionResult {
  if (response.action.permissionStatus !== "requires_approval") {
    return executeSuggestedAction(response);
  }

  if (decision === "declined") {
    return {
      status: "failed",
      result:
        "Approval declined. Tay stopped the move, kept the boundary visible, and made no outside change.",
      nextStep:
        "Next step: choose a safer local task, plan, note, or revenue handoff Tay can prepare inside this workspace.",
    };
  }

  if (response.action.type === "prepare_offer") {
    return createApprovedRevenueHandoffResult(response);
  }

  if (response.action.type === "create_task") {
    return {
      status: "completed",
      result:
        "Approval recorded. Tay prepared a controlled automation handoff and did not call any outside service from this screen.",
      nextStep:
        "Next step: connect the approved service later, or convert the request into a local task Tay can run now.",
    };
  }

  return {
    status: "completed",
    result:
      "Approval recorded. Tay converted the risky move into a visible local handoff.",
    nextStep:
      "Next step: review the handoff, then choose the smallest safe move Tay should execute next.",
  };
}

function createBuyerReplyResult(response: TayResponse): ActionResult {
  const guidance = analyzeBuyerReply(response.userText);

  return {
    status: guidance.outcome === "stop" ? "failed" : "completed",
    result: `Buyer reply routed: ${guidance.title}. ${guidance.summary} Suggested response: "${guidance.suggestedResponse}"`,
    nextStep: guidance.nextStep,
  };
}

function createRevenueOfferResult(response: TayResponse): ActionResult {
  const offer = findRevenueOfferForRequest(response.userText);
  const deliveryKit = findDeliveryKitForOffer(offer.id);
  const paymentState = getOfferPaymentState(offer);
  const salesKit = findSalesKitForOffer(offer.id);
  const artifact = createOfferDeliveryArtifact(
    offer,
    deliveryKit,
    salesKit,
    paymentState,
  );

  return {
    status: "completed",
    result: `Revenue offer prepared: ${offer.name} (${offer.price}). ${offer.outcome} Outreach kit: ${salesKit.title}. Delivery kit: ${deliveryKit.title}. Payment path: ${paymentState.title.toLowerCase()}.`,
    nextStep:
      paymentState.mode === "setup_required"
        ? `Next step: qualify one buyer using ${salesKit.title}, then add ${offer.paymentLinkEnvKey} or NEXT_PUBLIC_TRANSCENLUTIONS_BILLING_EMAIL before requesting payment.`
        : `Next step: send the outreach message to one real buyer, use ${paymentState.mode === "checkout" ? "the approved checkout link" : "the invoice email draft"} only after fit is clear, then deliver ${deliveryKit.artifacts[0]}.`,
    artifact,
  };
}

function createApprovedRevenueHandoffResult(response: TayResponse): ActionResult {
  const offer = findRevenueOfferForRequest(response.userText);
  const paymentState = getOfferPaymentState(offer);

  if (paymentState.mode === "test_simulated") {
    return {
      status: "completed",
      result: `Approval recorded for test mode. ${offer.name} payment handoff is simulated only; Tay did not open checkout and no money was collected.`,
      nextStep:
        "Next step: complete the setup checklist before sending any live checkout or invoice handoff to a buyer.",
      handoff: {
        title: paymentState.title,
        description: paymentState.description,
        href: "",
        label: paymentState.label,
        external: false,
        simulated: true,
      },
    };
  }

  if (paymentState.mode === "setup_required") {
    return {
      status: "failed",
      result: `Approval recorded, but ${offer.name} cannot accept payment yet because no approved checkout link or invoice email is configured.`,
      nextStep: `Next step: set ${offer.paymentLinkEnvKey} to a real Stripe Payment Link, or set NEXT_PUBLIC_TRANSCENLUTIONS_BILLING_EMAIL for invoice handoff.`,
    };
  }

  return {
    status: "completed",
    result: `Approval recorded. ${offer.name} is ready for a real buyer through ${paymentState.mode === "checkout" ? "an approved Stripe checkout link" : "a manual invoice email draft"}. Tay did not collect card data inside the app.`,
    nextStep: `Next step: send the ${offer.price} offer to one buyer and log the response in Tay.`,
    handoff: {
      title: paymentState.title,
      description: paymentState.description,
      href: paymentState.href,
      label: paymentState.label,
      external: paymentState.external,
      simulated: false,
    },
  };
}

export function createSessionLogEntry(
  response: TayResponse,
  detail: string,
  status?: SessionLogEntry["status"],
): SessionLogEntry {
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${response.intent}`,
    timestamp: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    intent: response.intent,
    actionType: response.action.type,
    permissionStatus: response.action.permissionStatus,
    governanceRuleId: response.action.governance.ruleId,
    riskTier: response.action.governance.riskTier,
    riskScore: response.action.governance.riskScore,
    auditStatus: response.action.governance.auditStatus,
    status: status ?? getLogStatus(response.action),
    detail,
  };
}

function getLogStatus(action: SuggestedAction): SessionLogEntry["status"] {
  if (action.permissionStatus === "blocked") return "blocked";
  if (action.permissionStatus === "requires_approval") {
    return "approval_required";
  }
  if (action.type === "none") {
    return action.permissionStatus === "allowed"
      ? "needs_clarification"
      : "unsupported";
  }
  return "executed";
}
