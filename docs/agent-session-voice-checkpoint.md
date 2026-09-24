# Agent session and voice checkpoint

This branch extends the existing app. It is not launch-ready.

Implemented:
- Explicit agent selection persists through ordinary follow-ups.
- Specialist-to-specialist handoffs record both legs through Tay.
- Historical Tay Core messages retain Tay attribution.
- Browser speech recognition submits one spoken request through the existing composer handler.
- Read latest reply and stop-reading controls use browser speech synthesis.
- Microphone denial/unsupported browser fallback and cleanup are implemented.
- Agent handoff events are submitted through the existing Operating Graph client.

Limits and next work:
- Speech controls are single-request capture, not continuous phone-call conversation.
- Actual microphone permissions, audio output, and mobile rendering require device/browser verification.
- Tay Core remains rule-based. Dawn and Rory do not yet have model-generated responses.
- The registry is not authenticated tenant/user/agent memory isolation. Do not expose this as a child-safe product yet.
- Rory content filtering, parental access controls, scoped model context, and server-enforced action authority remain launch blockers.
- Human workforce approvals and AI staffing must be enforced server-side before external workforce actions are enabled.
- Graph persistence remains subject to the existing authentication/storage gates; event submission is not proof of storage.
- Model provider credentials, authenticated session persistence, and deployment still require integration and verification.
- Local git commits have not been confirmed on GitHub. A Mac checkout does not automatically contain these commits.
