# How to use the Juwon Electric platform

Last updated: 2026-09-17

This guide explains, in plain steps, how to do everyday work on the Juwon Electric platform: the **admin console** (for staff) and the **public website** (for customers). Each chapter is written for one kind of user.

## Contents

1. [Who this guide is for](#1-who-this-guide-is-for)
2. [Signing in and resetting your password](#2-signing-in-and-resetting-your-password)
3. [Finding your way around the admin console](#3-finding-your-way-around-the-admin-console)
4. [Owner / Super admin](#4-owner--super-admin)
5. [Admin](#5-admin)
6. [Sales rep](#6-sales-rep)
7. [Inventory manager](#7-inventory-manager)
8. [Engineer](#8-engineer)
9. [HR](#9-hr)
10. [Support](#10-support)
11. [Customer (public website)](#11-customer-public-website)
12. [How updates reach the website](#12-how-updates-reach-the-website)
13. [Troubleshooting](#13-troubleshooting)
14. [Keeping this guide current](#14-keeping-this-guide-current)

---

## 1. Who this guide is for

Everyone who works on the platform has a **role**. Your role decides which pages you see in the admin console and which buttons work for you. If a page in this guide is missing from your menu, your role doesn't include it. Ask the owner if you need it.

| Role (as shown in the console) | Who usually has it | What you can do |
|---|---|---|
| **Super admin** | The owner | Everything. Only a super admin can create or change Super admin and Admin accounts. |
| **Admin** | Office manager | Everything except the engineer's "My jobs" page. Can't manage Super admin or Admin accounts. |
| **Sales** | Sales reps, in-store staff | Dashboard; record **in-store sales**; manage orders (payment, fulfilment, engineer); installation jobs; edit packages, services, portfolio and customer segments; see products and stock; messages and newsletter; see staff. |
| **Inventory** | Store/warehouse manager | Dashboard; add and edit products and categories; stock levels, adjustments and movements; low-stock check; see packages, services, portfolio, orders and carts. |
| **Engineer** | Field engineers | **My jobs** only: your assigned installations, checklist, photos and notes. |
| **HR** | HR officer | Dashboard; vacancies (create, publish, close, delete); staff profiles. |
| **Support** | Customer care | Dashboard; messages (reply) and newsletter; see orders, carts, installation jobs, packages and products. |

Everyone except engineers can also **view** Settings. Only Super admin and Admin can **change** Settings, see the **Activity** log, and invite or deactivate accounts.

**Customers** don't have accounts. They use the public website without signing in (chapter 11).

---

## 2. Signing in and resetting your password

### Sign in

1. Open the admin console at `/admin` on the Juwon Electric website (for example `https://<your website>/admin`).
2. Enter your **Email address** and **Password**.
3. Select **Sign in**.

**What you'll see:** the first page your role can use. For most people that's the Dashboard; for engineers it's **My jobs**.

### First time: accept your invite

When the owner or an admin invites you, you get a password reset email with a **reset token** (a code) and a link to the admin console.

1. Open `/admin/reset-password`, or select **Forgot password?** on the sign-in page.
2. Enter the **Reset token** from the email, then your **New password** and **Confirm new password**.
3. Select the button to save, then sign in with your new password.

### Forgot your password

1. On the sign-in page, select **Forgot password?**.
2. Enter your **Email address** and send. You'll see a message that a token has been sent if the account exists.
3. Check your email, then enter the **Reset token**, **New password** and **Confirm new password**.

**Tips and common mistakes**

- Passwords must be **12 to 128 characters** and must not be your email address or contain the first part of it.
- A reset token works **once** and only for **30 minutes**. If it expired, request a new one.
- You can request at most 3 resets an hour. Too many wrong sign-in attempts lock sign-in for about 15 minutes; wait and try again.
- Resetting your password signs you out on all your other devices.

---

## 3. Finding your way around the admin console

The menu on the left (or behind the menu button on a phone) is grouped like this:

| Group | Pages |
|---|---|
| Overview | Dashboard, My jobs |
| Sales | Orders, Installations, Carts |
| Catalog | Products, Categories, Inventory, Packages, Services, Portfolio |
| Customers | Messages, Newsletter |
| Team | Vacancies, Staff & roles |
| System | Activity, Settings |

- **Refresh data** (the circular arrow at the top) reloads the page's information.
- **New activity banner:** when new customer messages, customer replies or orders arrive, a banner says, for example, "You have 2 new messages and 1 new order." Open an item to mark it as read, or select **Mark all as read**. Your read status is saved to your account, so it follows you to other devices.
- **Signing out:** use the account menu at the top.

---

## 4. Owner / Super admin

### Story 4.1: Invite staff and set their role

*As the owner, I want to give each staff member their own account with the right role so that everyone sees only what they need.*

1. Go to **Staff & roles** and open the **Accounts** tab.
2. Select **Invite user**.
3. Enter **Name**, **Email address**, choose a **Role**, and optionally a **Phone**.
4. Save.

**What you'll see:** the person appears in the list. They get an email with a token to set their password before they can sign in.

To change a role later: find the person, choose **Change role**, pick the new role and save. The change applies on their next click in the console.

**Tips and common mistakes**

- The invite token lasts 30 minutes. If they miss it, tell them to use **Forgot password?** on the sign-in page with the same email.
- Each email address can have only one account.
- Only a super admin can give (or remove) the **Super admin** and **Admin** roles.
- You can't change your own role. Ask another super admin.

### Story 4.2: Deactivate someone who has left

*As the owner, I want to switch off a former staff member's access at once so that they can't see or change anything.*

1. Go to **Staff & roles** → **Accounts**.
2. Find the person (use **Search by name or email**).
3. Choose **Deactivate** and confirm.

**What you'll see:** their status changes to **Deactivated**. They are signed out everywhere immediately.

**Tips and common mistakes**

- Deactivate instead of deleting. Their past work stays in the Activity log.
- To bring someone back, choose **Reactivate**. They sign in with their existing password and role.
- The last active super admin can't be deactivated or demoted, and you can't deactivate yourself.

### Story 4.3: Set business details and notification emails

*As the owner, I want the website and alert emails to use the right contact details so that customers reach us and the right staff get alerts.*

1. Go to **Settings**.
2. **Business:** fill in Business name, Email address, Phone, Address and Website. These show on the public website and in customer emails.
3. **Notifications:** add email addresses for **New orders**, **Low stock** and **Vacancies** (up to 10 each).
4. **Payments:** turn on **Accept online payments** only when a **Payment provider** (Paystack or Flutterwave) is set up. When off, customers order and pay by transfer or on delivery after your call.
5. **Inventory:** set the **Default reorder level** for new products and switch **Send low-stock alerts** on or off.
6. Save.

**Tips and common mistakes**

- If the New orders or Low stock list is empty, alerts go to the server's default address set up by your developer.
- Staff other than Super admin and Admin see Settings as **View only**.
- Business details show on the website within about a minute (chapter 12).

### Story 4.4: Read the dashboard

*As the owner, I want a quick view of sales, open work and stock so that I know where to act.*

1. Go to **Dashboard**.
2. Pick a **Reporting period**: Last 7 days, Last 30 days, Last 90 days or Last 12 months.

**What you'll see:**

| Card | Meaning |
|---|---|
| Revenue | Paid and part-paid orders placed in the period (after discounts), not counting cancelled orders |
| Open orders | Orders that are pending, processing or out for delivery right now |
| Low-stock items | Active products at or below their reorder level |
| Open vacancies | Vacancies live on the careers page |
| Upcoming jobs | Installations scheduled in the next 7 days |

Below the cards: total revenue, orders, completed orders, leads, **Order value by day**, **Orders by status** and **Recent orders** (the five newest). Both website and in-store orders count.

### Story 4.5: Set the package price adjustment (markup)

*As the owner, I want to add or take off a fixed naira amount on each package option so that I control the price customers pay.*

A package option's price is worked out like this:

| Line | Where it comes from |
|---|---|
| **Products total** | Each product's current price × quantity, added up. You can't type it. |
| **Price adjustment (₦)** | Your fixed amount. Positive adds (markup), negative takes off (discount). |
| **Public price** | Products total + adjustment. Customers pay this, and orders record it. |

1. Go to **Packages** and open the package.
2. For each option (for example "Without solar", "With solar"), check the products and read the **Products total**.
3. Under **Price adjustment (₦)**, choose **+** to add to the products total (for example installation or margin) or **−** to subtract (for example a bundle discount), then type the amount in whole naira.
4. Check the **Public price** in bold, then save.

**Example:** Products total ₦1,300,000 + adjustment ₦50,000 = Public price ₦1,350,000.

**Tips and common mistakes**

- Customers never see the products total or your adjustment, only the public price.
- When a product's price changes, every package using it changes price automatically. Your adjustment stays the same naira amount.
- The public price must be more than ₦0, or the package won't save ("The public price must be greater than 0.").
- Options with no products still show a manual price field and the note "Add products to calculate the price automatically." Build them from products (chapter 7, story 7.4) to get automatic pricing.

### Story 4.6: Check the activity log

*As the owner, I want to see who changed what so that I can review discounts, price changes and account changes.*

1. Go to **Activity**.
2. Filter by action or record type if needed.

**What you'll see:** Time, Admin, Action, Record and Summary, newest first. Sign-ins, order changes, stock adjustments, role changes and settings changes all appear. In-store sales show a summary such as "In-store order for Ada Okafor: 3 items, ₦450,000; discount ₦20,000 (loyal customer)".

**Tip:** if a cancelled order couldn't put stock back because a product was deleted, the summary says "stock not restored for deleted product <SKU>". Fix the stock by hand in **Inventory** if needed.

---

## 5. Admin

Admins can do everything in chapters 4, 6, 7, 9 and 10, except managing Super admin and Admin accounts. This chapter covers website content and handling an order from start to finish.

### Story 5.1: Update services and customer segments

*As an admin, I want to keep the Services page accurate so that customers know what we offer and who we serve.*

1. Go to **Services**.
2. To add a service, select **Add service**. To change one, select **Edit** on its row.
3. Fill in **Title**, **Description**, **Image path** (a photo already on the website, like `/panel-4.webp`, or a full `https://` link), and optionally **Button label** and **Button link**.
4. Tick **Show on the Services page** to make it public. Save.
5. For **Customer segments** (the kinds of customers listed under "Who we serve", for example homes or businesses), open the customer segments section on the Services page. Fill in **Title**, **Subtitle** and **Image path**, tick **Show on the Services page**, and save.

**Tip:** untick "Show on…" to hide an item without deleting it.

### Story 5.2: Add work to the portfolio

*As an admin, I want to show completed installations so that customers trust our work.*

1. Go to **Portfolio** and add a project.
2. Enter **Name**, **Image path** and optionally an **External link** (for example the Instagram post).
3. Choose where it shows: **Featured on the home page**, **Show on mobile**, **Show on the Portfolio page**. Save.

### Story 5.3: Handle a website order from start to finish

*As an admin, I want to move each order through its steps so that the customer gets their system on time and stock stays right.*

The steps are: **Pending → Processing → Out for delivery → Delivered → Installed** (Installed only when the order needs installation). An order can be **Cancelled** any time before it is delivered.

1. Go to **Orders**. New orders are marked as new. Each order shows two statuses in their own columns: **Fulfilment** (where the order is: Pending, Processing, Out for delivery, Delivered, Installed or Cancelled) and **Payment** (Unpaid, Part-paid, Paid, Failed or Refunded). On phones, tablets and smaller laptop screens, both show under the customer's name (fulfilment as a badge, then "Payment: …"); tap the row to open the order. The tabs filter by fulfilment; use the drop-downs to filter by payment or channel (**Website** / **In store**).
2. Open the order and check the customer's name, phone, delivery address and items.
3. **Call the customer to confirm** the order and arrange payment.
4. Record payment (chapter 6, story 6.2).
5. Select **Mark as processing**. This **takes the items out of stock**.
6. When it leaves the store, select **Mark as out for delivery**, then **Mark as delivered** on arrival.
7. If it needs installation, turn on **Requires installation** and create a job (chapter 6, story 6.3). When every job is completed, the order becomes **Installed** automatically.
8. Add an **Internal note** if needed (only staff see it) and select **Save note**.

**Tips and common mistakes**

- If Processing fails with "Insufficient stock to process this order.", the page lists each short product. Restock these products, then try again.
- Cancelling an order that was already taken out of stock puts the stock back.
- Stock follows what the customer ordered at the time, even if the package's products were changed later.
- You can't turn off **Requires installation** while the order has jobs that aren't cancelled.

### Story 5.4: Follow up saved carts

*As an admin, I want to see carts customers saved but didn't order so that we can follow up.*

1. Go to **Carts**.
2. Search by name, email, phone or product, and open a cart to see its items and total.
3. Contact the customer using the details they left.

---

## 6. Sales rep

### Story 6.1: Record an in-store sale

*As a sales rep, I want to record a walk-in customer's purchase so that the sale, payment and stock are tracked with our website orders.*

In-store sales are for **products** (for example an inverter or batteries), not packages.

1. Go to **Orders** and select **New in-store sale**.
2. Enter the customer's **name** and **phone number** (email is optional).
3. Search for each product and add it. You'll see its price and stock. Set the **quantity** with the stepper.
4. Check the line totals and **subtotal**. Prices come from the catalogue; you can't type a price.
5. **Discount (optional):** enter the amount and a **reason** (for example "loyal customer" or "bulk purchase"). The reason is required whenever there is a discount.
6. Choose the fulfilment:
   - **Collected now:** the customer takes the goods today. Stock is taken out straight away and the order is saved as **Delivered**.
   - **Deliver or install later:** we deliver or install later. Enter the **delivery address**, and tick **Requires installation** if an engineer needs to install it. The order is saved as **Pending** and follows the normal steps (story 5.3).
7. Set the **payment status**: Unpaid, Part-paid or Paid.
8. Add a **note** if useful, check the total in the summary, and submit.

**What you'll see:** the new order's details, with an **In store** badge and your name as the creator.

**If you see "Insufficient stock"** (Collected now only):

- The page shows each product that is short, with how many are needed and how many are available.
- **No order was created and no stock changed.** Nothing needs undoing.
- Options: reduce the quantity, remove the product, choose **Deliver or install later**, or ask the inventory manager to check stock (the shelf may have stock that isn't recorded yet).

**Tips and common mistakes**

- The discount can't be more than the subtotal. The reason must be at least 3 characters.
- Discounts and reasons are recorded in the Activity log with your name.
- "Requires installation" only works with **Deliver or install later**.
- A delivery address is required for **Deliver or install later**.
- Archived products can't be sold. Ask the inventory manager if a product you need is missing.

### Story 6.2: Update payment status

*As a sales rep, I want to record payments so that everyone knows what the customer still owes.*

1. Open the order in **Orders**.
2. For full payment, select **Mark as paid**. For anything else, choose from **Payment status** and save.

| Status | Use when |
|---|---|
| Unpaid | Nothing paid yet |
| Part-paid | A deposit or part payment received |
| Paid | Paid in full (the date is recorded as "Paid on") |
| Failed | A payment attempt failed |
| Refunded | Money returned (only after Paid or Part-paid, and it's final) |

**Tip:** the list only offers the changes that are allowed from the current status.

**Refund due:** if an order is cancelled after it was Paid or Part-paid, the orders list and the order show **Refund due**. Give the customer their money back, then set payment to **Refunded** and the flag goes away.

### Story 6.3: Assign an engineer and create an installation job

*As a sales rep, I want to book an engineer for an installation so that the customer gets a date and the engineer knows what to do.*

1. Open the order and turn on **Requires installation**.
2. Optionally choose the **Assigned engineer** for the order.
3. Select **Create job**.
4. In **Create installation job**, fill in:
   - **Engineer** (optional; choose "Assign later" if not decided; only active engineers are listed)
   - **Scheduled for** (date and time)
   - **Estimated duration (minutes)**
   - **Checklist**: one task per line, for example "Mount inverter", "Connect batteries", "Test changeover", "Show customer how to use"
   - **Notes for the engineer**
5. Select **Create job**.

**What you'll see:** the job under the order and in **Installations**. The engineer sees it in **My jobs**.

**Tips and common mistakes**

- You can't create a job for a cancelled order or one that doesn't require installation.
- To change the engineer on a job that has already started, cancel that job and create a new one.
- Use **Installations** to filter jobs by status, engineer or dates, and to edit, reassign, cancel or delete a job. Started jobs can't be deleted.

### Story 6.4: Reply to customer messages

*As a sales rep, I want to answer enquiries from the website so that customers get a quick response.*

1. Go to **Messages**. New messages and customer replies are marked.
2. Open the message.
3. Write your reply. The **Subject** starts as "Re: Your message to Juwon Electric". Type the **Message** and select **Send reply**.
4. Set **Status** to **Contacted** (or **Completed** when done).

**What you'll see:** your reply in the conversation. When the customer answers the email, it appears as **Customer reply** and the message shows as new again.

**Tip:** if you see "Reply not sent", check the customer's email address and try again.

### Story 6.5: Record a return from a walk-in customer

*As a sales rep, I want to cancel an in-store sale when the customer brings the goods back so that the stock is put back on the shelf in the system.*

1. Go to **Orders** and filter by channel **In store**, or search for the customer.
2. Open the order. It shows **Delivered** if it was collected in the store.
3. In the status panel, choose **Cancel order**.
4. Read the message and confirm with **Cancel order**.
5. If you gave the customer their money back, change **Payment** to **Refunded**.

**What you'll see:** the order shows **Cancelled**, and every product on it goes back into stock. In **Inventory → Movements** each one appears as **Sale reversed**. The change is recorded in the Activity log with your name.

**Tips and common mistakes**

- Cancelling can't be undone. If the customer only returns part of the sale, cancel the order and record a new in-store sale for the items they keep.
- Cancelling doesn't change the payment status by itself. Update it yourself if money was returned.
- Only in-store sales can be cancelled after delivery. A delivered website order can't be cancelled; talk to an admin.
- If a product on the order was deleted since the sale, its stock can't be put back. The Activity log says "stock not restored for deleted product <SKU>". Ask the inventory manager to adjust the count.

---

## 7. Inventory manager

### Story 7.1: Create categories with specifications

*As an inventory manager, I want to group products and decide which specifications each group records so that product pages are consistent.*

1. Go to **Categories** and add a category.
2. Enter **Name**, optionally **Parent category** (or "None (top level)"), **Description**, **Image URL** and **Sort order** (lower numbers show first).
3. Under specifications, add one row per spec: **Key** (for example `capacityKwh`), **Label** (for example "Capacity"), **Type** (Text, Number or Yes / no) and **Unit** (for example "kWh").
4. Tick **Active** to show it on the website. Save.

**Tip:** a category that still has subcategories or products can't be deleted.

### Story 7.2: Add a product with specs

*As an inventory manager, I want to add products with prices and specs so that sales and the website show correct information.*

1. Go to **Products** and select **Add product**.
2. Fill in **SKU**, **Name**, **Brand**, **Category** and **Price (NGN)**. **Cost price (NGN)** is optional and only visible to admins.
3. Fill in the specifications for the category, and add any extra details.
4. Add image links, **Tags** (separated by commas) and a **Description**.
5. Set **Opening stock** and **Reorder level** (low-stock alerts start at this quantity).
6. Choose **Status**: Active (on the website), Hidden (admin only, can still be used in packages and in-store sales) or Archived (retired).
7. Select **Add product**.

**Tips and common mistakes**

- Each SKU must be unique.
- After creating a product, change stock only through **Inventory** (story 7.3), not the product form.
- Changing the price of a product used in packages shows "Used in N package options. Their prices will update." That is expected.

### Story 7.3: Receive stock, record damage or correct a count

*As an inventory manager, I want every stock change recorded with a reason so that stock levels can be trusted.*

1. Go to **Inventory** → **Stock levels**.
2. Find the product and select its adjust button.
3. Choose **Add stock** or **Remove stock** and enter the **Quantity**. The dialog shows what the stock becomes.
4. Choose a **Reason**:

| Reason | Use for |
|---|---|
| Restock | Goods received from a supplier |
| Return | A customer returned goods |
| Damage | Broken or faulty goods removed |
| Correction | Fixing a count after a stock-take |
| Adjustment | Anything else (add a note) |

5. Add a **Note** (for example the supplier invoice number) and save.

**What you'll see:** "Stock adjusted." and the new level. Every change is listed under **Movements**, including sales from orders (**Sale**) and cancelled orders (**Sale reversed**).

**Tip:** stock can't go below zero. If it would, count again and use **Correction**.

### Story 7.4: Watch for low stock

*As an inventory manager, I want to know early when products run low so that we reorder in time.*

1. In **Inventory**, filter by **Low stock** or **Out of stock**. Low-stock products are listed first.
2. When stock drops to or below a product's reorder level, a low-stock email goes to the **Low stock** list in Settings (if alerts are on).
3. To email the full low-stock list now, select **Run low-stock check**.

**Tip:** a reorder level of 0 only alerts when stock reaches zero. Set a sensible level for each product.

### Story 7.5: Build a package from products

*As an inventory manager, I want each package option to list its real products so that its price and contents always match the catalogue.*

> **Who does this:** packages are edited by **Super admin**, **Admin** and **Sales** accounts. Inventory managers don't edit packages. Your part is keeping products, prices and stock correct, because package prices update from them automatically. The steps below are for the staff who edit packages.

1. Go to **Packages** and open the package (or add one).
2. For each option (for example "Without solar" and "With solar"):
   1. Use the product search (type a name, SKU or brand) to add products. You'll see name, SKU, price, stock and status. Archived products are shown but can't be added.
   2. Set the **quantity** for each (and a short note if useful). Remove any wrong row.
   3. Read the **Products total** (worked out from current prices).
   4. Set the **Price adjustment (₦)** agreed with the owner: choose **+** or **−**, then type the amount.
   5. Check the **Public price** in bold.
   6. Check the stock hint: **In stock**, or **Short: <SKU>** if a product doesn't have enough for one package.
3. Save.

**What you'll see:** in the package list, each option shows its public price and a **Composed** badge. Options still priced by hand show **Manual price**.

**On the website:** customers see the option price and a "What's included" list with each product's quantity, name, brand and key specs. They don't see the products total or adjustment.

**Tips and common mistakes**

- Each product can appear only once per option. Increase the quantity instead.
- Archived products can't be added.
- If the public price would be ₦0 or less, the package won't save. Check the adjustment.
- Orders use each package's own products to take stock out. A package with no products doesn't move stock.

### Story 7.6: Understand what archiving a product does to packages

*As an inventory manager, I want to know the effect of archiving a product so that I don't remove packages from sale by accident.*

- **Archiving** a product used in packages shows a warning first. If you confirm, every option that uses it becomes **unavailable**: it disappears from the website and can't be added to a cart or ordered. A package with no available option shows "Currently unavailable — contact us".
- To make the option available again, replace the archived product in the package (or set the product back to Active or Hidden).
- **Deleting** a product that any package uses is blocked with "Product is used by a package." Remove it from the packages first, or archive it instead.
- **Hidden** products stay usable in packages and in-store sales. They just don't have their own product page.

---

## 8. Engineer

Use **My jobs** on your phone on site. It shows only jobs assigned to you.

### Story 8.1: See my jobs for the day

*As an engineer, I want a clear list of my installations so that I know where to go and whom to call.*

1. Sign in on your phone. **My jobs** opens.
2. Use **Active** (to do) or **Completed** (done).
3. Each card shows the customer, address, scheduled time (for example "Today, 1:00 pm") and checklist progress. Tap to open.
4. Use the address and phone buttons to get directions or call the customer.

### Story 8.2: Start a job and tick the checklist

*As an engineer, I want to record progress as I work so that the office knows the status without calling me.*

1. Open the job and tap **Start job** when you begin on site.
2. Tick each **Checklist** item as you finish it. Each tick saves immediately.
3. Read the office's notes at the bottom of the job.

### Story 8.3: Add photos and completion notes, then complete

*As an engineer, I want to leave evidence and notes so that the office can close the order.*

1. Add a photo by pasting its link in **Photo URL**. Photos are added as links for now.
2. Type what you did and anything the office should know in **Notes for the office**, and save.
3. When **every** checklist item is ticked, tap **Mark complete**.

> **Warning: completing a job can't be undone.** After you mark it complete you can no longer change the checklist, photos or notes. Check everything first.

**What you'll see:** "Job marked complete." The job moves to **Completed**. When all jobs for a delivered order are complete, the order becomes **Installed** automatically.

**Tips and common mistakes**

- **Mark complete** stays greyed out until every checklist item is ticked.
- If a job disappears from your list, the office may have reassigned or cancelled it. Call the office.
- If you're signed out on site, sign in again. Sessions end after 8 hours, or after 2 hours without use.

---

## 9. HR

### Story 9.1: Create a vacancy

*As an HR officer, I want to post a job opening with a clear description so that suitable people apply.*

1. Go to **Vacancies** and select **New vacancy**.
2. Fill in **Title** (required), **Department**, **Location**, **Employment type** (Full-time, Part-time, Contract, Internship, Temporary) and **Salary range** (for example "₦250,000 – ₦350,000 monthly").
3. Write the **Description** (story 9.2).
4. Add **Responsibilities** and **Requirements**, one per line (up to 30 each).
5. Leave **URL slug** blank to create it from the title.
6. Choose **Status**: **Draft (not public)** or **Open (publish now)**.
7. Select **Save draft** or **Publish vacancy**.

### Story 9.2: Format the description

*As an HR officer, I want headings, bold text and lists so that the job description is easy to read.*

The description editor's toolbar offers:

- headings (three sizes)
- **bold**, *italic*, underline and strikethrough
- quotes, numbered lists and bullet lists
- links, and a button to clear formatting

**Tips**

- Paste as plain text if formatting from Word looks odd, then format it again in the editor.
- Images, tables and colours are not kept. The website shows only the formatting above, for safety.
- Links open in a new tab on the website.

### Story 9.3: Publish, unpublish, close and reopen

*As an HR officer, I want to control when a vacancy is public so that candidates only see roles we are hiring for.*

| Action | Button | Result |
|---|---|---|
| Publish | **Publish** | Status **Open**; shown on the careers page with today's posted date (the first time) |
| Unpublish | **Unpublish (back to draft)** | Back to **Draft**; hidden from the website |
| Close | **Close (no longer hiring)** | Status **Closed**; hidden from the website |
| Reopen | **Reopen** | Open again |
| Delete | **Delete** | Removed permanently; its web link is freed |
| View | **View on the careers page** | Opens the public page (open vacancies only) |

**Tips and common mistakes**

- A **draft can't be closed** directly. Publish it first, or just delete it.
- Changing the URL slug changes the public link, so old shared links stop working.
- Candidates apply by email, to the business email in Settings, with the subject "Application: <job title>".
- If a **Vacancies** email list is set in Settings, those addresses are emailed when a vacancy is first published.

### Story 9.4: Keep staff profiles up to date

*As an HR officer, I want engineers' coverage areas and certifications recorded so that the office assigns the right person.*

1. Go to **Staff & roles** → **Team** and open a profile.
2. Select **Edit profile** and update **Phone**, **Areas covered**, **Certifications**, **Bio** and **Photo URL**.
3. Select **Save profile**.

**Tip:** roles and account status are managed on the **Accounts** tab by the owner or an admin.

---

## 10. Support

### Story 10.1: Handle new messages

*As a support agent, I want to see new enquiries quickly so that no customer waits.*

1. Watch for the new activity banner, or go to **Messages**.
2. Filter by status (**New**, **Contacted**, **Completed**) or search.
3. Open a message. Opening it marks it as read for you.

### Story 10.2: Reply and track the conversation

*As a support agent, I want to reply by email from the console so that the whole conversation stays with the enquiry.*

1. Open the message and write your reply (**Subject**, **Message**), then select **Send reply**.
2. Set **Status** to **Contacted**. When the matter is resolved, set **Completed**.
3. When the customer replies to your email, their answer appears in the conversation as **Customer reply**, and the banner shows "new customer reply".

**Tips**

- **Replies sent** shows how many replies staff have sent on that message.
- Use **Show full email** to see a long customer email in full.
- Look up the customer's order in **Orders**, their saved cart in **Carts**, or their installation in **Installations** before replying. Support can view these but not change them. Pass changes to a sales rep or admin.

### Story 10.3: Manage newsletter subscribers

*As a support agent, I want an accurate subscriber list so that updates only go to people who want them.*

1. Go to **Newsletter**.
2. Filter by **Active** or **Inactive**, or search by name or email.
3. To stop emails to someone who asked, turn their subscription off on their row (they show as **Inactive**). Use **Delete subscriber** only to remove the record completely; this can't be undone.

**Tip:** people join from the sign-up box in the website footer. Signing up again with the same email makes them active again.

---

## 11. Customer (public website)

This chapter describes the public website for customers. Staff can use it to guide customers on the phone.

The top menu has **Packages**, **Products**, **Services**, **Our work**, **Careers** and **Contact**, plus the **cart** button with a count.

### Story 11.1: Browse packages

*As a customer, I want to find a package that suits my home or business so that I get reliable power.*

1. Select **Packages** (or **Shop packages** on the home page).
2. Filter by battery type (tubular, lithium, hybrid lithium) and inverter size (kVA), or sort by price.
3. Each card shows the name, kVA, voltage, what it can power, the starting price ("from ₦…"), whether a solar option exists, and how many items are included.

### Story 11.2: Compare options and see what's included

*As a customer, I want to see exactly what each option contains so that I know what I'm paying for.*

1. Open a package.
2. Under **Choose an option**, pick an option (for example without or with solar). The price updates.
3. Read **What's included**: each product's quantity, name (tap it for details), brand and key specs.
4. Check the stock hint: **In stock**, or **Available to order** ("We'll confirm a delivery date when we call.").

### Story 11.3: Browse products and specs

*As a customer, I want to check the specifications of inverters, batteries and panels so that I can compare them.*

1. Select **Products**. Use the category list or search.
2. Open a product to see photos, brand and SKU, price, stock status, a specifications table and the description.
3. See **Included in these packages** to buy it as part of a package, or **Ask about this product** to send an enquiry about it.

**Note:** single products can't be bought online yet. Buy a package, send an enquiry, or visit the store.

### Story 11.4: Add to cart and check out

*As a customer, I want to order a package online so that Juwon Electric can deliver and install it.*

1. On a package, choose the option and select add to cart. A message offers **View cart**.
2. In the **cart**, change quantity (up to 100), switch with/without solar, or remove items. Prices are checked with the latest prices, and anything no longer available is flagged.
3. Select **Checkout** and enter your name, phone, email and delivery address.
4. Read the **payment note**:
   - If online payment is off: "No payment now: we'll call to confirm and arrange payment."
   - If online payment is on: "You'll receive a secure payment link after we confirm your order."
5. Complete the quick security check and place the order.

**Tips:** a cart can hold up to 50 lines, and it is saved in your browser.

### Story 11.5: What happens after ordering

*As a customer, I want to know what happens next so that I'm ready for delivery and installation.*

The **Order received** page shows your order summary and these steps:

1. **Confirmation call:** we call to confirm your package and delivery address, and arrange payment (or send a secure payment link).
2. **Processing:** we prepare your equipment from stock.
3. **Out for delivery:** our team brings your order to your address.
4. **Delivered:** your order arrives and we check everything is complete.
5. **Installation:** our engineers install and test the system and show you how to use it.

### Story 11.6: Apply for a job

*As a job seeker, I want to see open roles and apply so that I can work with Juwon Electric.*

1. Select **Careers**. Filter by department or employment type.
2. Open a vacancy to read the description, responsibilities and requirements.
3. Select **Apply by email**. Your email app opens with the subject "Application: <job title>". Attach your CV and send.

### Story 11.7: Contact the team

*As a customer, I want to ask a question so that I get advice before buying.*

1. Select **Contact** (or **Talk to an engineer**, or **Ask about this product** on a product page, which fills in the topic).
2. Enter your name, phone, email and message, complete the security check and send.
3. The page also shows the business phone, email and address.
4. To get updates, subscribe with your email in the website footer.

---

## 12. How updates reach the website

When staff change something in the admin console (a price, a product, a package, a service, a vacancy, stock or business details):

- **Next page view:** anyone who opens or reloads the page sees the change straight away.
- **Pages already open:** refresh by themselves within **about a minute**, and when the customer returns to the tab.
- **Same browser:** if the admin console and the website are open in the same browser, the website updates **immediately**. This is a handy way to check your change.
- Open pages don't refresh while someone is typing in a form, so a customer filling in checkout isn't interrupted.
- If the system is briefly down, the website keeps showing the last good version of each page.

---

## 13. Troubleshooting

| Problem | Why it happens | What to do |
|---|---|---|
| **Signed out unexpectedly** | Sessions last at most **8 hours**, and end after **2 hours without activity**. Resetting your password or being deactivated also signs you out. | Sign in again. If it says your account is inactive, contact the owner. |
| **"You do not have permission to perform this action."** | Your role doesn't include that action, or your role was just changed. | Refresh the page. If you need the action, ask the owner to review your role (see the table in chapter 1). |
| **A package price looks wrong** | Composed prices = products total + adjustment. A product's price may have changed, a quantity may be wrong, or the adjustment may be set. | Open the package and check each product's price and quantity, the **Products total** and the **Price adjustment (₦)**. Options marked **Manual price** don't follow product prices: add products to them. |
| **A package disappeared from the website** | One of its products was archived, so the option became unavailable. Or the package is hidden. | Replace the archived product, or check **Show on the shop**. |
| **Stock doesn't move when orders are processed** | The package has **no products yet** (manual price option), so there is nothing to take out of stock. | Build the package from products (chapter 7, story 7.5). Correct any past counts in Inventory with the reason **Correction**. |
| **"Insufficient stock to process this order."** | Recorded stock is lower than the order needs. | Restock or correct the count in Inventory, then try again. For in-store sales, no order was created. |
| **A change isn't showing on the website** | Open pages refresh within about a minute. | Reload the page. If it still doesn't show, check the item is set to show (for example "Show on the shop", Active status, or vacancy Open). |
| **Invite or reset token doesn't work** | Tokens expire after 30 minutes and work once. | Use **Forgot password?** to get a new one. |

---

## 14. Keeping this guide current

This guide is a living document. **Update it in the same change as every feature** that affects what staff or customers see or do:

- Add or change the steps in the right persona chapter, using the exact button and field names from the console.
- Update the roles table in chapter 1 if permissions change.
- Mark anything not yet available as such, and don't describe features that don't exist.
- Keep the language plain. Readers are busy staff, not developers.
- Add a dated entry to the change log below, and update the matching section of `PRODUCT_REQUIREMENTS.md`.

### Change log

**2026-09-17 (orders list)**
- Orders: fulfilment and payment now have separate labelled columns; payment labels are Unpaid and Part-paid; cancelled orders that were paid show **Refund due** (stories 5.3 and 6.2).

**2026-09-17 (later)**
- Sales rep: added Story 6.5, recording a return by cancelling a delivered in-store sale (stock goes back; update payment to Refunded if money is returned).
- Inventory manager: Story 7.5 now states that inventory managers don't edit packages (owner decision).

**2026-09-17**
- First version of the guide.
- Covers: sign-in and password reset; the roles table; Owner/Super admin (invites, roles, deactivation, Settings, dashboard, package price adjustment, activity log); Admin (services, customer segments, portfolio, order handling, carts); Sales rep (in-store sales with Collected now / Deliver or install later, discount with reason, insufficient stock, payment status, engineer assignment and installation jobs, message replies); Inventory manager (categories, products with specs, stock adjustments, low stock, composing packages, archiving); Engineer (My jobs); HR (vacancies and staff profiles); Support (messages, replies, newsletter); Customer (the new public website); how updates reach the website; troubleshooting.
