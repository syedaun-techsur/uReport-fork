## Screen 01: Ticket Submission Confirmation (SCR-02)

**Purpose:** Confirm successful ticket submission and give citizen a copyable reference token.
**User Stories:** US-1.1, US-0.3, US-0.6
**Personas:** PER-01, PER-02
**Feature Refs:** F0, F1

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [uReport Logo]    Report an Issue   [Sign In]               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              ✅ Report Received!                            │
│                                                             │
│  Your report has been submitted to the city.                │
│  You'll receive a response within 5 business days.          │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Reference Number                                    │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  #84721                                        │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │                                                      │  │
│  │  Tracking Token                                      │  │
│  │  ┌───────────────────────────────┐  [📋 Copy]       │  │
│  │  │ a7f3-9c21-4b8e-...           │                   │  │
│  │  └───────────────────────────────┘                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Save your reference number — you can use it to check the  │
│  status of your report at any time.                        │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 📧 Send confirmation to email (optional)             │  │
│  │ ┌──────────────────────────────────────────────────┐ │  │
│  │ │ your@email.com                                   │ │  │
│  │ └──────────────────────────────────────────────────┘ │  │
│  │ [Send Confirmation Email]                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  [Check Status with Token]   [Report Another Issue]         │
│                                                             │
│  What happens next?                                         │
│  • Your report is assigned to the Public Works department   │
│  • A case worker will review it within 2 business days      │
│  • You'll receive an email if you provided one              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ [Footer]                                                    │
└─────────────────────────────────────────────────────────────┘
```

### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Success checkmark + headline | Hero area, immediately visible |
| Primary | Ticket ID (reference number) | Prominent box, large text |
| Primary | Copy-to-clipboard token button | Inline with token |
| Secondary | Email confirmation input | Below token box |
| Secondary | "What happens next?" timeline | Below primary actions |
| Tertiary | "Report Another Issue" link | Secondary CTA |

### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Default | Full confirmation page | ✅ green success icon |
| Email sent | Input replaced with "✅ Email sent to [address]" | Success message |
| Email error | Inline error below input | "Could not send email. Please note your token manually." |
| Copy success | "Copy" button briefly shows "✅ Copied!" | 2-second feedback |

### Interactive Elements

| Element | Type | Behavior |
|---------|------|----------|
| Token copy button | Icon button | Copies token to clipboard; visual feedback 2s |
| Email input | Optional text input + submit | Sends one-time confirmation email |
| "Check Status with Token" | Link | Navigates to token lookup page |
| "Report Another Issue" | Link | Navigates back to submission form |
