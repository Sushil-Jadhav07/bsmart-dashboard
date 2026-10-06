# B-smart Admin CRM: all pages, Google Stitch prompts

Companion to `marketplace-admin-stitch-prompts.md`, which covers the Marketplace section (Influencers, Products, Services, Orders, and the order notifications).

How to use:
1. In Google Stitch, start a new **Web** project.
2. Paste the **Design System** block and **Screen 1 (Login)** together as your first prompt. If you start with the Dashboard instead, paste it with Screen 2.
3. Paste every later screen as a new prompt in the same project, starting with "Using the same design system, sidebar and header:".
4. One screen per prompt. List and detail screens are separate prompts on purpose.

---

## Design System (paste with your first screen)

```
Design a desktop web admin dashboard called "B-smart Admin CRM" for a social media and commerce app. The app has posts ("Moments"), short videos ("bSparks"), text posts ("Buzz"), promoted reels ("Campaigns"), ads ("Spotlights"), vendors, a coin wallet ("Vault"), gift cards and an influencer marketplace. 1440px wide desktop layout. Clean, premium, data-dense SaaS style.

LAYOUT
- Fixed left sidebar, 260px wide, near-black plum background #15101F, with no visible border.
- Sidebar top: a compact brand row with 16px padding. On the left, a 36px rounded-square logo tile in hot pink #E8194E (fading slightly to purple at the bottom) holding a bold white "B" lettermark. Next to it, "B-smart" in 16px bold white, with a tiny uppercase caption "ADMIN CRM" (9px bold, letter-spaced, muted lavender-grey, about 40% white) under it.
- Navigation is a compact, tightly spaced vertical list with 12px horizontal padding.
  - Group labels: tiny uppercase text (9–10px bold, wide letter-spacing, muted grey about 35% white), with 14px of space above each group and 4px below.
  - Nav items: about 28px tall, 12px left padding, a 16px thin outline icon (1.5px stroke) and a 13px medium label, both soft white at about 75% opacity. No background on inactive items; on hover, a faint 6% white background.
  - Active item: a full-width pill with an 8px radius and a horizontal gradient from hot pink #E8194E on the left to purple #833AB4 on the right. White semibold text and white icon, with a soft pink glow spreading out from the left edge of the pill.
- Nav items and icons, in order:
  OVERVIEW: Dashboard (2x2 layout-grid icon)
  CONTENT: Moments (sparkles), bSparks (lightning bolt), Buzz (megaphone), Campaigns (at-sign / swirl), Spotlights (star)
  BUSINESS: Users (two people), Vendors (storefront), Packages (archive box), Sales (bar chart), Vault (padlock)
  MARKETPLACE: Influencers (ID badge with a person), Products (shopping bag), Services (crossed hammer and wrench), Orders (receipt / list clipboard)
  HELP & TICKET: Inquiry (question-mark circle), Customer Queries (two chat bubbles), FAQ (notebook with a question mark)
  PROMOTIONS: Gift Cards (gift box), Gift Card Orders (ticket)
  REPORTS: Bug Reports (bug), Content Reports (flag)
  LEGAL: Legal Docs (scales)
  SYSTEM: Notifications (bell, with a small pink count pill "3" on the right), Settings (gear)
- Sidebar bottom: a "Need help?" card (subtle 8% white gradient, small gradient lifebuoy icon tile, "Open Support" button), then a "Sign out" row with a log-out icon, in the same compact item style.
- Top header bar: 68px tall, white, hairline bottom border, spanning the content area. Left: a search input "Search the console…" with a magnifier icon and a light grey fill. Right: a "Support" text button, a bell icon button with a small pink unread badge (opens a 360px notifications dropdown titled "Notifications"), and the admin avatar with name and role "Admin".
- Main content area: light grey background #F9FAFB, 24px padding, content max width 1280px.

TYPOGRAPHY
- Font: Montserrat (fallback Inter).
- Page eyebrow: 11px bold uppercase, wide letter-spacing, brand pink #E8194E.
- Page title: 20px bold, #111827. Page description: 14px, #6B7280.
- Table headers: 11px semibold uppercase, #6B7280, with a tiny sort-arrow icon.
- Body: 14px, #374151. Secondary text: 12px, #6B7280.

COLOURS
- Brand primary: #E8194E (pink). Secondary: #833AB4 (purple). Brand gradient: 135deg #E8194E to #833AB4.
- Neutrals: #F9FAFB, #F3F4F6, #E5E7EB, #9CA3AF, #6B7280, #374151, #111827.
- Chart colours: pink #E8194E, purple #833AB4, blue #3B82F6, green #10B981, orange #F97316, cyan #06B6D4.
- Status pill tones (soft background, 1px border, coloured text, 6px radius, 12px medium text, optional 6px dot):
  emerald (active / approved / validated / completed / resolved / published), rose (rejected / suspended / failed / deleted / critical), violet (draft / in progress), magenta-pink (pending / processing / new), amber (medium priority / waiting), neutral grey (inactive / closed).

COMPONENTS
- Stat cards: white, 1px #E5E7EB border, 12px radius, 16px padding. A 36px rounded-square tinted icon tile on the left, an 18px bold number, and an 11px grey label under it. Usually 4 in a row.
- Data table card: white, 1px border, 12px radius.
  - Toolbar: a search input with a magnifier icon (36px tall, #F9FAFB fill, 8px radius, full width), then compact filter dropdowns on the right (36px tall, 12px medium text, chevron).
  - Rows: 12px vertical padding, hairline dividers, light hover tint.
  - Last column: a "⋯" row-action button that opens a small white menu (icon + label). Destructive items are red.
  - Footer: "1–10 of 248" on the left; prev/next square buttons and "1 / 25" on the right.
- Detail pages:
  - A "‹ Back to …" grey text link at the top left, with action buttons at the top right.
  - Two columns: a flexible main column and a 360px sticky right column.
  - Cards are white with 24px radius, a 1px border and a soft shadow. Each has a header row (14px semibold title) and a hairline divider.
  - Info tiles: #F9FAFB fill, 1px #F3F4F6 border, 12px radius. A 10px bold uppercase grey label sits above a 14px value.
- Buttons:
  - Primary: brand gradient, white text, 8px radius.
  - Outline: white with a grey border.
  - Danger: solid red #EF4444.
  - Ghost: text only.
- Form fields: 36–44px tall, #F9FAFB fill, 1px #E5E7EB border, 8–12px radius, pink focus ring. Labels are 12px bold uppercase grey above the field.
- Modals: centred, 16px radius white panel over a dark blurred backdrop. Header has a title, subtitle and a close X. The footer bar is light grey with right-aligned buttons.
- Delete confirmation modal: a red circle with a warning-triangle icon, the text "This action cannot be undone.", and "Cancel" plus red "Delete" buttons.
- Toasts: bottom-right, emerald (success) or red (error) tint.
- Avatars: circular photos, with a gradient circle showing the initial as the fallback.
- Use Indian names, ₹ for money, and "coins" / "Bcoins" for the in-app currency.
```

---

## AUTH

### Screen 1: Login

```
Screen: admin login page. No sidebar.

Split layout:
- Left half: a full-height panel with the pink-to-purple brand gradient. It shows the B-smart logo, a large white headline "Run B-smart from one console", a short white 80%-opacity subline about managing content, vendors and campaigns, and soft abstract glowing shapes.
- Right half: a white, centred login card, 400px wide.

The card contains:
- The logo.
- "Welcome back" (24px bold), with "Sign in to your admin console" (grey) under it.
- An "EMAIL ADDRESS" field, placeholder "name@company.com".
- A "PASSWORD" field, placeholder "••••••••", with an eye toggle icon.
- A row with a "Remember me" checkbox.
- A full-width gradient "Sign in" button, 44px tall.

Also show a small red inline error state under the form: "Invalid email or password".
```

---

## OVERVIEW

### Screen 2: Dashboard

```
Screen: the main admin Dashboard. The sidebar item "Dashboard" is active.

Header row: eyebrow "ADMIN DASHBOARD", title "Dashboard" (20px bold), a small green "Live" pill with a pulsing dot, and on the right an outline "Download Report" button with a trending-up icon.

Row 1: 8 KPI cards in a 4×2 grid. Each card is white with a 12px radius and has:
- An icon tile, a small grey title, and a big bold number.
- A grey caption.
- A thin progress meter bar at the bottom (gradient fill).
- A small arrow, because the card is clickable.

The cards:
1. Total Users, 24.8K, "Members, vendors, sales and admins"
2. Total Vendors, 1.2K, "864 validated profiles"
3. Moments + bSparks, 182K, "120,442 moments, 61,903 bSparks"
4. Buzz, 96.4K, "Text posts and replies feed"
5. Spotlights, 3.4K, "412 active, 58 pending"
6. Vault Volume, 8.2M, "12,904 vault transactions"
7. Packages, 12, "640 purchase records"
8. Sales Officers, 34, "Assignment team capacity"

Row 2 (about 60/40 split):
- Card "Growth Momentum", subtitle "Last 14 days across registrations, content, buzz and spotlights". A combo chart: orange bars for Spotlights, plus smooth lines for Users (pink), Moments/bSparks (green) and Buzz (blue). Light dashed grid, small grey axis labels.
- Card "Operating Queues", subtitle "Moderation, campaign and vendor readiness". Four status rows, each with a label, a value and a thin progress bar: "Active ads", "Pending ads", "Validated vendors", "Sales coverage". Under them, two small grey tiles: a clock icon with "58" and "Spotlights waiting", and a check icon with "412" and "Spotlights live".

Row 3 (2/3 + 1/3):
- Card "Content Mix", subtitle "Monthly split for moments, bSparks, buzz and spotlights". A stacked monthly bar chart in pink, purple, blue and orange.
- Card "Ad Status", subtitle "Campaign pipeline by state". A donut chart with a legend list underneath (coloured dot, name, count): Active, Pending, Paused, Rejected.

Row 4 (45/55):
- Card "Engagement Quality", subtitle "Likes, comments, views and campaign clicks". A combo chart: cyan Views bars, plus Likes (pink), Comments (purple) and Clicks (orange) lines.
- Card "Recent Platform Content", subtitle "Newest posts, reels, tweets and ad campaigns", with a bar-chart icon at the top right. A compact bordered table with columns CONTENT (thumbnail + caption + type), OWNER, ENG. (engagement number) and STATUS (pill). 6 rows.
```

---

## CONTENT

### Screen 3: Moments (list)

```
Screen: "Moments" content moderation list. The sidebar item "Moments" is active.

Header: eyebrow "CONTENT MANAGEMENT", title "Moments", description "Review and moderate platform content".

4 stat cards: Total, Moments, bSparks, Engagement.

Toolbar:
- Search placeholder "Search by ID, owner, or caption..."
- Segmented tabs: "All", "Moments", "bSparks".

Columns:
- CONTENT: 48px square image thumbnail + 2-line caption + short ID.
- OWNER: avatar + name + @username.
- TYPE: pill, "Moment" pink or "bSpark" purple.
- Engagement: heart and comment counts.
- DATE
- ACTIONS: ⋯ with View details and red Delete.

10 rows with lifestyle photos.
```

### Screen 4: Moment Detail

```
Screen: "Moment" detail page. Top: "‹ Back" link on the left, and a red outline "Delete Post" button on the right.

LEFT COLUMN:
1. "Images" card: a large image carousel with dots.
2. "Caption" card: the caption text. Shows "No caption provided" when empty.
3. "Hashtags" card: pink hashtag chips.
4. "People Tagged" card: avatar chips.
5. "Comments" card:
   - Threaded comments: each has an avatar, name, time, text and like count.
   - Replies are indented underneath.
   - Each comment and reply has a small trash icon.
   - Empty state: "No comments yet".

RIGHT COLUMN:
1. "Moment Info" card: owner avatar, name and @username; a "Post ID" row in monospace; created date; location.
2. "Details" card: 3 stat tiles, Likes, Comments, Hashtags.

Also show a "Delete Comment" confirmation modal: "Are you sure you want to delete this comment? This cannot be undone."
```

### Screen 5: bSparks list and bSpark Detail

```
Screen A: "bSparks" list. Same layout as the Moments list. The sidebar item "bSparks" is active. Thumbnails are vertical 9:16 video stills with a small play icon and a duration badge "0:24". Show Views, Likes and Comments counts.

Screen B: bSpark detail. "‹ Back" link and a red "Delete bSpark" button.
- LEFT:
  - A vertical 9:16 video player card with a big centred "Play bSpark" button over the thumbnail.
  - A "Thumbnail" card. Shows "No thumbnail" when there isn't one.
  - A caption card. Shows "No caption" when empty.
  - A "Comments" card with threaded comments and trash icons.
- RIGHT:
  - An owner card.
  - Stat tiles: Likes, Comments, Views.
  - A details list.
- Also show a delete modal: "Are you sure you want to permanently delete this bSpark? This cannot be undone."
```

### Screen 6: Buzz (list)

```
Screen: "Buzz" list (text posts, like tweets). The sidebar item "Buzz" is active.

Header: eyebrow "BUZZ", title "Buzz".

4 stat cards: Total, Likes, Replies, Reposts.

Toolbar: search "Search by ID, content, or author...", plus a type filter.

Columns:
- BUZZ: author avatar + 2-line text preview + optional small media thumbnail.
- TYPE: pill, "Post", "Reply" or "Repost".
- Engagement: likes, replies and reposts icons with counts.
- DATE
- ACTIONS: ⋯ with View and Delete.

Also a "Delete Buzz" modal: "Are you sure you want to delete this buzz? This action cannot be undone."
```

### Screen 7: Buzz Detail

```
Screen: Buzz detail page. "‹ Back" link and a red "Delete Buzz" button.
- LEFT:
  - "Content" card: the large post text, with "No content" as the empty state.
  - "Media" card: an image grid, with "No media attached" as the empty state.
  - "Hashtags" card.
  - "Comments" card with replies.
- RIGHT:
  - "Buzz Info" card: author, "Buzz ID" in monospace, and the date.
  - "Details" card: tiles for Likes, Replies and Reposts.
```

### Screen 8: Campaigns (list)

```
Screen: "Campaigns" list (promoted shoppable reels). The sidebar item "Campaigns" is active.

Header: eyebrow "CAMPAIGNS", title "Campaigns".

4 stat cards: Campaigns, Live, Likes, Comments.

Toolbar: search "Search by ID, caption, or owner...".

Columns:
- CAMPAIGNS: vertical video thumbnail + caption + owner.
- STATUS: pill, "Live" green, "Paused" grey or "Draft" violet.
- DATE
- ACTIONS: ⋯
```

### Screen 9: Campaign Detail

```
Screen: Campaign detail. "‹ Back" link and a red "Delete Campaigns" button.
- LEFT:
  - "Thumbnail / Video" card: a 9:16 player with "Play Reel".
  - "Caption" card.
  - "Products" card: a list of tagged products. Each row has an image, the name, "Price" ₹1,999 struck through, a "Discount" 20% pill, and a bold "Final" ₹1,599.
  - "Comments" card.
- RIGHT:
  - "Campaigns Info" card: owner, "Campaigns ID", and a status pill.
  - "Details" card: tiles for Likes, Comments, Products and Status.
```

### Screen 10: Spotlights (list)

```
Screen: "Spotlights" ads list. The sidebar item "Spotlights" is active.

Header: eyebrow "SPOTLIGHTS", title "Spotlights".

4 stat cards: Total Spotlights, Active, Pending, Views.

Toolbar:
- Search "Search by ID, title, or creator..."
- Dropdowns: "All" status (Active, Pending, Paused, Rejected) and "All Categories".

Columns:
- SPOTLIGHT: video thumbnail + title + vendor name.
- CATEGORY: pill.
- STATUS: Active green, Pending pink, Paused grey, Rejected red.
- VIEWS
- DATE
- ACTIONS: ⋯ with View, Approve, Reject, and red Delete.
```

### Screen 11: Spotlight Detail (analytics)

```
Screen: Spotlight (ad) detail with analytics. Top: "‹ Back" link. On the right: a green "Approve" button, a red outline "Reject" button, and a red trash "Delete" button.

LEFT COLUMN:
1. Media card: a 9:16 video with a "Tap to play" overlay, plus the caption and a status pill.
2. "Engagement Analytics" card, subtitle "Live performance data for this spotlight".
   - Big stat tiles: Total Views, Unique Views, Total Likes, Dislikes, Comments.
   - Ring or meter gauges: "Like Rate", "Unique Rate" and "Completion rate".
3. "View Funnel" card: horizontal funnel bars, Total → Unique → Completed.
4. "Engagement Breakdown" card, subtitle "All metrics at a glance".
5. "Performance Rates" card: "Like approval", "Unique view rate" and "Completion" as progress bars.
6. "Views by Location" card, subtitle "Geographic distribution of views": a ranked list of Indian cities with bars, and "Country" / "Language" / "Locations" tabs.
7. Two side-by-side cards, "Likes by Gender" and "Dislikes by Gender", subtitle "Audience breakdown". Each is a small donut (Male, Female, Other).
8. Two cards, "Who Liked" and "Who Disliked": avatar lists.

RIGHT COLUMN:
1. Budget card:
   - "Total budget coins" big number.
   - "Budget Used" progress bar.
   - "Spent" and "Rewarded" tiles.
   - "Coins Per Engagement" with the caption "Per view / like / comment".
   - A "Reward coins" breakdown.
2. Transactions mini-list. Empty state: "No transactions found".

Also show a "Reject Ad" modal:
- Subtitle "Provide a reason for rejection (optional)".
- A "REJECTION REASON" textarea, placeholder "Enter rejection reason...".
- "Cancel" and red "Reject" buttons.
```

---

## BUSINESS

### Screen 12: Users (list)

```
Screen: "Users" management list. The sidebar item "Users" is active.

Header: eyebrow "USER MANAGEMENT", title "Users". A gradient "Create Admin" button on the right.

4 stat cards: Total Users, Active Now, New Today, Suspended.

Toolbar: search "Search by user name or email...", plus Role and Status dropdowns.

Columns:
- USER PROFILE: avatar + full name + @username + email in grey.
- ROLE: pill. Member is grey, Vendor violet, Influencer pink, Admin dark, Sales blue.
- BALANCE: coin icon + number.
- STATUS: pill, Active green or Suspended red.
- JOINED: date.
- ACTIONS: ⋯ with View, Suspend/Activate, and red Delete.

Also show the "Delete User" confirmation modal.
```

### Screen 13: User Details

```
Screen: User detail page. "‹ Back to Users" link. On the right: an outline "Suspend" toggle and a red "Delete User" button.

Profile header card:
- A banner gradient strip.
- A large 80px avatar overlapping the banner.
- Full name, @username, a role pill and a status pill.
- Contact rows with email, phone and location icons. The empty states read "No email provided", "No phone provided" and "No location provided".
- A stats row: Followers, Following, Posts.

Tabs underneath: Overview | Posts | Reels | Tweets | Promote | Ads | Wallet.

Show the Overview tab:
- Stat tiles: Posts, Reels, Total Likes, Comments, Views, Unique Views.
- A recent-content grid of thumbnails.

Also show the Wallet tab as a second state:
- Tiles: Balance, Coins, Total Earned, Transactions.
- A "Transaction History" table with columns Type, Amount (+green / -red), Date and Status. Type labels include "Post Like", "Post Comment", "Ad View Reward", "Ad Like Reward", "Reel View Reward" and "Ad Save Reward".
- Empty state: "No transactions yet".
```

### Screen 14: Create Admin

```
Screen: "Create Admin" form page.

A centred 560px white card:
- A shield icon, the title "Create Admin" (24px bold) and the subtitle "Register a new administrator account".
- A 2-column form grid:
  - FULL NAME (placeholder "Jane Admin")
  - USERNAME ("adminuser")
  - EMAIL ADDRESS ("admin@example.com")
  - PHONE NUMBER ("+91 98765 43210")
  - PASSWORD ("••••••••")
  - CONFIRM PASSWORD
- A footer with a ghost "Cancel" button and a gradient "Create Admin" button.
```

### Screen 15: Vendors (list)

```
Screen: "Vendors" list. The sidebar item "Vendors" is active.

Header: eyebrow "VENDOR OPERATIONS", title "Vendors", description "Validate vendor readiness, inspect profiles, and manage vendor access from a premium review queue."

4 stat cards: Total Vendors (Vendor accounts), Validated (Approved vendors), Pending (Awaiting validation), Complete Profiles (Ready for review).

Toolbar:
- Search "Search vendors, owners, phone, or role..."
- Dropdowns: "All Vendors" / Validated / Not Validated, and "All Profiles".

Columns:
- BUSINESS: bold business name + @username.
- OWNER
- PHONE
- ROLE: pink "Vendor" pill.
- PROFILE: dot pill, "complete" green or "incomplete" red.
- STATUS: dot pill, "Validated" green or "Not Validated" red.
- ACTIONS: ⋯ with View details, Toggle validation, and red Delete.
```

### Screen 16: Vendor Detail

```
Screen: Vendor detail. "‹ Back to Vendors" link. On the right: a gradient "Validate vendor" button (or outline "Unvalidate") and a red Delete button.

LEFT COLUMN:
1. Header card: company logo, company name, owner, and Validated / Profile incomplete pills. If the profile is incomplete, show an amber banner "Profile incomplete".
2. "Vendor Profile Fields" card: an info-tile grid with Company Name, Registered Name, Industry, Registration Number, Tax ID, Year Established, Company Type, Business Email, Business Phone, Address and Country.
3. Transactions card: a table. Empty state: "No transactions yet".

RIGHT COLUMN:
1. "Quick Info" card: Balance, Total Spent, Transactions.
2. "Sales Officer" card: the current officer with a "Current" pill. Empty state: "No sales officer assigned".
3. "Assign Sales Officer" card: a dropdown of officers and a gradient "Assign" button. Empty state: "No sales officers available".
```

### Screen 17: Packages

```
Screen: "Vendor Packages". The sidebar item "Packages" is active.

Header: eyebrow "PACKAGE MANAGEMENT", title "Vendor Packages", description "Create and manage vendor subscription packages, purchase history, ad limits and coin allocation." A gradient "+ Create Package" button on the right.

4 stat cards: Packages, Active, Purchases, Revenue (₹).

Toolbar:
- Search "Search packages, tier, or ad range..."
- Dropdowns: "All Tiers" (Basic, Standard, Premium, Enterprise) and "All Status".

Columns:
- PACKAGE: name + description.
- TIER: pill. Basic grey, Standard blue, Premium pink, Enterprise purple.
- PRICE: ₹
- COINS
- VALIDITY: "30 days"
- STATUS
- CREATED
- ACTIONS: Edit package, Deactivate.

Also show the "Create Package" modal. Fields: Name, Tier dropdown, Price, Coins, Validity (days), Ad limits min/max, DESCRIPTION textarea, FEATURES textarea ("One feature per line"), and a Status toggle.
```

### Screen 18: Sales Officers

```
Screen: "Sales" officers. The sidebar item "Sales" is active.

Header: eyebrow "SALES OPERATIONS", title "Sales", description "Manage sales officers, contact details, and vendor assignment coverage from a refined admin surface." A gradient "+ Add Sales Officer" button.

Stat cards: Sales Officers, Active Officers, Assigned Vendors, Team.

Toolbar: search "Search officers by name, email, phone, or location...", plus "All Officers" and Status dropdowns.

Columns:
- OFFICER: avatar + name + @username.
- EMAIL
- PHONE
- LOCATION
- VENDORS: assigned count.
- STATUS
- ACTIONS

Also show the "Add Sales Officer" modal, subtitle "Create a new sales role account". Fields:
- FULL NAME ("John Doe")
- USERNAME ("john_sales")
- EMAIL ("john@example.com")
- PHONE ("+91...")
- LOCATION ("Mumbai")
- PASSWORD ("Min. 6 characters")
```

### Screen 19: Vault (wallets list)

```
Screen: "Vault" wallets list. The sidebar item "Vault" is active.

Header: eyebrow "VAULT", title "Vault". An outline "Adjust balance" button.

4 stat cards: Vault Holders, Total Credits (green), Total Debits (red), Transactions.

Toolbar: search "Search by user name or email...", plus a sort dropdown: "Sort: Recent activity", "Sort: Balance", "Sort: Name", "Sort: Transactions".

Columns:
- USER: avatar + name + email.
- BALANCE: coin icon + bold number.
- CREDITS: green
- DEBITS: red
- TRANSACTIONS
- LAST ACTIVITY
- ACTIONS

Also show the "Adjust Wallet Balance" modal:
- A user picker.
- An OPERATION segmented control: Credit / Debit.
- An amount field.
- A reason dropdown: "Admin adjustment" or "Vendor recharge".
- A note field.
- A gradient "Apply" button.
```

### Screen 20: Vault Detail

```
Screen: "Vault Detail" for one user. "‹ Back" link.

- Header card: user avatar and name, plus a large "Balance" figure with a coin icon.
- 4 stat tiles: Current Balance, Total Credits, Total Debits, Transactions.
- A "Transaction History" table card:
  - Toolbar with search "Search transactions..." and a dropdown "All Directions" / Credits / Debits.
  - Columns: TRANSACTION (type label + ID), SOURCE, DIRECTION (green "Credit" or red "Debit" pill), AMOUNT (+/− coloured), DATE.
  - Empty state: "No transactions found".
```

---

## HELP & TICKET

### Screen 21: Inquiries

```
Screen: "Inquiries". The sidebar item "Inquiry" is active.

Header: eyebrow "HELP & TICKET", title "Inquiries".

4 stat cards: Total Inquiries, Open, In Progress, Resolved.

Toolbar: search "Search by name, email, or subject...", plus an "All Status" dropdown.

Columns:
- USER: avatar + name + email.
- SUBJECT
- MESSAGE: one-line truncated.
- STATUS: Open pink, In Progress violet, Resolved green.
- DATE
- ACTIONS: View and red Delete.

Also show the "Inquiry Detail" side drawer, 480px from the right. It shows user info, the subject, a "Message" block, a status dropdown, and Save / Delete buttons.
```

### Screen 22: Customer Queries (list)

```
Screen: "Customer Queries". The sidebar item "Customer Queries" is active.

Header: eyebrow "HELP & TICKET", title "Customer Queries".

Stat cards: Total Queries, Open, In Progress, Resolved, Closed.

Toolbar:
- Search "Search by name, username, subject…"
- Dropdowns: "All Status", "All Categories", and "All Sources" (B-smart, Ruvees).

Columns:
- CUSTOMER: avatar + name + @username.
- SUBJECT
- MESSAGE
- SOURCE: pill, "B-smart" pink or "Ruvees" teal.
- STATUS
- DATE
- ACTIONS: View, Mark Resolved, Delete.
```

### Screen 23: Customer Query Detail

```
Screen: Customer Query detail. "Go back" link. A "Live" green dot indicator in the header, plus "Mark Resolved" (green outline) and "Delete" buttons.

LEFT COLUMN:
1. Query card: subject title, a status pill, and the original message.
2. "Replies" card: a chat-style thread. Customer messages are left-aligned grey bubbles; admin replies are right-aligned pink-tinted bubbles. Each bubble has a name and time.
   At the bottom, a reply composer: a textarea with placeholder "Type a reply… (Ctrl+Enter to send)" and a gradient send button.

RIGHT COLUMN:
1. "Details" card: Customer, Phone, Category, App Source, Created, Assigned To.
2. "Update Status" card: a dropdown (Open, In Progress, Resolved, Closed).
3. "Assign To" card: a dropdown with placeholder "Select officer", including an "Unassigned" option.
```

### Screen 24: FAQ Management

```
Screen: "FAQ Management". The sidebar item "FAQ" is active.

Header: eyebrow "HELP & TICKET", title "FAQ Management". A gradient "+ Add FAQ" button.

Stat cards: Total FAQs, Active, Members, Vendors.

Toolbar:
- Search
- Dropdowns: "All Categories" (General, Account, Payment, Ads, Other), "All Sources" (Member, Vendor, Both), and "All Status".

The body is an accordion list of FAQ cards rather than a table. Each card has:
- The question in bold.
- A category pill, a source pill and an Active/Inactive pill.
- Up and down arrow buttons ("Move up" / "Move down") on the right.
- An Edit button and a red Delete button.

Show one card expanded with its "Answer" text.

Also show the Add/Edit FAQ modal:
- QUESTION, placeholder "How do I recharge my wallet?"
- ANSWER textarea, placeholder "Go to Wallet → Recharge → ..."
- CATEGORY, APP SOURCE and STATUS dropdowns.
- Empty state for the list: "No FAQs found".
```

---

## PROMOTIONS

### Screen 25: Gift Cards (catalog)

```
Screen: "Gift Cards". The sidebar item "Gift Cards" is active.

Header: eyebrow "PROMOTIONS", title "Gift Cards", subtitle "Create and manage gift card products". On the right, a refresh icon button and a gradient "+ New Gift Card" button.

4 stat cards: Total, Active, Draft, Inactive (also show Expired).

Toolbar: search "Search by title, vendor or description…", plus a status filter.

Body: a 3-column grid of gift card tiles. Each tile has:
- A 16:9 brand image (Amazon, Flipkart, Myntra, Swiggy style).
- The title, the vendor name, and a status pill.
- A "Denominations" row of small chips ("₹500", "₹1,000", "₹2,000", "₹5,000", "+2 more").
- A ⋯ menu with View, Edit and Delete.

Also show the "Delete Gift Card?" modal.
```

### Screen 26: Create Gift Card

```
Screen: "Create Gift Card Product" form. Breadcrumb "Gift Cards › Create".

LEFT COLUMN:
- Media upload dropzone.
- Title (placeholder "e.g. Amazon Gift Card").
- Vendor ("e.g. Amazon, Flipkart").
- Category.
- Description textarea ("Describe the gift card — where it can be used, restrictions…").
- Terms & Conditions textarea.
- Validity ("e.g. Valid for 12 months").

RIGHT COLUMN:
- A "Denominations" builder: rows with "Amount" (₹, placeholder "0.00") and "Bcoins" price, plus an "Add denomination" button.
- A Status selector: Active, Draft, Inactive.
- A sticky footer with "Cancel" and a gradient "Create" button.
```

### Screen 27: Gift Card View

```
Screen: Gift card detail. "‹ Back" link. "Edit" (outline) and "Delete" (red) buttons.

LEFT COLUMN:
- A hero brand image card with the title.
- "Description" card.
- "Denominations" card: a grid of amount tiles, each showing ₹ and the Bcoins price.
- "Terms & Conditions" card.

RIGHT COLUMN:
- "Quick Info" card: Status, Vendor, Category, Created.
- "Actions" card: Activate/Deactivate and Edit buttons.
```

### Screen 28: Gift Card Orders (list)

```
Screen: "Gift Card Orders". The sidebar item "Gift Card Orders" is active.

Header: eyebrow "PROMOTIONS", title "Gift Card Orders".

Stat cards: Total Orders, Pending, Processing, Completed, Cancelled.

Toolbar: search "Search by order ID, gift card or user...", plus a status filter.

Columns:
- ORDER ID
- GIFT CARD: thumbnail + title.
- USER: avatar + name.
- AMOUNT: ₹, with Bcoins under it.
- STATUS: Pending pink, Processing violet, Completed green, Cancelled red.
- DATE
- ACTIONS: View, Process, Delete.

Also show the "Delete Order?" modal.
```

### Screen 29: Gift Card Order View

```
Screen: gift card order detail. "‹ Back" link.

LEFT COLUMN:
- Order summary card: gift card image, title, amount, and a status pill.
- "Voucher Details" card: Voucher Code (large monospace with a copy button), PIN, Expiry Date, and Redeem Steps as a numbered list.

RIGHT COLUMN:
- "Quick Info" card: Order ID, User, Amount, B Coins, Status, Created At.
- "Actions" card: a gradient "Process order" button and a red outline "Cancel".
```

### Screen 30: Gift Card Order Process

```
Screen: "Process gift card order". A two-step layout.
- Step card 1, "Start Processing": order summary, then a gradient "Start Processing" button that moves the status Pending → Processing.
- Step card 2, "Complete Order": the fields Voucher Code (placeholder "e.g. AMZN-XXXX-XXXX"), PIN ("e.g. 1234"), Expiry Date, and a Redeem Steps textarea. A gradient "Complete Order" button.
- A right column with order info and a status timeline.
```

---

## REPORTS

### Screen 31: Bug Reports (list)

```
Screen: "Bug Reports". The sidebar item "Bug Reports" is active.

Header: eyebrow "REPORTS", title "Bug Reports".

Stat cards: Total Reports, New, In Progress, Fixed (also show Closed).

Toolbar: search "Search by ticket ID, description or reporter...", plus Status (New, In Progress, Fixed, Closed) and Priority (Critical, High, Medium, Low) dropdowns.

Columns:
- TICKET: "BUG-1042" + a category such as "App Crash" / "Video Not Playing" / "Login Issue" / "Payment Issue".
- REPORTER: avatar + name.
- PRIORITY: Critical red, High orange, Medium amber, Low blue.
- STATUS: New amber, In Progress blue, Fixed green, Closed grey.
- REPORTED: date.
- ACTIONS
```

### Screen 32: Bug Report Detail

```
Screen: Bug report detail. "‹ Back to Bug Reports" link. Outline "Delete" and gradient "Save Changes" buttons.

LEFT COLUMN:
1. A hero card with the screenshot attachment over a blurred backdrop (fallback: a rose-to-orange gradient with a warning icon). Under it: the ticket ID "BUG-1042" with a ticket icon, the category with a bug icon, and a status pill plus a "High Priority" pill on the right.
2. "Description" card.
3. "Attachments (3)" card: a grid of image and video thumbnails.
4. "Device Info" card with tiles: OS (Android 14 with a phone icon), Device Model, App Version, Network (Wi-Fi icon).

RIGHT COLUMN:
1. "Reporter" card: avatar, name, @username, email, plus Reported / Updated / Resolved dates.
2. "Manage" card:
   - Status dropdown.
   - Priority dropdown.
   - "Assigned To" input with a user icon.
   - "Admin Note" textarea ("Internal notes about this bug...").
   - A gradient "Save Changes" button.
```

### Screen 33: Content Reports

```
Screen: "Content Reports". The sidebar item "Content Reports" is active.

Header: eyebrow "REPORTS", title "Content Reports".

Stat cards: Total Reports, Pending, Reviewed, Action Taken, Rejected.

Toolbar: search "Search by reason, details, reporter or owner...", plus content type and status dropdowns.

Columns:
- CONTENT: thumbnail + type (Moment / bSpark / Buzz / Comment).
- REASON: pill, e.g. Spam, Nudity, Harassment, Hate speech, False information.
- REPORTED BY: avatar + name.
- CONTENT OWNER
- STATUS: Pending pink, Reviewed violet, Action Taken green, Rejected grey.
- REPORTED: date.
- ACTIONS: Review and Delete.

Also show the "Content Report" review modal:
- The content preview, plus Content ID, Reason, "Additional Details", Reported By and Content Owner.
- A "Review" section with a STATUS dropdown, an ACTION TAKEN dropdown (e.g. none, content removed, user warned, user suspended), and an ADMIN NOTE textarea ("Internal notes about this report...").
- "Cancel" and gradient "Save" buttons.
```

---

## LEGAL

### Screen 34: Legal Documents

```
Screen: "Legal Documents". The sidebar item "Legal Docs" is active.

Header: eyebrow "LEGAL", title "Legal Documents". A gradient "+ New Policy" button.

3 stat tiles: Total docs, Published, Draft.

Toolbar: search "Search by title or type…", plus app filter chips: All, Member, Vendor.

Body: a grid of document cards for "Terms & Conditions", "Privacy Policy", "Refund Policy" and custom ones such as "Cookie Policy". Each card has:
- A document icon, the title and the type slug.
- A Published/Draft pill and app visibility pills.
- The last-updated date and version "v4".
- "Edit" and ⋯ (Edit Document Type, Delete) actions.

Also show the "New Legal Document" modal:
- Subtitle "Create a custom policy page".
- Fields: title ("e.g. Cookie Policy"), document type slug ("e.g. cookies, shipping, disclaimer"), and app source.

Also show the "Edit Document Type" modal: subtitle "Update title and app visibility", with the note "Type slug cannot be changed".
```

### Screen 35: Policy Editor

```
Screen: rich-text Policy Editor. "‹ Back" link. The document title is shown, an amber "You have unsaved changes" chip, and a gradient "Save" / "Publish" button pair.

MAIN: a sticky formatting toolbar with icon buttons:
- Undo, Redo
- Paragraph, Heading 1, Heading 2, Heading 3
- Bold, Italic, Underline, Strikethrough
- Bullet List, Numbered List, Blockquote
- Align Left, Align Center, Align Right
- Insert Link, Clear Formatting
Below it, a large white document canvas (720px reading width) with sample Terms & Conditions headings and paragraphs. The placeholder is "Start writing your policy content here…".

RIGHT COLUMN, with tabs "Details" | "History":
- Details: a "Document Info" card with Type, Version, Words, Last saved, and Edited by.
- History: a version list with an avatar, version number, date and a "Restore" link. Empty state: "No history yet".
```

---

## SYSTEM

### Screen 36: Settings

```
Screen: "Settings". The sidebar item "Settings" is active.

Header: eyebrow "ADMIN SETTINGS", title "Settings" (30px bold).

Layout: a left vertical tab list (General, Profile) next to a content card.

General tab, "General Settings":
- APPLICATION NAME field.
- A "Notifications" subsection with toggle switches (pink when on): "Email Notifications", "Push Notifications" and "Weekly Reports". Each has a grey description line.

Profile tab, "Profile Settings":
- An avatar upload.
- NAME and EMAIL fields.
- A "Change Password" subsection: CURRENT PASSWORD, NEW PASSWORD and CONFIRM NEW PASSWORD.
- A gradient "Save changes" button at the bottom right.
```

### Screen 37: Notifications

```
See Screen 11 in marketplace-admin-stitch-prompts.md. It covers the Notifications page, including the order notification types.
```

---

## Shared states (optional prompts)

- "Show the empty, loading and error states used across list pages. Empty: a centred grey magnifier icon, 'No records found' and 'Try changing your search or filters.' Loading: the same layout with 'Loading…'. Error: red text 'Error: Failed to load'."
- "Show the detail-page loading state (centred spinner with 'Loading …') and the error state (a red circle with an alert icon, 'Could not load …', and the error message in grey)."
- "Make a 390px mobile version of the Dashboard. The sidebar becomes a hamburger menu button at the top left that opens a slide-in drawer with a dark overlay. The KPI cards stack in 2 columns and the charts become full width."
