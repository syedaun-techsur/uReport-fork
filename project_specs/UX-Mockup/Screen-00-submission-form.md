## Screen 00: Public Ticket Submission Form (SCR-01)

**Purpose:** Allow anonymous or authenticated citizens to submit a new service request.
**User Stories:** US-1.1, US-0.3, US-2.1, US-8.1
**Personas:** PER-01, PER-02
**Feature Refs:** F0, F1, F2, F8, F9

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [uReport Logo]    Report an Issue   [Sign In]               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Report a City Service Issue           ✓ No account needed │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Step 1 of 4: Choose a Category                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔍 Search categories...                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Roads & Sidewalks                                          │
│  ┌─────────────────┐ ┌─────────────────┐ ┌──────────────┐  │
│  │ 🛣️ Pothole /    │ │ 🚧 Street Sign  │ │ 🚶 Sidewalk  │  │
│  │ Pavement Damage │ │ Maintenance     │ │ Repair       │  │
│  └─────────────────┘ └─────────────────┘ └──────────────┘  │
│                                                             │
│  Sanitation                                                 │
│  ┌─────────────────┐ ┌─────────────────┐                   │
│  │ 🗑️ Missed       │ │ 🚮 Illegal      │                   │
│  │ Garbage Pickup  │ │ Dumping         │                   │
│  └─────────────────┘ └─────────────────┘                   │
│                                                             │
│  [Step indicator: ● ○ ○ ○]                                 │
├─────────────────────────────────────────────────────────────┤
│ [Footer: About | Privacy | Open311 API]                     │
└─────────────────────────────────────────────────────────────┘
```

**Step 2: Location**
```
┌─────────────────────────────────────────────────────────────┐
│  Step 2 of 4: Where is the issue?                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ [Map — interactive, zoomable]                        │  │
│  │                                                      │  │
│  │         📍 (draggable pin)                           │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│  📍 123 Main Street, City, ST 12345   [Adjust pin]         │
│                                                             │
│  OR enter address manually:                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 123 Main Street...                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  [Use my location 📡]    [< Back]    [Continue →]          │
└─────────────────────────────────────────────────────────────┘
```

**Step 3: Description & Photo**
```
┌─────────────────────────────────────────────────────────────┐
│  Step 3 of 4: Describe the issue                            │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Be specific: size, exact corner, nearest landmark    │  │
│  │                                                      │  │
│  │                                    0 / 4000 chars   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  [Custom field if category has customFields]                │
│  Estimated volume (e.g., 3 bags, 1 truckload):             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Attach a photo (optional — helps us locate the issue):     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 📷 Drag & drop or [Browse files]                    │  │
│  │ JPG, PNG, GIF, PDF, DOC up to 10 MB                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  [< Back]    [Continue →]                                   │
└─────────────────────────────────────────────────────────────┘
```

**Step 4: Review & Submit**
```
┌─────────────────────────────────────────────────────────────┐
│  Step 4 of 4: Review your report                            │
│                                                             │
│  Category:    Pothole / Pavement Damage        [Edit]       │
│  Location:    123 Main Street, City, ST        [Edit]       │
│  Description: Large pothole on corner of...    [Edit]       │
│  Photo:       pothole_photo.jpg                [Remove]     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  [Submit Report]                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  By submitting, you agree to the city's terms of service.  │
└─────────────────────────────────────────────────────────────┘
```

### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Category selection cards | Main content area, above fold |
| Primary | "No account needed" badge | Below headline, immediately visible |
| Primary | Location map + pin | Step 2 full-width |
| Primary | Submit button | Step 4, full-width, unmissable |
| Secondary | Step indicator | Below headline on all steps |
| Secondary | Category descriptions | Card subtitles |
| Secondary | Character count | Inline with text area |
| Tertiary | Terms of service | Below submit button, small text |
| Tertiary | Photo guidance | Label text on upload zone |

### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Default | Multi-step form, step 1 active | Step indicator at step 1 |
| Loading categories | Skeleton grid (6 placeholder cards with shimmer) | — |
| Category requires auth | Lock icon on card | "Sign in to report in this category" on hover |
| GPS locating | Map with pulsing dot | "Finding your location…" |
| GPS failed | Map with manual input highlighted | "Location unavailable. Please enter your address." |
| File uploading | Progress bar with filename | "Uploading [filename]…" |
| File error (size) | Red outline on upload zone | "File exceeds 10 MB limit." |
| File error (type) | Red outline on upload zone | "Accepted types: JPG, PNG, GIF, PDF, DOC, DOCX, TXT" |
| Submitting | Full-width progress indicator | "Sending your report…" |
| Submit success | Navigate to confirmation screen | — |
| Submit error | Red inline messages per field | Field-level validation messages |
| Network timeout (>5s) | Timeout message shown | "This is taking longer than expected. Still trying…" |

### Interactive Elements

| Element | Type | Behavior |
|---------|------|----------|
| Category cards | Selection grid | Click selects; second click on selected deselects; keyboard navigable |
| Category search | Text input | Live filter of visible cards |
| "Use my location" | Button | Triggers navigator.geolocation; drops pin; resolves address via reverse geocode |
| Map pin | Draggable marker | Drag updates lat/lon and re-resolves address |
| "Adjust pin" | Link | Switches map to drag mode |
| Photo upload | Drag & drop zone | Drag files over zone highlights it; drop validates and uploads |
| Step indicator | Progress dots | Clickable to navigate to completed steps; future steps not clickable |
| Back / Continue | Buttons | Validates current step before advancing |
