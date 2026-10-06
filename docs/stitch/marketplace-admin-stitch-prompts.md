# B-smart Admin CRM: Marketplace UI, Google Stitch prompts

How to use:
1. In Google Stitch, start a new **Web** project.
2. Paste the **Design System** block and **Screen 1** together as your first prompt.
3. Paste each later screen as a new prompt in the same project. Start each one with "Using the same design system and sidebar:" so Stitch keeps everything consistent.
4. One screen per prompt works best. If Stitch drops detail, re-prompt only the part that's missing (for example "Add the Refund column to the table").

---

## Design System (paste with Screen 1)

```
Design a desktop web admin dashboard called "B-smart Admin CRM" for a social commerce app where influencers sell products and services. 1440px wide desktop layout. Clean, premium, data-dense SaaS style.

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
- Main content area: light grey background #F9FAFB, 24px padding, content max width 1280px.

TYPOGRAPHY
- Font: Montserrat (fallback Inter).
- Page eyebrow: 11px bold uppercase, wide letter-spacing, brand pink #E8194E.
- Page title: 20px bold, #111827. Page description: 14px, #6B7280, max 2 lines.
- Table headers: 11px semibold uppercase, #6B7280, with a tiny sort-arrow icon.
- Body: 14px, #374151. Secondary text: 12px, #6B7280.

COLOURS
- Brand primary: #E8194E (pink). Secondary: #833AB4 (purple). Brand gradient: 135deg #E8194E to #833AB4.
- Neutrals: #F9FAFB, #F3F4F6, #E5E7EB, #9CA3AF, #6B7280, #374151, #111827.
- Status pill tones (soft background, 1px border, coloured text, 6px radius, 12px medium text, optional 6px coloured dot):
  emerald (success / active / paid / delivered), rose (danger / suspended / failed / cancelled / out of stock), violet (draft / shipped / refunded), magenta-pink (processing / brand), neutral grey (pending / inactive).

COMPONENTS
- Stat cards: white, 1px #E5E7EB border, 12px radius, 16px padding. A 36px rounded-square tinted icon tile on the left, an 18px bold number, and an 11px grey label under it. Four in a row.
- Data table card: white, 1px border, 12px radius.
  - Toolbar: a search input with a magnifier icon (36px tall, #F9FAFB fill, 8px radius, full width), then compact filter dropdowns on the right (36px tall, 12px medium text, chevron).
  - Table rows: 12px vertical padding, hairline dividers, light hover tint.
  - Last column: a "⋯" row-action button that opens a small white menu with icon + label items. Destructive items are red.
  - Footer: "1–10 of 248" on the left; prev/next square buttons and "1 / 25" on the right.
- Detail pages use 24px-radius white cards with a 1px border and a soft shadow. Each card has a header row (14px semibold title) and a hairline divider.
  - Info tiles inside cards: #F9FAFB fill, 1px #F3F4F6 border, 12px radius. A 10px bold uppercase grey label sits above a 14px value.
- Buttons:
  - Primary: brand gradient, white text, 8px radius.
  - Outline: white with a grey border.
  - Danger: solid red #EF4444.
  - Ghost: text only.
- Modals: centred, 16px radius white panel over a dark blurred backdrop. Header has a title, subtitle and a close X. The footer bar is light grey with right-aligned buttons.
- Toasts: bottom-right, rounded, emerald (success) or red (error) tint.
- Avatars: circular photos, with a gradient circle showing the initial as the fallback. Product thumbnails: 44px rounded-square images.
- Currency is Indian Rupees, formatted like ₹1,299 or ₹4,50,012. Use Indian names and realistic store names.
```

---

## Screen 1: Marketplace › Influencers (list)

```
Screen: "Influencers" admin list page. The sidebar item "Influencers" under MARKETPLACE is active.

Header: eyebrow "MARKETPLACE", title "Influencers", description "Every influencer storefront on the platform. Suspend selling privileges without banning the account — suspended influencers keep member access but can't create or edit listings."

4 stat cards:
- Total Influencers 248 (pink users icon)
- Selling Active 231 (green shield-check)
- Suspended 17 (red shield-off)
- Account Banned 4 (purple store icon)

Table toolbar:
- Search placeholder "Search store, username, owner, or email..."
- Filter dropdowns "All Selling States" and "All Accounts".

Columns:
- STORE: avatar + bold store name + "@username" below.
- OWNER
- EMAIL
- BUSINESS TYPE: violet pill, e.g. "Fashion", "Beauty", "Fitness Coaching".
- SELLING: green "Active" dot-pill, or red "Suspended" dot-pill with a one-line grey truncated reason under it, e.g. "Counterfeit branded items reported".
- ACCOUNT: green "Active" or grey "Banned".
- JOINED: e.g. "Mar 12, 2026".
- ACTIONS: ⋯

Show 10 rows with a mix of states; 2 rows are suspended. Example rows:
- "Priya's Closet" @priyastyles, Priya Sharma
- "FitWithArjun" @arjunfit, Arjun Mehta (suspended)
- "Glow by Neha" @nehaglow
- "Desi Crafts Co." @desicrafts

Show one row's action menu open with these items:
- View profile
- View products
- View services
- View orders
- Suspend selling (red, shield-off icon)
For a suspended row, the menu shows "Restore selling" (shield-check icon) instead of "Suspend selling".
```

## Screen 2: Suspend / Restore influencer modals

```
Using the same design system, show two modal dialogs over the dimmed Influencers page.

Modal A, "Suspend selling privileges":
- Subtitle "FitWithArjun (@arjunfit)".
- Body text: "They keep normal app access as a member, but won't be able to create or edit products and services until restored."
- A "REASON" label above a 4-line textarea, placeholder "Explain why selling is being suspended — this is shown to the influencer."
- Footer: ghost "Cancel" and a red "Suspend" button. Show "Suspend" disabled while the textarea is empty.

Modal B, "Restore selling privileges":
- Body text: "They'll be able to create and edit products and services again."
- A soft rose box labelled "CURRENT REASON" containing "Counterfeit branded items reported by 3 buyers".
- Footer: ghost "Cancel" and a primary gradient "Restore" button.

Also show a bottom-right green toast: "Selling privileges suspended".
```

## Screen 3: Marketplace › All Products (list)

```
Screen: "All Products" admin catalog page. The sidebar item "Products" is active.

Header: eyebrow "MARKETPLACE", title "All Products", description "Every influencer product listing across all sellers and statuses, including drafts and out-of-stock items."

4 stat cards:
- Matching Products 1,284 (pink package icon)
- Active 1,032 (green check)
- Draft / Inactive 171 (violet edit icon)
- Out of Stock 81 (red alert triangle)

Toolbar:
- Search placeholder "Search name, description, brand, category, or SKU..."
- Three dropdowns: "All Sellers" (long scrollable list of store names, some ending in "(suspended)"), "All Statuses" (Active, Inactive, Draft, Out of Stock), "All Categories".

Columns:
- PRODUCT: 44px rounded product photo + bold name + grey "Brand · SKU PC-1023".
- SELLER: small avatar + store name + "@username". Some sellers have a tiny red "Suspended" pill with a shield-off icon right after the store name.
- CATEGORY: grey pill, e.g. "Apparel", "Skincare", "Home Decor".
- PRICE: bold "₹1,299" with a struck-through grey MRP "₹1,999" under it.
- STOCK: number, red "0" when out of stock, plus "3 variants" in small grey.
- STATUS: dot-pill. Active is green, Draft is violet, Inactive is grey, Out of Stock is red.
- LISTED: date.
- ACTIONS: ⋯ with "View details" and "View seller".

10 rows of realistic fashion, beauty and home products with real-looking product photos.
```

## Screen 4: Product Detail

```
Screen: admin "Product Detail" page. The sidebar item "Products" is active. Two-column layout: the main column is flexible and the right column is 360px and sticky.

Top bar: "‹ Back to All Products" grey text link.

LEFT COLUMN:
1. Hero card (24px radius). A 320px-tall image area: the product photo is centred and contained, over a blurred, darkened copy of itself. Under it, a row of 64px thumbnails; the selected one has a pink border.
   Below that, inside the card:
   - Title "Handwoven Cotton Kurta Set" (20px bold).
   - Meta row: tag icon + "Apparel", "Brand: Desi Crafts", "SKU: DC-KRT-014".
   - Top-right: green "Active" pill.
   - Price row: big bold "₹1,499", struck-through "₹2,299", green pill "35% off".
2. "Description" card: a paragraph, then a divider and "KEY HIGHLIGHTS" with 4 bullet rows, each with a green check-circle icon.
3. "Price & Inventory" card with a 3-column grid of info tiles: MRP, Selling Price, Discount, Stock (red if 0), Track Inventory (Yes/No), HSN / GST.
4. "Variants (4)" card with a simple table: Color | Size | Price | Stock.
5. "Delivery & Returns" card with info tiles:
   - Package Weight "0.6 kg"
   - Dimensions (L×W×H) "30 × 25 × 4 cm"
   - Dispatch Time "2-3 days"
   - Country of Origin "India"
   - Return Policy "7 days"
   - Warranty "None"
   - Store Delivery Settings "Yes"
   - Store Return Policy "Yes"

RIGHT COLUMN:
1. "Seller" card:
   - Header has a green "Selling active" pill.
   - 44px avatar, store name, owner name, @username.
   - Two outline buttons side by side: "Profile" (external-link icon) and "All products".
   - A full-width red "Suspend selling privileges" button.
2. "Listing Info" card with key/value rows: Product ID (monospace id), Listed, Updated, Images "5".

Also make a variant of the Seller card where the seller is suspended:
- Header pill is red "Suspended".
- A rose box shows "SUSPENSION REASON", the reason text and "Since Oct 2, 2026, 04:12 PM".
- The button becomes a gradient "Restore selling privileges".
```

## Screen 5: Marketplace › All Services (list)

```
Screen: "All Services" admin catalog page. The sidebar item "Services" is active. Same table style as All Products.

Header: eyebrow "MARKETPLACE", title "All Services", description "Every influencer service listing across all sellers and statuses, including drafts and hidden services."

4 stat cards:
- Matching Services 412 (pink wrench)
- Active 356 (green check)
- Draft / Inactive 56 (violet)
- Hidden 23 (red eye-off)

Toolbar:
- Search placeholder "Search name, description, category, or provider..."
- Dropdowns: All Sellers, All Statuses (Active, Inactive, Draft), All Categories.

Columns:
- SERVICE: thumbnail + bold name + grey "Provider · 1 hour".
- SELLER: avatar + store name with an optional red "Suspended" pill.
- CATEGORY: pill.
- PRICE: bold "₹999" with a grey "Per Session" / "Starting From" / "Fixed" / "Per Hour" under it.
- METHOD: "Online", "At Customer Location" or "At My Location".
- STATUS: dot-pill, with a small grey eye-off "Hidden" line under it when the service isn't visible to customers.
- LISTED
- ACTIONS: ⋯

Example services:
- "1:1 Personal Fitness Coaching"
- "Bridal Makeup"
- "Instagram Growth Consultation"
- "Home Yoga Session"
```

## Screen 6: Service Detail

```
Screen: admin "Service Detail" page. Same two-column layout as Product Detail. Top link "‹ Back to All Services".

LEFT COLUMN:
1. Hero card with an image gallery. If there are no images, show a 160px pink-to-purple gradient banner with a faded wrench icon.
   - Title "1:1 Personal Fitness Coaching".
   - Meta row: "Fitness", "Provider: Arjun Mehta", clock icon "1 hour".
   - Top-right pills: green "Active" and a grey "Hidden" pill with an eye-off icon.
   - Price: big "₹1,200" with grey "Per Session" next to it.
2. "Description" card with KEY HIGHLIGHTS check-list.
3. "Pricing & Delivery" card with info tiles: Price, Rate Type, Duration, Service Method "Online", Visible to Customers "No".
4. "Sub-services (3)" table: Name | Hours | Price.
5. "Weekly Availability" card: 7 rows, Monday to Sunday. Each row has the capitalised day name on the left and green time-slot chips on the right, e.g. "09:00 – 12:00" and "17:00 – 20:00". Sunday shows grey "Unavailable".

RIGHT COLUMN: the same "Seller" card (with suspend/restore button, "Profile" and "All services" buttons) and a "Listing Info" card.
```

## Screen 7: Marketplace › Orders (list)

```
Screen: "Orders" admin list page. The sidebar item "Orders" is active.

Header: eyebrow "MARKETPLACE", title "Orders", description "Every marketplace order across all buyers and sellers. Open an order to update its status or cancel it."

4 stat cards:
- Matching Orders 3,412 (pink cart)
- To Fulfil 128 (violet package-check)
- Refund Failed 3 (red alert triangle)
- Paid Value ₹48,72,310 (green rupee icon)

Toolbar:
- Search placeholder "Search order number or Razorpay payment ID...".
- On the right, first a toggle chip button "⚠ Refund failed". Show it in its OFF state (grey outline); in a second small variant, show the ON state (rose fill, rose border, rose text).
- Then dropdowns: "All Statuses" (Pending, Confirmed, Processing, Shipped, Delivered, Cancelled), "All Payments" (Pending, Paid, Failed, Refunded), "All Sellers".

Columns:
- ORDER: bold "ORD-1759403221-4821" with the date-time under it. Rows with a failed refund show a small red dot before the order number.
- BUYER: avatar + name + @username.
- ITEMS: 36px thumbnail + first item name + grey "3 units · +1 more".
- SELLER: comma-separated store names, truncated.
- TOTAL: bold "₹4,499".
- PAYMENT: pill (Paid green, Pending grey, Failed red, Refunded violet) with a small grey "Razorpay" or "Wallet" under it.
- STATUS: dot-pill. Pending grey, Confirmed violet, Processing pink, Shipped violet, Delivered green, Cancelled red.
- REFUND: a red "Refund failed" pill with an alert icon, or a light grey "-".
- ACTIONS: ⋯ with "View details" and red "Cancel order". "Cancel order" only shows for pending, confirmed or processing orders.

10 rows with a realistic mix; exactly 1 row is Cancelled + Paid + Refund failed.
```

## Screen 8: Order Detail (normal order)

```
Screen: admin "Order Detail" page. Two-column layout (flexible main column, 360px sticky right column). Top link "‹ Back to Orders".

LEFT COLUMN:
1. Header card:
   - Title "ORD-1759403221-4821" (20px bold), with "Placed Oct 2, 2026, 11:42 AM" under it.
   - Top-right: green "Paid" pill and violet "Processing" dot-pill.
   - Below that, a horizontal 5-step progress stepper: Pending → Confirmed → Processing → Shipped → Delivered. Each step is a 28px circle with a label under it, joined by thin connector lines.
     - Completed steps: gradient-filled circles with a white check, and pink connector lines.
     - Current step: gradient-filled circle showing its number.
     - Future steps: white circles with a grey border and grey number, and grey connector lines.
2. "Items (2)" card with a table: PRODUCT (40px thumb + name + grey variant "Blue / M"), SELLER (store name), UNIT PRICE, QTY, SUBTOTAL. The number columns are right-aligned. Under the table, a totals block: Subtotal ₹4,299, Shipping "Free" or ₹200, then a divider and a bold "Total ₹4,499".
3. "Fulfilment" card with info tiles: Items Confirmed Yes, Packed Yes, Notify Buyer Yes, Courier "Blue Dart", Tracking Number "BD123456789", Shipped (date), Delivered "-".
4. "Payment" card with info tiles: Method "Razorpay", Status (green Paid pill), Currency "INR", Razorpay Order ID, Razorpay Payment ID (small monospace).

RIGHT COLUMN:
1. "Manage Order" card:
   - Dropdown labelled "UPDATE STATUS" showing "Shipped".
   - Two text inputs, each label marked with a red asterisk: "COURIER *" (placeholder "e.g. Blue Dart") and "TRACKING NUMBER *" (placeholder "e.g. BD123456").
   - A checkbox "Notify the buyer" (checked, pink).
   - A full-width gradient "Update status" button with a save icon.
   - A divider, then a full-width outline button with red text "Cancel order" and a ban icon.
2. "Buyer" card: 44px avatar, name, @username, email. Two outline buttons: "Profile" and "Their orders".
3. "Shipping Address" card: map-pin icon, bold recipient name, address lines ("221 MG Road", "Indiranagar", "Bengaluru, Karnataka, 560038", "India"), and the phone number in grey.
4. "Order Info" card: Order ID, Created, Updated.

Bottom-right green toast: "Order marked as shipped".
```

## Screen 9: Order Detail (cancelled, refund failed)

```
Same Order Detail layout, for a cancelled order whose automatic refund failed.

At the very top of the left column, above the header card, add a full-width alert card: rose background #FFF1F2, rose border, 24px radius. It has an alert-octagon icon on the left and contains:
- Bold heading "Automatic refund failed".
- Text: "This order was cancelled but the Razorpay refund of ₹4,499 did not go through. The buyer has been told their refund is being processed manually."
- A white inner box labelled "REFUND ERROR" containing "BAD_REQUEST_ERROR: The payment has been fully refunded already".
- Text starting with bold "Mark as refunded manually:", then "issue the refund from the Razorpay dashboard for payment pay_PxK29dLm3QaZ1r (monospace). The dashboard can't update this order's payment status yet, so it will keep showing as paid."

Header card: the top-right pills are red "Refund failed" (alert icon), green "Paid", and red "Cancelled". Instead of the stepper, show a rose box: "Cancelled on Oct 3, 2026, 09:15 AM" and "Reason: Buyer requested cancellation — wrong size ordered".

Payment card: add a "Refund" info tile containing the red "Refund failed" pill.

Manage Order card: replace the controls with grey text "This order was cancelled and can no longer be updated." Hide the Cancel button.
```

## Screen 10: Cancel Order modal

```
Using the same design system, show a modal over the dimmed Order Detail page.

Title "Cancel order", subtitle "ORD-1759403221-4821".

Body:
- An amber warning box (amber-50 fill, amber border, alert-triangle icon) with: "₹4,499 will be refunded through Razorpay and the items restocked. If the Razorpay refund fails, the order is still cancelled and flagged "Refund failed" for a manual refund."
- A "REASON" label above a 3-line textarea, placeholder "Why is this order being cancelled? The buyer can see this."

Footer: ghost "Keep order" and red "Cancel order" (disabled until a reason is typed).

Also show two small alternate versions of the amber message:
- Wallet: "₹1,299 will be refunded to the buyer's wallet and the items restocked."
- Unpaid: "No payment has been captured, so nothing will be refunded."

Bottom-right toasts:
- Green "Order cancelled and refunded".
- Red "Order cancelled, but the refund did not go through. Refund it manually."
```

## Screen 11: Notifications (with order types)

```
Screen: "Notifications" admin page. The sidebar item "Notifications" is active.

Header: eyebrow "NOTIFICATION CENTER", title "Notifications", description "Review activity alerts, login events, and operational notices." A gradient "Mark All Read" button with a check icon on the right.

3 stat cards: Total 126, Unread 3 (red), Read 123 (green).

Table toolbar: search "Search by message, sender, or type...", plus dropdowns "All Status" and "All Types".

Columns:
- (unread dot)
- SENDER: avatar + name + @username.
- MESSAGE: the text, plus a small pink link line under it.
- TYPE: grey pill with an emoji icon + label.
- TIME: "5m ago".
- ACTIONS: eye icon for "mark read", trash icon.

Rows must include these order notification types, each with its emoji, label and unread dot colour:
- 🚨 "Refund failed" (red dot). Message: "Refund failed for cancelled order ORD-1759403221-4821 (₹4,499). Please refund manually." The link line is a clickable pink "Open /admin/orders/66fd…", bold and underlined on hover.
- 🛍️ "Order placed" (green)
- 📦 "New order" (blue)
- 🚚 "Order update" (purple)
- ❌ "Order cancelled" (red)
- 💰 "Refund processed" (green)
- ⚠️ "Payment failed" (red)
- ⏳ "Refund pending" (amber)

Also include a few older read rows of other types (like, follow, login alert) with a white background. Unread rows have a very faint pink tint.
```

---

## Optional follow-up prompts

- "Generate the empty state for the Orders table: centred magnifier icon, 'No orders found', 'Try changing your search or filters.'"
- "Generate the loading state for Product Detail: centred spinner and 'Loading product…'."
- "Generate the error state for detail pages: red circle with alert icon, 'Could not load this listing', and the error message in grey."
- "Make a 390px mobile version of the Orders list. The sidebar collapses to a hamburger button in the top-left, and the table scrolls horizontally inside its card."
