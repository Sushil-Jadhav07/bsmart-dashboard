# B-smart Admin CRM: Legal, Notifications and Settings, Google Stitch prompts

These match the redesigned pages (Marketplace, Help & Ticket, Promotions, Reports). Every field named below exists in the backend, so whatever Stitch produces can be built with real data.

How to use:
1. Open your existing B-smart Stitch project, or start a new **Web** project.
2. Paste the **Style block** together with your first screen.
3. Paste each later screen as its own prompt, starting with "Using the same style, sidebar and header:".
4. One screen per prompt. Modals are separate prompts so they render at full size.

---

## Style block (paste with the first screen)

```
Desktop web admin console "B-smart Admin CRM", 1440px wide. Premium, data-dense SaaS style matching an existing design system.

SHELL
- Left sidebar 260px, near-black plum #15101F. Brand row: pink rounded-square "B" logo tile, "B-smart" white bold, tiny "ADMIN CRM" caption. Compact nav with uppercase group labels (OVERVIEW, CONTENT, BUSINESS, MARKETPLACE, HELP & TICKET, PROMOTIONS, REPORTS, LEGAL, SYSTEM). Active item is a pill with a horizontal gradient #E8194E → #833AB4 and a soft pink glow. LEGAL has "Legal Docs" (scales icon). SYSTEM has "Notifications" (bell, pink count pill) and "Settings" (gear).
- Top bar 52px, white, hairline bottom border: search "Search the console…", bell with pink badge, admin avatar + name + "Super Admin".
- Content background #F6F7FB, 24px padding.

TYPE
- Montserrat for headings and numbers, Inter for body.
- Eyebrow above every page title: 10.5px bold uppercase, wide tracking, two parts separated by a dot, e.g. "LEGAL · COMPLIANCE CENTER". First part pink #E8194E, second part grey. Optional tiny live pill after it (pulsing dot).
- Page title 24px bold #111827, description 13px #6B7280, max two lines.

COLOUR
- Brand pink #E8194E, deep pink #C81345, purple #8E35B5. Gradient buttons go #E8194E → #8E35B5.
- Lavender fills for inputs, tiles and chips: #EEF0FA, #F1F3FC, #E9EBFA. Table header row #F7F8FD.
- Status pills: rounded-full, soft background, bold 11px text, 6px dot. Emerald = published/read/active, amber = draft/pending, rose = critical/failed, indigo = in progress, grey = archived.

COMPONENTS
- Stat card: white, 16px radius, hairline border, 20px padding. Uppercase 10.5px label top-left, 36px tinted icon tile top-right, 28px extra-bold number, then a footer line with a small coloured chip ("+12.4%", "3 drafts") and grey text. A faint tinted circle peeks from the bottom-right corner. On hover: lifts 4px, pink border, pink glow.
- Pill tabs above tables: rounded-full chips with a count bubble; active chip is dark navy #1F2340 or the pink→purple gradient.
- Toolbar: lavender search field with magnifier, compact lavender dropdowns that read "Label: Value ▾", square refresh button.
- Tables: white card, 16px radius, rows 12px padding, hairline dividers, row hover tint #FDF2F6, checkbox column, "⋮" menu column. Footer: "Showing 1-10 of 128 · Rows per page: 10", page numbers with the active page as a pink filled square.
- Detail pages: breadcrumb "← Back to X / Section / Item" (first part pink, bold), title row with pills, action buttons on the right (white outline buttons + one gradient primary), 4 fact cards, then a two-column layout: main column + 330px sticky right column of cards.
- Modals: white, 24px radius, a 6px pink→purple gradient strip on top, title with icon, grey subtitle, lavender inputs with uppercase 10.5px labels, footer with "Cancel" outline + gradient primary.
- Dropdowns are custom menus (rounded white card, shadow, coloured dot per option, check mark on the selected item, optional grey hint line under each option), never native selects.
```

---

## LEGAL

### Screen L1: Legal Documents (list)

```
Using the same style, sidebar and header. Sidebar item "Legal Docs" is active.

Header: eyebrow "LEGAL · COMPLIANCE CENTER" with a live pill "4 published". Title "Legal Documents & Policies". Description "Terms, privacy, refund and custom policy pages shown inside the B-smart member and vendor apps. Every save creates a new version."
Right buttons: outline "Export Index (CSV)", outline "Preview in App" (phone icon), gradient "+ New Legal Document".

4 stat cards:
1. "PUBLISHED DOCUMENTS" 4, chip "of 6 total", "live in the apps".
2. "DRAFTS" 2, amber chip "Needs review", "not visible to users".
3. "LAST UPDATED" "3 days ago", chip "v7 · Privacy Policy", "by Asha Menon".
4. "AUDIENCE COVERAGE" "5 / 4", purple chip "Members / Vendors", "documents each app shows".

Pill tabs: All Documents (6), Published (4), Drafts (2), Members (5), Vendors (4).

Toolbar: search "Search by title or type slug…", dropdown "Audience: All", dropdown "Sort: Recently updated", refresh.

Body: a 3-column grid of document cards (not a table). Each card:
- A 4px coloured top bar (blue for Terms, violet for Privacy, emerald for Refund, orange/cyan for custom).
- A 44px tinted icon tile (file-text, shield, refresh-cw, file icon), the title in 15px bold ("Terms & Conditions") and the slug in mono grey ("terms").
- A row of pills: "Published · Live" (emerald) or "Draft" (amber); audience pill "Members & Vendors" / "Members only" / "Vendors only".
- A 2-line grey excerpt of the document text.
- A footer with three mini stats separated by dots: "v7", "1,240 words", "Updated 24 Oct 2026 by Asha Menon".
- Buttons: lavender "Edit content" (pencil), small outline "Publish" or "Unpublish" toggle, and a "⋮" menu (Rename & audience, View history, Copy public link, Delete).
- Hover: card lifts, pink border.
Include one draft card with an amber dashed border and the line "Unpublished changes, last saved 2h ago".

Footer note under the grid: "Showing 6 documents · Users see only published documents for their app."
```

### Screen L2: New Legal Document (modal)

```
Using the same style. Show the Legal Documents page dimmed behind a centred modal, 560px wide.

Modal title "New Legal Document" with a scales icon. Subtitle "Create a custom policy page. You can write the content after creating it."
Fields:
- DOCUMENT TITLE (required), placeholder "Cookie Policy".
- TYPE SLUG (required), placeholder "cookies", mono text. Helper: "Lowercase letters, numbers, - or _. Used in the app URL: /legal/cookies. Can't be changed later." Show a live preview chip "bsmart.app/legal/cookies".
- AUDIENCE: a 3-way segmented control "Everyone" | "Members" | "Vendors", with "Everyone" selected (white tile, pink text).
- STARTING STATUS: a toggle row "Save as draft" with the description "Drafts stay hidden until you publish."
- A soft lavender suggestion strip: "Common types: shipping · disclaimer · community-guidelines · cookies", each a clickable chip.
Footer: outline "Cancel", gradient "Create & open editor".
Show an inline error under the slug field in one variant: "A document with this slug already exists."
```

### Screen L3: Policy Editor

```
Using the same style. Full editor screen for one document.

Breadcrumb: "← Legal Documents / Legal / Privacy Policy".
Title row: "Privacy Policy" (24px), pills "Published · v7" (emerald) and "Members & Vendors" (lavender). Below it a grey line "Last saved 24 Oct 2026, 4:12 PM by Asha Menon".
Right buttons: outline "Preview" (eye), outline "Save draft", gradient "Publish v8". Show an amber chip "Unsaved changes" next to the buttons.

Main column (white card):
- A sticky formatting toolbar inside a lavender rounded bar with icon buttons grouped by thin dividers: Undo, Redo | Paragraph, H1, H2, H3 | Bold, Italic, Underline, Strikethrough | Align left, centre, right | Bullet list, Numbered list, Quote | Link, Clear formatting. Active buttons get a white tile with pink icon.
- A document canvas, 720px reading width, generous line height, showing realistic privacy policy headings ("1. Information we collect", "2. How we use your data", "3. Bcoins and payments", "4. Your rights") with paragraphs and a bullet list.
- A footer strip under the canvas: "1,240 words · 6 min read · Autosaved locally".

Right column (330px, sticky), with tabs "Details" | "History" (Details selected):
- "Document Info" card: rows Type slug (mono "privacy"), Audience, Status, Version "v7", Words, Created, Last saved, Edited by (avatar + name).
- "Audience & visibility" card: the 3-way Everyone/Members/Vendors control and a "Published" toggle, with "Save settings" button.
- "Public link" card: mono URL with copy button, and the note "Only published versions are visible in the app."
- "Danger zone" card with a rose outline "Delete document" button.
```

### Screen L4: Version History & Compare

```
Using the same style. Policy Editor with the right-column "History" tab selected, and the main column switched to a compare view.

Right column "Version History" card: a vertical timeline of versions, newest first. Each item: version badge ("v7", "v6"…), status pill (Published / Draft), saved date and time, saved-by avatar and name, word count change ("+84 words" green, "−12 words" rose). The selected version (v5) is highlighted with a pink ring. Each item has a "Compare" link and a "Restore" link.

Main column: a white card titled "Comparing v5 → v7 (current)" with a segmented control "Side by side" | "Inline". Side-by-side: left column v5, right column v7, with removed text highlighted in soft rose with strikethrough and added text highlighted in soft emerald. Above it a summary strip: "3 sections changed · +96 words · −12 words".
Bottom bar: outline "Close compare", gradient "Restore v5 as new draft". A small grey note: "Restoring creates v8 as a draft. Nothing changes in the app until you publish."
```

### Screen L5: In-app Preview (modal)

```
Using the same style. A modal showing how the document appears in the B-smart mobile app: a 390px phone frame with a dark navy bezel, centred on a dimmed page.

Inside the phone: app header "← Privacy Policy", a small grey "Last updated 24 Oct 2026" line, then the formatted document text. Above the phone, a segmented control "As a member" | "As a vendor". Next to the phone, a small side panel listing the documents that audience can see (Terms & Conditions, Privacy Policy, Refund Policy), each with a published dot. Draft documents appear greyed with "Hidden: draft".
```

---

## SYSTEM: Notifications

### Screen N1: Notification Center

```
Using the same style. Sidebar item "Notifications" is active (bell with pink "12" count).

Header: eyebrow "SYSTEM · ALERT INBOX" with a live pill "Real-time". Title "Notification Center". Description "Everything that needs an admin's attention: orders, refunds, reports, support tickets, vendor and ad reviews, and Vault activity."
Right buttons: outline "Export (CSV)", gradient "Mark all as read".

4 stat cards:
1. "UNREAD" 12, rose chip "3 critical", "need attention".
2. "TODAY" 48, chip "+18% vs yesterday".
3. "ACTION REQUIRED" 7, amber chip "Refunds & reviews", "link to a page with a pending action".
4. "READ RATE" 86.4%, emerald chip "1,240 read", "of all notifications".

Pill tabs with counts: All (1,436), Unread (12), Orders & Refunds (320), Reports & Safety (58), Support (96), Vendors & Ads (44), Vault & Coins (210), Social (708).

Toolbar: search "Search message or sender…", dropdown "Type: All", dropdown "Status: All", dropdown "Date: Last 7 days", refresh.

Body: a white card with notifications grouped by day headers ("Today", "Yesterday", "Earlier this week"), each header with a small count. Each row:
- Left: a 36px round tinted icon tile per type (receipt for order, alert-triangle rose for refund failed, flag for content report, life-buoy for support query, store for vendor approved/rejected, megaphone for ad, coins for Bcoins credited/debited, heart/message for social).
- Middle: bold title from the type ("Refund failed", "New content report", "Support reply"), the message text in grey ("Order ORD-1759403221-4821: Razorpay refund failed, manual refund needed"), and a meta line: sender avatar + "@aarav_sharma" · "12 min ago".
- Right: type pill, an unread pink dot, and on hover the actions "Open" (arrow), "Mark read" (check), "Delete" (trash).
- Unread rows have a faint pink background and a 3px pink left border. Critical types (refund failed, payment failed) have a rose left border instead.
Row checkboxes, with a selection bar "4 selected · Mark read · Delete".
Footer: pagination "Showing 1-20 of 1,436".
```

### Screen N2: Header Notification Dropdown

```
Using the same style. Any dashboard page with the header bell clicked open: a 380px white dropdown card (16px radius, large shadow) anchored under the bell.

Dropdown header: "Notifications" bold, a pink "12 new" pill, and a "Mark all read" text button.
Two compact tabs: "Unread" | "All".
List of 6 compact rows: round type icon, bold title, one-line grey message, relative time, pink unread dot. One critical row tinted rose: "Refund failed · ORD-…4821".
Footer: a full-width lavender button "Open Notification Center →".
Also show the empty state variant: a soft bell illustration, "You're all caught up", "New alerts will appear here."
```

---

## SYSTEM: Settings

These screens use only what the backend supports for the signed-in admin:
- **Profile** (`/settings/account`): avatar upload, full name, username, bio, location; contact email, phone and profession, with email and phone verification by 6-digit code.
- **Security** (`/auth`): change password, active sessions with revoke, sign out all other devices, and the last 50 sign-in attempts.

Console Preferences are the only part saved in the browser rather than the backend, and S4 says so on screen.

### Screen S1: Settings, Profile

```
Using the same style. Sidebar item "Settings" is active.

Header: eyebrow "SYSTEM · ADMIN SETTINGS". Title "Account Settings". Description "Your admin profile, contact details, security and console preferences."
Right of the title: a small white pill "Signed in as Super Admin" with a green dot.

LAYOUT: two columns.
Left column (260px, sticky):
- A profile summary card: 72px avatar with a pink→purple gradient ring and a small camera badge, name "Asha Menon" (16px bold), "@asha_admin" in pink, role pill "Super Admin", and a grey line "Member since Jan 2025".
- Under it a vertical tab card with icon + label + short grey hint per item:
  "Profile" (user icon, "Name, photo and bio") — active, gradient pill,
  "Contact & Verification" (mail icon, "Email and phone"),
  "Security" (shield icon, "Password and devices"),
  "Console Preferences" (sliders icon, "This browser only").
Right column: stacked white cards for the active tab.

PROFILE TAB, cards:
1. "Profile photo": large 96px avatar on the left. Right: "Upload new photo" gradient button, "Remove" grey text button, helper "JPG, PNG, WebP or GIF". Show a drag-and-drop dashed lavender zone variant: "Drop an image here or browse".
2. "Personal details" (2-column grid of lavender fields with uppercase 10.5px labels):
   FULL NAME ("Asha Menon"),
   USERNAME (with "@" prefix inside the field, live check line under it: green "✓ Available" or rose "Already taken", helper "Saved in lowercase. Must be unique."),
   LOCATION ("Mumbai, India", map-pin icon),
   WEBSITE ("https://…", link icon),
   BIO (full-width textarea, "0 / 150" counter).
   Card footer: grey "Last updated 3 days ago", outline "Discard", gradient "Save changes" (disabled until something changes). Show an amber "Unsaved changes" chip in the card header.
```

### Screen S2: Settings, Contact & Verification

```
Using the same style. Settings page with the "Contact & Verification" tab active.

Cards:
1. "Email address": a row with mail icon tile, "asha@bsmart.app", and an emerald pill "✓ Verified". Button "Change email" opens an inline edit field with "Save". Note under it: "Changing your email resets verification. We'll send a 6-digit code to the new address."
2. "Mobile number": phone icon tile, "+91 98765 43210", an amber pill "Not verified", and a gradient "Verify now" button.
   Show the verification state inline beneath: "Enter the 6-digit code sent to +91 98765 43210", six separate 44px square OTP boxes (lavender, the active one with a pink ring), a "Verify" gradient button, a countdown "Resend code in 0:42", and helper "The code expires in 10 minutes."
3. "Profession" (optional): a single field "Operations Lead".
Show one error variant on the phone card: rose text "This number is already registered to another account."
```

### Screen S3: Settings, Security

```
Using the same style. Settings page with the "Security" tab active.

Top: a security summary strip of 3 small stat tiles in one card:
- "Active sessions" 3, chip "1 this device".
- "Sign-ins (30 days)" 42, chip "2 failed" in rose.
- "Last sign-in" "Today, 9:41 AM", grey "Chrome on Windows · Mumbai".

Cards:
1. "Change password": CURRENT PASSWORD, NEW PASSWORD, CONFIRM NEW PASSWORD, lavender fields with eye toggles. Under NEW PASSWORD a 4-segment strength meter (label "Strong" in emerald) and a checklist with green checks: "At least 6 characters", "Mix of letters and numbers", "Matches confirmation". Gradient "Update password" button bottom-right. Success toast variant: "Password changed".
2. "Where you're signed in": a list of session rows. Each row: device icon tile (monitor for web, smartphone for mobile), device name "Chrome on Windows", grey meta "Mumbai, India · 103.21.xx.xx · Active 2 min ago", and on the right either an emerald pill "This device" or an outline rose "Sign out" button. Card header action: outline rose "Sign out all other devices". Confirmation modal variant: "Sign out 2 other devices? They'll need to sign in again."
3. "Sign-in history": a compact table (last 50 attempts): Date & time, Device, Location, IP (mono, partly masked), Status pill ("Success" emerald / "Failed" rose). Failed rows have a faint rose background. Filter chips above: All, Successful, Failed. Footer "Showing 10 of 50 · View more".
```

### Screen S4: Settings, Console Preferences

```
Using the same style. Settings page with the "Console Preferences" tab active.

A soft lavender banner at the top: info icon, "These preferences are saved in this browser only. They don't sync to other devices."

Cards:
1. "Tables & lists": "Default rows per page" custom dropdown (10 / 25 / 50), "Compact rows" toggle with a tiny before/after row preview, "Show row hover highlight" toggle.
2. "Start page": "Open this page after sign-in" custom dropdown with icons (Dashboard, Content Reports, Marketplace Orders, Customer Queries, Bug Reports).
3. "Formats": "Date & time" dropdown with live preview ("24 Oct 2026, 4:12 PM" / "24/10/2026 16:12"), "Number style" dropdown with preview ("₹1,42,800 Indian" / "₹142,800 International").
4. "Alerts in this browser": "Play a sound for new notifications" toggle, "Show a desktop notification" toggle with a small "Allow in browser" link.
Each card footer: "Reset" text button and gradient "Save". A small emerald toast variant: "Preferences saved on this device".
```

---

## Shared states (optional prompts)

- "Using the same style: empty state for Legal Documents. A soft lavender scales illustration, 'No legal documents yet', 'Start with Terms & Conditions, a Privacy Policy and a Refund Policy.', and three quick-create chips plus the gradient '+ New Legal Document' button."
- "Using the same style: the Policy Editor's 'Leave without saving?' confirm modal, with 'Discard changes' rose outline and 'Keep editing' gradient."
- "Using the same style: Notification Center loading skeleton (grey shimmer rows with round icon placeholders) and the error state 'Couldn't load notifications' with a 'Try again' button."
