# How to use the Juwon Electric platform

Last updated: 2026-09-17 (Upload follow-ups)

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
    - [10A. Website content](#10a-website-content)
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
| **Engineer** | Field engineers | **My jobs** only: installations where you are on the crew, checklist, photos and notes. |
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
| Website | FAQs, Reviews, Client logos, Team |
| Customers | Messages, Newsletter |
| Team | Vacancies, Staff & roles |
| System | Activity, Settings |

- **Refresh data** (the circular arrow at the top) reloads the page's information.
- **New activity banner:** when new customer messages, customer replies or orders arrive, a banner says, for example, "You have 2 new messages and 1 new order." Open an item to mark it as read, or select **Mark all as read**. Your read status is saved to your account, so it follows you to other devices.
- **Signing out:** use the account menu at the top.

### Finding your way around Settings

**Settings** (in the **System** group) opens **Business profile**. Every settings page lists the other pages beside it, grouped like this.

| Group | Pages |
|---|---|
| Business | Business profile |
| Communication | Notification emails |
| Sales | Payments, Inventory |
| Website | Homepage & contact, Financing, Load calculator |

In this guide, a path such as **Settings → Website → Homepage & contact** means: open **Settings**, then **Homepage & contact** under **Website** in that list.

- **Moving between settings pages:** on a computer, the list on the left of each settings page jumps straight to another page. On a phone or tablet, use the row of buttons above the page (swipe it sideways to see them all). There is no separate overview page — the list is always beside the page you are on.
- **Saving:** each page saves on its own. As soon as you change something, a bar appears at the bottom with "Unsaved changes". Select **Save changes** to save, or **Discard** to put back what was saved.
- **Leaving with unsaved changes:** if you open another page before saving, the console asks "You have unsaved changes. Leave without saving?" Select **Keep editing** to go back and save, or **Leave without saving** to drop the changes. Closing or reloading the browser tab asks the same through the browser.
- **View only:** staff who can view but not change Settings see the same pages with greyed-out fields and no save bar.

### Adding images

Every form with a picture (products, categories, services, portfolio, customer segments, reviews, client logos, team members, staff profiles and job photos) lets you upload an image from your computer or phone.

1. In the image field, select **Choose image** (**Choose images** on products), or drag the file from your computer and drop it on the box that says "Drag an image here, or choose one."
2. Wait while the field shows **Preparing image…** and then **Uploading…** with a progress bar. To stop, select the cross (**Cancel**).
3. When it's done you'll see a small preview. Select **Replace** to use a different picture, or **Remove** to clear it.
4. Save the form as usual. The picture shows on the website once the form is saved.

**Which files work:** JPEG, PNG and WebP pictures. Photos straight from a phone camera are fine. Other files, such as SVG drawings, PDFs or documents, aren't accepted.

**Big photos are shrunk automatically.** Before uploading, the console makes large photos smaller so the website stays fast. You don't need to resize anything first. Logos with a transparent background stay transparent.

**Using a link instead:** select **Use an image link instead** and type an `https://` link, or a path to a picture already on our website starting with `/` (for example `/panel-4.webp`). Older items that already use a link keep working. If a form shows only a link box and no **Choose image** button (on products, an **Add image** button), uploading isn't available right now: type a link, or try again later.

**If an upload fails**, the message under the field tells you what to do:

| Message | What to do |
|---|---|
| "That file isn’t an image. Choose a JPEG, PNG or WebP image." or "Upload a JPEG, PNG or WebP image." | Choose a JPEG, PNG or WebP picture. If you only have another kind of file, open it and save or export it as JPEG or PNG first. |
| "Couldn’t read that image. Choose a JPEG, PNG or WebP image." | The file may be damaged or in a format the browser can't open. Save it again as JPEG or PNG, or choose another picture. |
| "That image is over 15 MB. Choose a smaller image." | Choose a smaller copy of the picture (for example, send it to yourself on WhatsApp or email and save that copy). |
| "That file is empty. Choose another image." | The file has nothing in it, often because it didn't finish downloading. Download or save it again, or choose another picture. |
| "Couldn’t make that image small enough to upload. Choose a different image." or "Image must be 2 MB or smaller." | Choose a different, simpler picture, or a smaller copy of it. |
| "Couldn’t upload the image. Try again." | Check your internet connection and try again. |
| "You’ve uploaded a lot of images in a short time. Wait a few minutes, then try again." | You've uploaded many pictures in the last few minutes. Wait a few minutes, then choose the picture again. Pictures that already uploaded are kept. |
| "Image uploads are unavailable right now. Please use an image link or try again later." | The link box opens for you. Use an image link instead, or try uploading again later. |

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

Each of these is its own page in Settings (see [Finding your way around Settings](#finding-your-way-around-settings)). On each page, select **Save changes** in the bar at the bottom before moving on.

1. **Settings → Business → Business profile:** under **Company details**, fill in **Business name** and **Website**; under **Contact details**, fill in **Email address**, **Phone** and **Address**. These show on the public website and in customer emails. Select **Save changes**.
2. **Settings → Communication → Notification emails:** add email addresses on the **New orders**, **Low stock** and **Vacancies** cards (up to 10 each). Type an address and select **Add**. Select **Save changes**.
3. **Settings → Sales → Payments:** turn on **Accept online payments** only when a **Payment provider** (Paystack or Flutterwave) is set up. When off, customers order and pay by transfer or on delivery after your call. Select **Save changes**.
4. **Settings → Sales → Inventory:** set the **Default reorder level** for new products and switch **Send low-stock alerts** on or off. Select **Save changes**.

**Tips and common mistakes**

- If the New orders or Low stock list is empty, alerts go to the server's default address set up by your developer.
- Staff other than Super admin and Admin see Settings as **View only**.
- An address typed in the box but not added with **Add** isn't saved.
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

### Story 4.7: Sign off website content before launch

*As the owner, I want to be sure no sample content is on the live website so that customers only see true information.*

The website was built with **sample content** (made-up FAQs, reviews, client logos, team members with drawn placeholder portraits, stats, financing terms and calculator settings) so that every section could be seen. None of it is real.

1. Work through **story 10A.8, Replace sample content before launch**, or ask an admin to.
2. Tick off every item on the **Before launch checklist** in `PRODUCT_REQUIREMENTS.md` (section 11).
3. Check that no **Sample** badge or sample banner is left in the admin, and no "Sample" label is left on the website. This includes **Website → Our Team** and the **Our Team** page (`/team`): the 12 sample team members are made-up people and must be replaced with the real team (story 10A.9).
4. Decide whether **Financing** and the **Calculator** should be on at launch (stories 10A.6 and 10A.7). If you're not sure, leave them off.

**Tip:** website settings (stats, WhatsApp, business hours, financing, calculator) can only be changed by Super admin and Admin accounts.

---

### Story 4.8: Check how the website looks when someone shares the link

*As the owner, I want a link to our website to look right when it is pasted into WhatsApp, Instagram or Facebook, so that we look like a real company.*

When anyone shares a link to the site, the chat app shows a preview card: a picture, the page title and a short description. Ours shows one of our own rooftop installations with the headline over it.

1. Paste `https://www.juwonelectric.com` into a WhatsApp chat with yourself and wait a second for the preview to appear.
2. You should see the photo card, the page name and the description. If you see only a plain link with no picture, tell the developer.

**Use the `www.`** The short version, `juwonelectric.com` with no `www`, does not currently work and will look broken to whoever you send it to. Always share the `www.` address, including in your Instagram and TikTok bio.

Changing the preview picture, title or description is a developer change, not a setting in the admin.

---

## 5. Admin

Admins can do everything in chapters 4, 6, 7, 9 and 10, except managing Super admin and Admin accounts. This chapter covers website content and handling an order from start to finish.

### Story 5.1: Update services

*As an admin, I want to keep the Services page accurate so that customers know what we offer.*

1. Go to **Services**.
2. To add a service, select **Add service**. To change one, select **Edit** on its row.
3. Fill in **Title** and **Description**. For **Image**, select **Choose image** or drag a photo onto the box (see [Adding images](#adding-images)); or select **Use an image link instead** and type a path such as `/panel-4.webp` or a full `https://` link. Optionally fill in **Button label** and **Button link**.
4. Tick **Show on the Services page** to make it public. Save.

**Tip:** untick "Show on…" to hide an item without deleting it.

The **Industries We Serve** and **Solutions by Scale** sections on the home and Services pages are a fixed list built into the site, so there is nothing to manage for them here.

### Story 5.2: Add work to the portfolio

*As an admin, I want to show completed installations so that customers trust our work.*

1. Go to **Portfolio** and add a project.
2. Enter **Name**, upload the project photo under **Image** with **Choose image** or drag and drop (or select **Use an image link instead**), and optionally add an **External link** (for example the Instagram post).
3. Choose where it shows: **Featured on the home page**, **Show on mobile**, **Show on the Portfolio page**. Save.

**Tip:** to show a project as a case study on the home page, also fill in **Summary**, **Location** and **Amount** (chapter 10A, story 10A.4).

### Story 5.3: Handle a website order from start to finish

*As an admin, I want to move each order through its steps so that the customer gets their system on time and stock stays right.*

The steps are: **Pending → Processing → Out for delivery → Delivered → Installed**. An order can be **Cancelled** any time before it is delivered.

1. Go to **Orders**. New orders are marked as new. Each order shows two statuses in their own columns: **Fulfilment** (where the order is: Pending, Processing, Out for delivery, Delivered, Installed or Cancelled) and **Payment** (Unpaid, Part-paid, Paid, Failed or Refunded). On phones, tablets and smaller laptop screens, both show under the customer's name (fulfilment as a badge, then "Payment: …"); tap the row to open the order. The tabs filter by fulfilment; use the drop-downs to filter by payment or channel (**Website** / **In store**).
2. Open the order and check the customer's name, phone, delivery address and items.
3. **Call the customer to confirm** the order and arrange payment.
4. Record payment (chapter 6, story 6.2).
5. Select **Mark as processing**. This **takes the items out of stock**.
6. When it leaves the store, select **Mark as out for delivery**, then **Mark as delivered** on arrival.
7. Website orders that include a package start with **Requires installation** already on, because packages come with installation. Create a job for it (chapter 6, story 6.3). If the customer doesn't need our installation (for example they have their own installer), turn **Requires installation** off before creating any job. When every job is completed, the order becomes **Installed** automatically. If the installation was done without a job, open the delivered order and select **Mark as installed**. If **Requires installation** wasn't on, you'll be asked to confirm and it's turned on for you.
8. Add an **Internal note** if needed (only staff see it) and select **Save note**.

**Tips and common mistakes**

- If Processing fails with "Insufficient stock to process this order.", the page lists each short product. Restock these products, then try again.
- Cancelling an order that was already taken out of stock puts the stock back.
- Stock follows what the customer ordered at the time, even if the package's products were changed later.
- You can't turn off **Requires installation** while the order has jobs that aren't cancelled.
- Website orders with only products (no package) start with **Requires installation** off. Turn it on if the customer wants us to install them.
- Website orders can now include single products as well as packages. Product lines show the product name, SKU, quantity and price.

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
2. Enter the customer's **name**, **phone number** and **email** if they give them. All three are optional ("Leave blank for walk-in customers.").
   - If you leave the name blank, the sale is saved as **Walk-in customer**, and the summary, order and Activity log show that name.
   - If you leave the phone blank, the order shows **No phone**.
3. Click or tap the product search. The first 20 products (A to Z) appear straight away, so you can pick one without typing. Or type a name, SKU or brand to narrow the list. You'll see each product's price, stock and status. Use the arrow keys and Enter to pick, or Esc to close the list. Set the **quantity** with the stepper.
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
- If you type a phone number, it must be a valid number. Leave it blank rather than typing a made-up one.
- For **Deliver or install later**, try to take a phone number, so the office and engineers can call the customer.
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

*As a sales rep, I want to book an engineer or a crew of engineers for an installation so that the customer gets a date and everyone on the crew knows what to do.*

**One job per order:** each order can have only one installation job. If the order already has a job (that isn't cancelled), **Create job** is hidden and the order shows "This order already has an installation job." with a link to the job. Open that job to change it instead.

1. Open the order and make sure **Requires installation** is on (website orders with a package start with it on).
2. Optionally choose the **Assigned engineer** for the order.
3. Select **Create job**.
4. In **Create installation job**, fill in:
   - **Engineers** (optional; leave empty to assign later; only active engineers are listed):
     - Search for an engineer and select them. Each one appears as a chip. Add up to **10** engineers.
     - The first engineer is marked **Lead**. To make someone else the lead, use the make-lead option on their chip.
     - To take someone off, select the remove button (**×**) on their chip.
     - If you leave it empty and the order has an **Assigned engineer**, the job starts with that engineer.
   - **Scheduled for**: select the field to open the calendar.
     - Pick the day. Use the arrows to change month. Today is highlighted, and past days are marked but can still be picked.
     - Pick the time. Times go in 15-minute steps (for example 9:00 AM, 9:15 AM) and are Lagos time.
     - The field then shows the date and time, for example "Thu 18 Sep 2026, 10:30 AM". Select **Clear** to remove it.
   - **Estimated duration**: choose the **hours** (0 to 24) and the **minutes** (0, 15, 30 or 45). It shows, for example, "2 h 30 min". The shortest duration is 15 minutes. Use **Clear** if you don't know yet.
   - **Checklist**: one task per line, for example "Mount inverter", "Connect batteries", "Test changeover", "Show customer how to use"
   - **Notes for the engineer**
5. Select **Create job**.

**What you'll see:** the job under the order, with every engineer listed (lead first), and in **Installations**. Every engineer on the crew sees it in **My jobs** and gets a job-assigned notification.

**Changing the crew:** open the job in **Installations** (or from the order), edit it, and add, remove or reorder engineers the same way. Only engineers you **add** get a new notification; the others aren't notified again.

**Tips and common mistakes**

- You can't create a job for a cancelled order or one that doesn't require installation.
- You can't add the same engineer twice ("Each engineer can be added once.") or more than 10 ("A job can have at most 10 engineers.").
- Only active accounts with the Engineer role can be added ("Assignee must be an active engineer.").
- To change the crew on a job that has already started, cancel that job and create a new one. Cancelling the job makes **Create job** show again on the order.
- If you see "This order already has an installation job.", someone else created one first. Refresh the order and open the existing job.
- Use **Installations** to filter jobs by status, engineer (finds every job the engineer is on, as lead or crew) or dates, and to edit, reassign, cancel or delete a job. Started jobs can't be deleted.

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
2. Enter **Name**, optionally **Parent category** (or "None (top level)"), **Description**, an **Image** (select **Choose image** or drag one in, or use an image link) and **Sort order** (lower numbers show first).
3. Under specifications, add one row per spec: **Key** (for example `capacityKwh`), **Label** (for example "Capacity"), **Type** (Text, Number or Yes / no) and **Unit** (for example "kWh").
4. Tick **Active** to show it on the website. Save.

**Tip:** a category that still has subcategories, products or **packages** can't be deleted ("Category has subcategories, products or packages."). Move the products and packages to another category first (packages are moved by the staff who edit packages, story 7.5).

**On the website:** a category's page lists its packages under "Packages in <category>" above its products, including packages in its subcategories.

### Story 7.2: Add a product with specs

*As an inventory manager, I want to add products with prices and specs so that sales and the website show correct information.*

1. Go to **Products** and select **Add product**.
2. Fill in **SKU**, **Name**, **Brand**, **Category** and **Price (NGN)**. **Cost price (NGN)** is optional and only visible to admins.
3. Fill in the specifications for the category, and add any extra details.
4. Add **Images** (up to 10):
   - Select **Choose images**, or drag several photos onto the box ("Drag images here, or choose them."). They upload one after another, in the order you chose them.
   - The first image has a **Main** badge. It's the one customers see first. Use **Move up** and **Move down** on a row to change the order.
   - On each row, **Replace** swaps the picture, **Edit link** shows its link, and **Remove** takes it off.
   - On a computer or tablet the row buttons show their names. On a phone they are icons only: up arrow (**Move up**), down arrow (**Move down**), circular arrows (**Replace**), pencil (**Edit link**) and bin (**Remove**).
   - To add a picture by link, select **Use an image link instead** and type the link.
5. Add **Tags** (separated by commas) and a **Description**.
6. Set **Opening stock** and **Reorder level** (low-stock alerts start at this quantity).
7. Choose **Status**: Active (on the website), Hidden (admin only, can still be used in packages and in-store sales) or Archived (retired).
8. Select **Add product**.

**Tips and common mistakes**

- Each SKU must be unique.
- A product can have up to 10 images. If you choose more than fit, the first ones are added and a message says how many ("Only 2 more images fit, so the first 2 were added."). Remove one to add another.
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
2. When stock drops to or below a product's reorder level, a low-stock email goes to the **Low stock** list in **Settings → Communication → Notification emails** (if **Send low-stock alerts** is on in **Settings → Sales → Inventory**).
3. To email the full low-stock list now, select **Run low-stock check**.

**Tip:** a reorder level of 0 only alerts when stock reaches zero. Set a sensible level for each product.

### Story 7.5: Build a package from products

*As an inventory manager, I want each package option to list its real products so that its price and contents always match the catalogue.*

> **Who does this:** packages are edited by **Super admin**, **Admin** and **Sales** accounts. Inventory managers don't edit packages. Your part is keeping products, prices and stock correct, because package prices update from them automatically. The steps below are for the staff who edit packages.

1. Go to **Packages** and open the package (or add one).
2. Choose a **Category** from the catalogue, for example "Lithium" or "Inverters" (required since 2026-09-18; it replaced the old **Battery type** field). Subcategories are indented under their parent. Create missing ones under **Categories** first. The website groups and filters packages by this category.
3. For each option (for example "Without solar" and "With solar"):
   1. Click or tap the product search: the first 20 products (A to Z) appear straight away. Pick one, or type a name, SKU or brand to narrow the list. You'll see name, SKU, price, stock and status. Archived products are shown but can't be added.
   2. Set the **quantity** for each (and a short note if useful). Remove any wrong row.
   3. Read the **Products total** (worked out from current prices).
   4. Set the **Price adjustment (₦)** agreed with the owner: choose **+** or **−**, then type the amount.
   5. Check the **Public price** in bold.
   6. Check the stock hint: **In stock**, or **Short: <SKU>** if a product doesn't have enough for one package.
4. Save.

**What you'll see:** in the package list, each option shows its public price and a **Composed** badge. Options still priced by hand show **Manual price**.

**On the website:** customers see the option price and a "What's included" list with each product's quantity, name, brand and key specs. They don't see the products total or adjustment. If you chose a category, the package page shows it, and the package is listed on that category's page under "Packages in <category>".

**Tips and common mistakes**

- Each product can appear only once per option. Increase the quantity instead.
- Archived products can't be added.
- If the public price would be ₦0 or less, the package won't save. Check the adjustment.
- Orders use each package's own products to take stock out. A package with no products doesn't move stock.
- A category used by a package can't be deleted. Change the package's category first.

### Story 7.6: Understand what archiving a product does to packages

*As an inventory manager, I want to know the effect of archiving a product so that I don't remove packages from sale by accident.*

- **Archiving** a product used in packages shows a warning first. If you confirm, every option that uses it becomes **unavailable**: it disappears from the website and can't be added to a cart or ordered. A package with no available option shows "Currently unavailable — contact us".
- To make the option available again, replace the archived product in the package (or set the product back to Active or Hidden).
- **Deleting** a product that any package uses is blocked with "Product is used by a package." Remove it from the packages first, or archive it instead.
- **Hidden** products stay usable in packages and in-store sales. They just don't have their own product page and can't be bought on their own online.
- **Only Active products with stock** can be added to a cart on the website. Setting a product to Hidden or Archived, or stock reaching zero, stops online sales of it straight away; carts that already hold it show it as unavailable.

---

## 8. Engineer

Use **My jobs** on your phone on site. It shows only jobs where you are on the crew, whether you are the lead or not.

### Story 8.1: See my jobs for the day

*As an engineer, I want a clear list of my installations so that I know where to go and whom to call.*

1. Sign in on your phone. **My jobs** opens.
2. Use **Active** (to do) or **Completed** (done).
3. Each card shows the customer, address, scheduled time (for example "Today, 1:00 pm") and checklist progress. Tap to open.
4. If other engineers are on the job, the card shows **With:** and their names (for example "With: Tunde Bello, Chika Obi"). Call them to agree who brings what.
5. Use the address and phone buttons to get directions or call the customer.

### Story 8.2: Start a job and tick the checklist

*As an engineer, I want to record progress as I work so that the office knows the status without calling me.*

1. Open the job and tap **Start job** when you begin on site.
2. Tick each **Checklist** item as you finish it. Each tick saves immediately.
3. Read the office's notes at the bottom of the job.

**Working as a crew:** everyone on the crew can start the job, tick the checklist, add photos and notes, and mark it complete, not only the lead. Everyone sees the same job, so once a teammate has ticked an item or started the job, you'll see it too after a refresh. Agree on site who updates the phone so you don't undo each other's ticks.

### Story 8.3: Add photos and completion notes, then complete

*As an engineer, I want to leave evidence and notes so that the office can close the order.*

1. Under **Photos**, tap **Add photos**. Your phone offers to take a photo with the camera or choose photos you already have; you can pick several. On a computer you can also drag photos onto the box.
   - Each photo shows "Preparing image…", then "Uploading…", and is added to the job as soon as it's uploaded ("Photo added.", or for example "3 photos added."). To stop, tap the cross (**Cancel**).
   - Each photo shows as a small picture in the list. Tap one to open it, or the bin to remove it.
   - A job can have up to 20 photos. If you pick more than fit, only the first ones are added and a message says so.
   - No signal, or uploads not working? Tap **Use a photo link instead**, paste a link to the photo in **Photo link** and tap **Add photo link**. If the screen shows only **Photo link** and no **Add photos** button, uploading isn't available right now: use a link, or try again later.
2. Type what you did and anything the office should know in **Notes for the office**, and save.
3. When **every** checklist item is ticked, tap **Mark complete**.

> **Warning: completing a job can't be undone.** After you mark it complete you can no longer change the checklist, photos or notes. Check everything first.

**What you'll see:** "Job marked complete." The job moves to **Completed**. When all jobs for a delivered order are complete, the order becomes **Installed** automatically.

**Tips and common mistakes**

- **Mark complete** stays greyed out until every checklist item is ticked.
- If a photo won't upload, read the message under the photo box and see [Adding images](#adding-images).
- If a job disappears from your list, the office may have taken you off the crew, reassigned it or cancelled it. Call the office.
- When you are added to a job, you get a job-assigned notification. You're not notified again if the office only changes other crew members.
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
- Candidates apply by email, to the business email in **Settings → Business → Business profile**, with the subject "Application: <job title>".
- If a **Vacancies** email list is set in **Settings → Communication → Notification emails**, those addresses are emailed when a vacancy is first published.

### Story 9.4: Keep staff profiles up to date

*As an HR officer, I want engineers' coverage areas and certifications recorded so that the office assigns the right person.*

1. Go to **Staff & roles** → **Team** and open a profile.
2. Select **Edit profile** and update **Phone**, **Areas covered**, **Certifications** and **Bio**.
3. **Photo** (optional): select **Choose image** or drag their photo onto the box. It shows as a round preview; use **Replace** or **Remove** to change it. Or select **Use an image link instead** and type an `https://` link or a path starting with `/`. See [Adding images](#adding-images).
4. Select **Save profile**.

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

## 10A. Website content

This chapter covers the content on the home page and the new website pages: FAQs, reviews, client logos, the team page, case studies, homepage stats, WhatsApp, business hours, financing and the calculator.

**Who can do what**

| Task | Who |
|---|---|
| Add, edit, reorder and delete **FAQs**, **Reviews**, **Client logos** and **Our Team** members; add case-study details to **Portfolio** | Super admin, Admin, Sales |
| View FAQs, Reviews, Client logos and Team | Also Inventory and Support (view only) |
| Change **Settings → Website → Homepage & contact**, **Financing** and **Load calculator** | Super admin, Admin |

FAQs, Reviews, Client logos and Team are in the **Website** group of the menu.

**Two rules for everything in this chapter**

- **Use only our own, true content.** Don't copy text, pictures, logos, numbers or reviews from other companies' websites.
- **Every home page section hides itself when it's empty.** If you delete all reviews, the reviews section simply disappears. Nothing looks broken.

**Sample content:** until launch, many items are marked **Sample**. See story 10A.8.

### Story 10A.1: Edit FAQs

*As an admin or marketing staff member, I want to keep the frequently asked questions accurate and in a sensible order so that customers find answers without calling.*

1. Go to **Website** → **FAQs**.
2. To add one, select **Add FAQ**. To change one, select **Edit** on its row.
3. Fill in:
   - **Question** (5 to 200 characters), for example "Do I pay to place an order?"
   - **Answer** (up to 2,000 characters). Plain text only; press Enter to start a new line.
   - **Category** (optional, up to 60 characters): pick an existing category from the suggestions or type a new one, for example "Ordering", "Installation" or "Products".
4. Leave **Show on the website** on, then select **Add FAQ** (or **Save changes**).
5. To change the order, use **Move up** and **Move down** (▲ ▼) on each row. Higher in the list shows first.
6. To see only one group, use the **category filter** at the top of the list.

**What you'll see on the website:** the first 6 FAQs appear at the bottom of the home page with a "See all questions" link. The **FAQ** page (`/faq`) shows every active FAQ, grouped under its category.

**Tips and common mistakes**

- Type the category the same way every time ("Installation", not "installation" or "Installations"), or you'll get two groups.
- Put the most common questions at the top: only the first 6 show on the home page.
- Make sure each answer matches how we really work. For example: customers don't pay to place an order; we call to confirm first.
- To hide an FAQ for a while, switch **Show on the website** off instead of deleting it.

### Story 10A.2: Add and edit reviews

*As the owner, I want to show real reviews from happy customers so that new customers trust us.*

> **Only real reviews, with permission.** Add a review only if a real customer said it and agreed that we can show it on the website. Don't make up reviews, and don't change what the customer meant. Fixing a spelling mistake is fine.

1. Go to **Website** → **Reviews** and select **Add review**.
2. Fill in:
   - **Customer name** (required). Use the name the customer agreed to; first name and initial is enough, for example "Adaeze O."
   - **Context** (optional, up to 150 characters): what we installed and where, for example "5kVA lithium system, Lekki".
   - **Review** (required, 10 to 1,000 characters): the customer's words.
   - **Rating** (optional): 1 to 5 stars, or **No rating**.
   - **Source** (optional): where the customer left the review: Website, WhatsApp, Google, Facebook or In person.
   - **Photo** (optional): select **Choose image** or drag the customer's photo onto the box. It shows as a round preview. Or select **Use an image link instead** and type an `https://` link or a path such as `/reviews/adaeze.jpg`. Only use a photo the customer agreed to share.
3. Leave **Show on the website** on and select **Add review** (or **Save changes**). Use **Move up** and **Move down** to decide which show first.

**What you'll see on the website:** a reviews section on the home page with stars, name, context and a small source badge. Customers move through the reviews themselves; they never change on their own.

**Tips**

- If a customer asks us to remove their review, delete it straight away.
- If there are no active reviews, the reviews section doesn't show.

### Story 10A.3: Add client logos

*As an admin, I want to show logos of businesses we've powered so that other businesses trust us.*

> **Only with permission.** Add a client's logo only if the client agreed in writing (an email or WhatsApp message is fine) that we can show it.

1. Go to **Website** → **Client logos** and select **Add client logo**.
2. Fill in:
   - **Client name** (required). It's also read out by screen readers in place of the logo.
   - **Logo** (required): select **Choose image** or drag the logo file onto the box. A PNG with a transparent background looks best, and it stays transparent after upload; JPEG and WebP work too. SVG files can't be uploaded: if the client only sent an SVG, ask them for a PNG, or select **Use an image link instead** and type a link starting with `https://` or a path on our website such as `/clients/acme.svg`.
   - **Website** (optional): the client's `https://` website link.
3. Leave **Show on the website** on and select **Add client logo** (or **Save changes**). Check the logo preview. Use **Move up** and **Move down** to change the order.

**What you'll see on the website:** a row of logos on the home page (up to 6 per row), shown in grey until the visitor points at them.

**Tips and common mistakes**

- A logo must be an uploaded JPEG, PNG or WebP image, or a link or a path starting with `/`. Anything else is refused.
- A logo on a clear or white background with the name readable looks best.

### Story 10A.4: Fill in portfolio case-study details

*As an admin, I want to describe completed projects properly so that customers can see installations like the one they need.*

1. Go to **Portfolio** and open a project (or add one, story 5.2).
2. Fill in the case-study details:
   - **Summary** (up to 500 characters): the customer's problem and what we did, in plain words.
   - **Location** (up to 100 characters), for example "Lekki, Lagos". Don't give a full street address.
   - **System** (up to 200 characters): what we installed, for example "10kVA inverter, 8 × 200Ah lithium, 12 × 550W panels".
3. Save.

**What you'll see on the website:**

- A project with a **Summary** counts as a case study. Up to 3 case studies show on the home page with photo, location, amount and summary.
- On the **Projects** page, cards show the summary, location and amount.

**Tip:** leave Summary empty for a project you don't want shown as a case study. It still shows in the normal portfolio.

### Story 10A.4b: Show or hide products on the website

*As the owner, I want to sell packages only for a while, so that customers don't browse single products.*

1. Go to **Settings → Website → Homepage & contact**.
2. Under **Products on the website**, turn **Show products on the website** off.
3. Select **Save changes**.

What customers see within about a minute: no **Products** item in the menu or the footer, no product sections on the home page, and any old product link shows the "We can't find that page" page. Packages still show the products and specifications they include, so customers can still see what is in a package.

What stays the same: **Products**, **Categories**, **Inventory** and in-store sales of single products all work as before in the admin, and package prices are unchanged. Turn the switch back on to bring the product pages back.

### Story 10A.4c: Edit "Why customers choose us"

*As the owner, I want to say why customers choose us in my own words so that the home page matches how we actually work.*

The band near the top of the home page shows a row of cards, each with an icon, a short title and a sentence.

1. Go to **Website → Why choose us** in the menu.
2. Select **Add reason**, or the pencil on a card you want to change.
3. Fill in:
   - **Title:** a few words, for example "Installed by our engineers" (3 to 80 characters).
   - **Text:** one or two sentences (10 to 300 characters).
   - **Icon:** pick from the list; a preview shows beside it.
   - **Show on the website:** turn off to keep a card without showing it.
4. Select **Add reason** or **Save changes**. It appears on the home page within about a minute.
5. Use the up and down arrows to set the order. **Four cards fit on one row**, so four or eight look best.

**If you delete them all,** the home page goes back to four standard cards, so the band is never empty.

**Tip:** only claim what you can stand behind. Customers compare these against what they experience.

### Story 10A.5: Set homepage stats, WhatsApp number and business hours

*As the owner, I want the home page and footer to show our real figures, WhatsApp and opening hours so that customers know how to reach us.*

1. Go to **Settings → Website → Homepage & contact**.
2. **Homepage stats:** select **Add stat** for each row, up to **4**. Each row has a **Label** (up to 40 characters, for example "Installations") and a **Figure** (up to 20 characters, for example "500+"). Only use figures you can prove.
3. **WhatsApp & business hours** → **WhatsApp number:** the business WhatsApp number with the country code, for example `+234 803 000 0000`. Leave it empty to hide the WhatsApp button.
4. **WhatsApp & business hours** → **Business hours:** one line per day range, for example:
   ```
   Mon–Fri 8am–6pm
   Sat 9am–3pm
   ```
5. Select **Save changes** in the bar at the bottom.

**What you'll see on the website:**

- The stats show as large gold figures in the big photo area at the top of the home page (the hero), counting up from 0 when the page opens. No stats: the hero shows three short reassurances instead ("No payment to place an order", "We call to confirm", "Installation included").
- With a WhatsApp number: a **Chat on WhatsApp** button at the bottom right of every page except the cart and checkout (round on phones), a **Chat on WhatsApp** button in the home page hero, a WhatsApp link in the footer, and a WhatsApp button in the last section of the home page. It opens WhatsApp with the message "Hello Juwon Electric". Clear the number to remove all of these (the hero button then says **Talk to an engineer** and calls the business phone).
- Business hours show in the footer.

**Tip:** test the WhatsApp button on your phone after saving, to be sure it opens the right chat.

### Story 10A.6: Set up financing, or leave it off

*As the owner, I want to show payment-plan terms only when we really offer them so that customers aren't misled.*

> **Financing is off unless you switch it on.** Anything shown on the website can be read as an offer. Only switch it on when the terms are agreed and approved (including with any finance partner).

To leave financing off: go to **Settings → Website → Financing** and make sure **Show financing on the website** is off. If you switched it off, select **Save changes**. The financing section doesn't show on the website.

To switch it on:

1. Go to **Settings → Website → Financing** and, on the **Show on website** card, switch **Show financing on the website** on.
2. Fill in, on the **Terms** and **Note** cards:
   - **Deposit (%)**: a whole number from 0 to 100, for example 40.
   - **Terms (months)**: type a number of months and add it; each shows as a chip (up to 6, each 1 to 60, for example 3, 6 and 12).
   - **Monthly rate (%)**: 0 to 20, for example 3.5.
   - **Approval time**: for example "24–48 hours".
   - **Note** (up to 300 characters): conditions in plain words, for example "Subject to approval. Terms may change."
3. Select **Save changes** in the bar at the bottom.

**What you'll see on the website:** a financing section near the end of the home page with a table of the terms, a worked example on the cheapest package (deposit today, balance and the monthly instalment for each term), your note and buttons to contact us. Interest in the example is worked out simply: balance × monthly rate × number of months. Customers can't apply online; they call, message or visit.

### Story 10A.7: Set up the calculator

*As the owner, I want the solar calculator to use sensible appliance figures and today's costs so that customers get a useful first estimate.*

The calculator is at `/calculator`. It's **off unless you switch it on**.

1. Go to **Settings → Website → Load calculator** and, on the **Show on website** card, switch **Show the calculator on the website** on.
2. **Appliances** (up to 40): the list customers start from. Select **Add appliance** for each row, and fill in:
   - **Appliance**: the name customers see, for example "Standing fan".
   - **Watts**: the appliance's power, a whole number, for example 75.
   - **Hours a day**: how long it's usually on (0 to 24, half hours allowed).
   - **Quantity**: how many a typical home has (0 to 20).
   - Use **Move up**, **Move down** and **Remove** to arrange the list.
3. **Sizing assumptions** (leave the defaults unless an engineer says otherwise):

| Field | Default | What it means |
|---|---|---|
| **Inverter headroom (%)** | 25 | Extra room added to the load when sizing the inverter |
| **Battery depth of discharge (%)** | 80 | How much of the battery is safely used |
| **Battery voltage** | 48 V | 12 V, 24 V or 48 V, used to show battery size in Ah |
| **Panel watts (W)** | 550 | The panel size we usually install |
| **Peak sun hours** | 4.5 | Average useful sun hours a day |

4. **Generator costs** (for the "compared with a generator" figures):
   - **Fuel price per litre (₦)**: today's petrol or diesel price.
   - **Litres per kVA-hour**: how much fuel a generator uses, for example 0.25.
   - **Maintenance per month (₦)**: typical servicing cost.
5. Select **Save changes** in the bar at the bottom.

**What you'll see on the website:** a "Size your system" teaser on the home page, the gold **Load calculator** button in the top menu, and the **Calculator** page, with results, matching packages and a generator comparison. The page always says "Estimates only — an engineer confirms your size before installation."

**Tips**

- Update the fuel price when it changes a lot, or the generator comparison will be out of date. If **Fuel price per litre** or **Litres per kVA-hour** is 0, the generator comparison doesn't show.
- If the calculator seems to recommend sizes that are too big or small, ask an engineer to check the appliance watts and the parameters.
- Nothing customers type into the calculator is saved.

### Story 10A.8: Replace sample content before launch

*As an admin, I want to replace every piece of sample content so that nothing made-up goes live.*

**How to spot sample content**

- In the admin: a **Sample** badge on the item or on a settings page, and the banner "Sample content is showing on the website. Edit or replace it before launch." at the top of **FAQs**, **Reviews**, **Client logos**, **Team** or **Portfolio** while they still have sample items. When you edit a sample item, the form reminds you: "Saving your changes turns this into real content and removes the Sample badge."
- On the website: a small "Sample" label on stats, reviews, client logos, team member cards, case-study details, financing and calculator notes. **Sample FAQs have no label on the website**, so check them in the admin.

**What to do**

1. **FAQs:** open each Sample FAQ. Rewrite it to match how we really work and save, or delete it.
2. **Reviews:** delete every Sample review. Add only real ones (story 10A.2).
3. **Client logos:** delete every Sample client. Add only real clients who agreed (story 10A.3).
4. **Team:** delete every Sample team member and add the real team, or replace each one's details, upload their real photo and save (story 10A.9).
5. **Portfolio:** open each project marked Sample. Replace **Summary**, **Location** and **Amount** with the real details and save, or clear them.
6. **Settings → Website → Homepage & contact:** replace the stats with true figures (or remove them), enter the real WhatsApp number (the sample is `+2348000000000`) and real business hours. Select **Save changes**.
7. **Settings → Website → Financing:** enter real terms and select **Save changes**, or switch **Show financing on the website** off and select **Save changes**.
8. **Settings → Website → Load calculator:** check every appliance, the sizing assumptions and the generator costs, then select **Save changes**; or switch **Show the calculator on the website** off and select **Save changes**.
9. Open the website on your phone and check the home page, **Calculator**, **FAQ**, **Projects**, **Our Team** and the footer. No "Sample" label should be left.

**What you'll see:** as soon as you save an item or section, its **Sample** badge and website label disappear. The banner disappears when no sample items are left on that screen.

**Tips and common mistakes**

- **Changing and saving makes it real.** Saving a sample item or section with a change removes the Sample mark, so only save once the content is true. Saving without changing anything, moving an item with **Move up** / **Move down**, or switching **Show on the website** on or off keeps the Sample mark.
- The full list of sample items is the **Before launch checklist** in `PRODUCT_REQUIREMENTS.md`, section 11.
- Sample content is only ever loaded on developers' computers. If you see it on the live website, tell your developer and the owner.

### Story 10A.9: Manage the team page

*As an admin, I want the Our Team page to show our real people, in sensible groups and order, so that customers know who will install and look after their system.*

The public page is **Our Team** at `/team`. It lists every team member whose **Show on the website** switch is on, grouped under headings such as "Leadership" or "Engineering & installations".

**Add or edit a team member**

1. Go to **Website** → **Our Team**.
2. To add someone, select **Add team member**. To change someone, select **Edit** (the pencil) on their row.
3. Fill in:
   - **Name** (required, up to 100 characters): their full name.
   - **Role** (required, up to 80 characters), for example "Lead installation engineer".
   - **Group** (required, up to 60 characters): the heading they appear under. Pick an existing group from the suggestions or type a new one. Suggestions include "Leadership", "Engineering & installations", "Sales & customer care" and "Operations".
   - **Bio** (optional, up to 300 characters): one or two sentences about their work. A counter shows how many characters you've used. Line breaks aren't kept.
   - **Photo** (optional): select **Choose image** or drag their photo onto the box. Square photos look best. A preview shows how it will look; use **Replace** or **Remove** to change it. You can also select **Use an image link instead** and type an `https://` link or a path such as `/team/ada.jpg`. Without a photo, the website shows their initials.
   - **LinkedIn URL** (optional): their public LinkedIn profile, starting with `https://`.
4. Leave **Show on the website** on, then select **Add team member** (or **Save changes**).

**Change the order and the groups**

- Use **Move up** and **Move down** (▲ ▼) on each row. Higher in the list shows first on the website.
- Groups appear on the website in the order their first member appears in the list. To move a whole group up, move its first member above the other groups' members.
- Use **Filter by group** at the top of the list to work on one group at a time. **All groups** shows everyone.

**Hide or remove someone**

- To hide someone for a while (for example while you get a new photo), edit them, switch **Show on the website** off and save. They stay in the list but aren't shown on the team page.
- When someone leaves, select **Delete** (the bin) on their row and confirm.

**Replace the sample team**

The team page was built with **12 sample team members**: made-up names with drawn placeholder portraits (not real people). Each has a **Sample** badge, and the list shows the sample banner.

1. Delete every sample member, then add the real team, or open each sample member and replace **Name**, **Role**, **Group**, **Bio** and **Photo** with a real person's details and save.
2. Moving a sample member or switching them off doesn't remove the Sample badge. Only changing their details and saving does.
3. Check `/team` on your phone: no card should show a "Sample" label, and no photo should be a drawing.

**What you'll see on the website:** the **Our Team** page with figures counting up (team members, teams, and engineers and installers), a section for each group with photo cards, and a "Want to join us?" band linking to open roles. On a computer, pointing at a card or tabbing to it zooms the photo and shows the bio and LinkedIn link over it; on a phone, the bio and link show under the role. **Team** is in the top menu, and **Our Team** is in the footer.

**Tips and common mistakes**

- Type each group name the same way every time ("Operations", not "operations"), or you'll get two groups.
- Only use a person's photo, bio and LinkedIn link with their agreement.
- The "engineers and installers" figure counts members of groups whose name contains "Engineer" or "Install". Name your engineering group accordingly.
- The team page tells search engines about real team members only. Sample members are never included.

---

## 11. Customer (public website)

This chapter describes the public website for customers. Staff can use it to guide customers on the phone.

**On the home page** you can jump straight to packages by category (**Tubular**, **Lithium**, **Hybrid**, with how many packages each has) in the "Find your package" section, and see the lowest package price under "Complete packages from" (story 11.12).

On a computer, the top menu has **Packages**, **Products**, **Services**, **Projects**, **Our Team**, **Careers** and **Contact us**, plus the gold **Load calculator** button (it reads **Get a quote** when the calculator is switched off) and the **cart** button with a count. The count includes both packages and products in your cart. On a phone, select the menu button: it lists the same items. **Careers** is in the footer too.

### Story 11.1: Browse packages

*As a customer, I want to find a package that suits my home or business so that I get reliable power.*

1. Select **Packages** (or **View Packages** on the home page).
2. Filter by category (the categories your packages use) and inverter size (kVA), or sort by price.
3. Each card shows the name, kVA, voltage, what it can power, the starting price ("from ₦…"), whether a solar option exists, and how many items are included.

### Story 11.2: Compare options and see what's included

*As a customer, I want to see exactly what each option contains so that I know what I'm paying for.*

1. Open a package.
2. Under **Choose an option**, pick an option (for example without or with solar). The price updates.
3. Read **What's included**: each product's quantity, name (tap it for details), brand and key specs.
4. Check the stock hint: **In stock**, or **Available to order** ("We'll confirm a delivery date when we call.").
5. If the package belongs to a category (for example Inverters), it is shown at the top of the page. Select it to see other packages and products in that category.

### Story 11.3: Browse products and specs

*As a customer, I want to check the specifications of inverters, batteries and panels so that I can compare them.*

1. Select **Products**. Use the category list or search.
2. On a category page, any packages in that category are listed first under "Packages in <category>", then the products.
3. Open a product to see photos, brand and SKU, price, stock status, a specifications table and the description.
4. See **Included in these packages** to buy it as part of a package, or **Ask about this product** to send an enquiry about it. You can also buy the product on its own (story 11.4a).

### Story 11.4a: Buy a single product

*As a customer, I want to buy one product, such as a replacement battery, without buying a whole package.*

1. Open the product. If it says **In stock**, choose how many with the quantity stepper (up to 10, or fewer if we have fewer in stock).
2. Select **Add to cart**. A message offers **View cart**.
3. From a product list you can also select the small **Add to cart** button on the product's card. It adds 1.
4. Continue shopping or check out (story 11.4).

**Tips**

- If a product says **Out of stock**, the **Add to cart** button is greyed out and product cards don't show it. Use **Ask about this product** and we'll tell you when it's back.
- Single products don't include installation. If you need it installed, say so when we call, or buy a package that includes it.

### Story 11.4: Add to cart and check out

*As a customer, I want to order packages and products online so that Juwon Electric can deliver them, and install packages.*

1. On a package, choose the option and select add to cart, or add a product (story 11.4a). A message offers **View cart**.
2. In the **cart**, packages and products are listed together in one cart. Change quantity (up to 100), switch with/without solar on packages, or remove items. Product lines show the photo, name, SKU and line total. Prices are checked with the latest prices, and anything no longer available (for example a product that has sold out) is flagged.
3. Select **Checkout** and enter your name, phone, email and delivery address.
4. Read the **payment note**:
   - "No payment now. We’ll call to confirm your order and agree how you’d like to pay." Nothing is paid at checkout and no payment link is sent.
5. Complete the quick security check and place the order.

**What you'll see:** the order summary lists every package and product, and your confirmation email lists each product as, for example, "2 × Lithium battery 5kWh (BAT-5K)" with its price.

**Tips:**

- A cart can hold up to 50 lines in total (packages and products together), and it is saved in your browser.
- If checkout says "Some items in your cart are no longer available. Please refresh your cart.", a product may have sold out or a package option may have changed. Remove or reduce the flagged lines and try again.
- Placing an order doesn't hold the stock. We confirm availability when we call.

### Story 11.5: What happens after ordering

*As a customer, I want to know what happens next so that I'm ready for delivery and installation.*

The **Order received** page shows your order summary and these steps:

1. **Confirmation call:** we call to confirm your order and delivery address, and agree how you’d like to pay.
2. **Processing:** we prepare your equipment from stock.
3. **Out for delivery:** our team brings your order to your address.
4. **Delivered:** your order arrives and we check everything is complete.
5. **Installation:** for packages, our engineers install and test the system and show you how to use it. Orders with only products don't include installation unless we agree it on the call.

### Story 11.6: Apply for a job

*As a job seeker, I want to see open roles and apply so that I can work with Juwon Electric.*

1. Select **Careers** in the footer, or in the menu on a phone (you can also select **See open roles** on the home page or the team page). Filter by department or employment type.
2. Open a vacancy to read the description, responsibilities and requirements.
3. Select **Apply by email**. Your email app opens with the subject "Application: <job title>". Attach your CV and send.

### Story 11.7: Contact the team

*As a customer, I want to ask a question so that I get advice before buying.*

1. Select **Contact us** (or **Talk to an engineer**, or **Ask about this product** on a product page, which fills in the topic).
2. Enter your name, phone, email and message, complete the security check and send.
3. The page also shows the business phone, email and address.
4. To get updates, subscribe with your email in the website footer.
5. The footer also shows our **business hours** and a **WhatsApp** link when they are set.

### Story 11.8: Size a system with the calculator

*As a customer, I want to work out what size of system I need so that I can pick the right package and see what I'd save on a generator.*

The **Calculator** page is only available when Juwon Electric has switched it on. Find it from the gold **Load calculator** button in the top menu, the "Size your system" section on the home page or the link in the footer. When the calculator is switched off, these links are hidden.

1. Open the **Calculator**. A list of common appliances is already filled in with typical amounts.
2. For each appliance, set **how many** you have and **how many hours a day** you use it, with the steppers. Set the number to 0 for anything you don't have.
3. Missing something? Select **Add appliance**, type its name and its watts (printed on its label or in its manual).
4. Read the results. They update as you change the numbers:
   - **Total load (W):** the power if everything is on at once.
   - **Recommended inverter (kVA):** the inverter size, with some spare room added.
   - **Daily energy (kWh):** how much electricity you use in a day.
   - **Battery capacity:** in kWh and in Ah.
   - **Solar panels:** how many panels you'd need to recharge in a normal day.
5. Look at **Matching packages**: up to 3 packages big enough for you, cheapest first. Open one to see what's included.
6. Look at the **generator comparison**: set **Generator hours a day** to how long you run a generator. You'll see roughly what a generator of the same size costs you a month in fuel and servicing, and how many months the cheapest matching package takes to pay for itself ("Pays for itself in about …").
7. Select **Talk to an engineer** to have an engineer check your answer.

**Tips**

- These are **estimates only**. An engineer confirms your size before installation.
- Nothing you enter is saved or sent to us. If you want advice, contact us and tell us your list.
- Appliances with motors (air conditioners, pumping machines, freezers) need extra power when they start. Mention them when you talk to us.

### Story 11.9: Find answers on the FAQ page

*As a customer, I want quick answers to common questions so that I don't have to call.*

1. Scroll to the questions near the bottom of the home page and select a question to open its answer. Select it again to close it.
2. For more, select **See all questions** (or **FAQ** in the footer). The FAQ page shows every question, grouped by topic, for example "Ordering" or "Installation".
3. Can't find your answer? Use **Contact us** or WhatsApp.

### Story 11.10: Message us on WhatsApp

*As a customer, I want to chat with Juwon Electric on WhatsApp so that I get a quick reply on my phone.*

1. Select **Chat on WhatsApp** at the bottom right of the page (a round red button on phones; see story 11.13), or the **Chat on WhatsApp** button in the home page hero, the WhatsApp link in the footer, or the button at the end of the home page.
2. WhatsApp opens with the message "Hello Juwon Electric" ready. Add your question and send.

**Tip:** the button only shows when Juwon Electric has set a WhatsApp number, and never on the cart and checkout pages.

### Story 11.11: Browse case studies by category

*As a customer, I want to see installations for customers like me so that I know Juwon Electric has done similar work.*

1. On the home page, look at the case studies (photo, location, amount and a short summary).
2. On **Projects**, browse the full gallery of completed projects.
3. Each project card shows the summary, location and amount when we've added them.

**Also on the home page:** logos of clients we've powered, shop by category, popular products, reviews from customers, a "We're hiring" strip when there are open roles and, when offered, a **financing** section with payment-plan terms. You can't apply for financing on the website: contact us to ask about it. The last section shows our phone numbers, email, address and opening hours.

### Story 11.12: Get started from the home page

*As a customer, I want the home page to show me quickly what Juwon Electric does and where to start so that I can shop or ask for a quote.*

1. The top of the home page is a large photo area (the hero). The photos of our installations change every 7 seconds.
   - The thin bars at the bottom centre show which photo is on screen; the gold fill shows how long until the next one. Select a bar to show that photo.
   - Select the **pause** button next to the bars to stop the photos changing, and **play** to start again. The photos also pause while your mouse is over the top area or you are moving through it with the keyboard.
2. Select **View Packages** to see all packages, or **Chat on WhatsApp** (or **Talk to an engineer**, which calls us, when WhatsApp isn't set up).
3. Below the buttons you'll see a few figures about our work (for example the number of installations). They count up from 0 when the page opens.
4. On a large computer screen, a card at the bottom right shows the lowest package price ("Complete packages from ₦…"). Select its arrow to compare packages.
5. To work out what size system you need, select **Load calculator** in the top menu. For a price for your own needs, open the menu and select **Get a quote**, which opens the contact form with the topic already set to Quote. On a phone both are at the bottom of the menu.
6. Scroll down for the rest of the page. At the top of the page the menu sits over the photo; once you scroll it lifts into a floating dark bar.

**Tips**

- If your phone or computer is set to reduce motion, the photos don't change by themselves and nothing zooms or counts up. You can still select a bar to see each photo.
- The pages work without animations: everything is readable straight away.

### Story 11.13: Use the floating WhatsApp button

*As a customer, I want a quick way to chat with the team from any page so that I don't have to look for it.*

At the bottom right of most pages you may see one button. On a phone it is a round button with just an icon; on a larger screen it shows a label. On a phone's home page it appears once you scroll past the big photo at the top.

- **Chat on WhatsApp** ("We are available"): opens WhatsApp with "Hello Juwon Electric" ready (story 11.10). It shows only when Juwon Electric has a WhatsApp number set.
- The load calculator is no longer a floating button: use **Load calculator** in the top menu (story 11.8).

**Tips**

- The buttons slide in a moment after the page opens.
- They don't show on the **cart** and **checkout** pages, so they never cover your order buttons.
- When you reach the footer, they fade so you can read the links underneath. Point at or tab to a button to bring it back.
- There is no "online" light: WhatsApp replies come during business hours.

### Story 11.14: Our Team

*As a customer, I want to see the people behind Juwon Electric so that I know who I'm dealing with.*

1. Select **Our Team** in the top menu or the footer.
2. The **Our Team** page shows how many team members, teams, and engineers and installers there are. The figures count up when the page opens.
3. People are grouped under headings, for example "Leadership" or "Engineering & installations". Each card shows a photo (or initials), name and role.
4. To read more about someone:
   - On a computer, point at their card, or tab to it with the keyboard. The photo zooms a little and their bio and a **LinkedIn** link (when they have one) appear over it.
   - On a phone or tablet, the bio and **LinkedIn** link show under their role.
5. Interested in working with us? Select **See open roles** in the "Want to join us?" band at the bottom.

---

## 12. How updates reach the website

When staff change something in the admin console (a price, a product, a package, a service, a vacancy, stock, business details, FAQs, reviews, client logos, team members or website settings):

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
| **Create job is missing on an order** | The order already has an installation job (only one per order), or the order is cancelled or doesn't require installation. | Look for the note "This order already has an installation job." and open that job to change it. To start again, cancel the existing job; **Create job** then shows again. |
| **Can't add a product to the cart** (website) | The product is out of stock, or it isn't Active (hidden or archived products aren't sold online). | Customers: use **Ask about this product**. Staff: check its stock in **Inventory** and its **Status** in **Products**. |
| **Can't delete a category** | Packages, products or subcategories still use it ("Category has subcategories, products or packages."). | Move its products and subcategories to another category, and change the **Category** on its packages (story 7.5), then delete. |
| **An engineer can't see a job** | They aren't on the job's crew, or the job was cancelled. | Open the job in **Installations** and add them under **Engineers**. |
| **Invite or reset token doesn't work** | Tokens expire after 30 minutes and work once. | Use **Forgot password?** to get a new one. |
| **Sample label showing on the website** | The item or settings section is still sample content. It stays marked until someone edits and saves it, or deletes it. Sample FAQs have no label, so check them in the admin too. | Follow story 10A.8: replace and save, or delete, each item with a **Sample** badge in **Website** → FAQs, Reviews and Client logos, in **Portfolio**, and in **Settings → Website** → Homepage & contact, Financing and Load calculator. |
| **Calculator/financing not showing** (website) | It's switched off in Settings. Both are off unless someone switches them on. | A Super admin or Admin opens **Settings → Website → Load calculator** or **Financing**, switches on **Show the calculator on the website** or **Show financing on the website**, checks the values and selects **Save changes** (stories 10A.6 and 10A.7). Leave financing off unless real terms are agreed. |
| **WhatsApp button missing** (website) | No **WhatsApp number** is set in **Settings → Website → Homepage & contact**, or the page hasn't refreshed yet. The floating buttons never show on the cart and checkout pages. | Enter the number, save, and reload the website (story 10A.5). On the cart or checkout, this is expected. |
| **Can't leave a settings page** ("You have unsaved changes. Leave without saving?") | You changed something on that page and haven't saved it. | Select **Keep editing**, then **Save changes** (or **Discard**). Or select **Leave without saving** if you don't want the change. |
| **No Save button in Settings** | The save bar only appears after you change something. If fields are greyed out, your role can only view Settings. | Change a field to see **Save changes**. For view-only accounts, ask a Super admin or Admin to make the change. |
| **A home page section is missing** (stats, client logos, case studies, reviews, FAQ) | Each section hides itself when it has nothing to show: no active items, no stats, or no portfolio item with a **Summary**. | Add the content, check **Show on the website** is on, and reload the website. |
| **Hero photos aren't changing** (home page) | The slideshow is paused: someone selected the pause button, or the mouse is resting over the photo area, or keyboard focus is inside it. Or the device is set to reduce motion, which turns off automatic changes. | Select the **play** button next to the bars, or move the mouse away. With reduce motion on, this is expected: select a bar to see each photo. |
| **Team member not showing** (team page) | Their **Show on the website** switch is off (hidden), they were deleted, or the page hasn't refreshed yet. | In **Website** → **Team**, edit them, switch **Show on the website** on and save, then reload `/team`. Check the **Group** is spelled as intended, so they're under the right heading. |
| **Numbers show 0 briefly** (home page stats, team page) | The figures count up from 0 to the real value when they come into view. This is an animation, not missing data. | Wait a second. If a figure stays wrong, check it in **Settings → Website → Homepage & contact** (home stats) or the team list (team page figures are counted from it). |
| **Image won't upload** | The file isn't a supported picture, the connection dropped, or uploads are unavailable for a while ("Image uploads are unavailable right now. Please use an image link or try again later."). | Read the message under the field and follow [Adding images](#adding-images). Check your connection and try again. If uploads are unavailable, select **Use an image link instead**, or try again later. |
| **Image looks blurry** (website) | The original picture was small or low quality. Large photos are shrunk to a sensible size, but small ones can't be made sharper. | Upload a larger, sharper original with **Replace**. Use the photo straight from the camera, not a screenshot or a copy from a chat. |
| **Wrong file type** ("That file isn’t an image. Choose a JPEG, PNG or WebP image." or "Upload a JPEG, PNG or WebP image.") | Only JPEG, PNG and WebP pictures can be uploaded. SVG drawings, PDFs and documents can't. | Save or export the picture as JPEG or PNG and upload that, or ask whoever sent it for a PNG or JPEG. You can also use an image link. |
| **Team page shows drawings instead of photos** | These are the sample team members' placeholder portraits, or a member has no **Photo** (initials show instead). | Replace the sample team with real people (story 10A.9) and add each person's photo. |

---

## 14. Keeping this guide current

This guide is a living document. **Update it in the same change as every feature** that affects what staff or customers see or do:

- Add or change the steps in the right persona chapter, using the exact button and field names from the console.
- Update the roles table in chapter 1 if permissions change.
- Mark anything not yet available as such, and don't describe features that don't exist.
- Keep the language plain. Readers are busy staff, not developers.
- Add a dated entry to the change log below, and update the matching section of `PRODUCT_REQUIREMENTS.md`.

### Change log

**2026-09-22 ("Our work" is now "Projects")**
- Customer: the menu item and page heading that read **Our work** now read **Projects**, in the top menu, the phone menu and the footer. The page itself is unchanged, and its web address (`/portfolio`) still works, so any link you have already shared keeps working.

**2026-09-22 (project cards show the amount)**
- Customer: on the home page and **Our work**, the line that used to sit beside a lightning bolt now sits beside a naira sign (₦), because it shows what the project cost.
- Owner: the portfolio form's **System** box is now **Amount**, for what the project cost, e.g. ₦14,500,000. Anything already typed in that box is kept and still shows — only the label and the example changed.

**2026-09-20 (Industries We Serve, no work-by-industry)**
- Customer: the "Industries We Power" section is now **Industries We Serve** — a clean set of eight industries shown as icon cards, with no photos. A new **Solutions by Scale** band below it lists Residential, Commercial and Industrial & Utility-Scale. The **Our work** page now shows all projects in one gallery, no longer split by industry.
- Owner: you no longer manage "customer segments," and the portfolio form no longer has a **Category** (industry) field — the industries list is fixed in the site. Nothing you already entered is lost; those fields are just no longer shown.

**2026-09-20 (real installation photos)**
- Customer: the home page, page banners, "who we serve" cards and the work gallery now show our own inverter and battery installation photos instead of the stock pictures. The gallery images fill their cards fully.
- Owner: you supplied 25 photos; they were tidied up for the web (turned upright, resized and compressed) and put in place for you. On the live site, the work-gallery pictures need a one-time update at the next deploy to fill their cards — this is noted for the developer.

**2026-09-20 (friendlier "page not found")**
- Customer: the "page not found" (404) page now points to four helpful places — Packages, Products, Our services and Contact us — instead of three, so a wrong or old link is easier to recover from.

**2026-09-19 (owner copy pass)**
- Customer: new wording across the home page, cart and services pages, and the footer.
- Owner: the services, the first three reviews, the phone numbers, office address and opening hours were updated for you; the rest are editable as usual under Website and Settings.

**2026-09-18 (careers in the top menu)**
- Customer: **Careers** is now in the top menu, so open roles are one click away from any page.
- Owner: four sample vacancies are on the site for review (three open, one draft). Replace or delete them under **Careers** in the admin before launch.

**2026-09-18 (why choose us and team copy)**
- Customer: new wording in the "Why Customers Choose Us" band and at the top of the team page.

**2026-09-18 (smaller deployments)**
- Nothing changes on screen. The website's built-in photos are stored more efficiently, which keeps hosting costs down. Photos you upload are unaffected.

**2026-09-18 (hero copy)**
- Customer: new wording at the top of the home page.

**2026-09-18 (industries we power)**
- Customer: the "Who we power" section is now **Industries We Power**, and each industry has a new name and description.

**2026-09-18 (selected projects)**
- Customer: the home page case studies are now **Selected Projects**, each card showing the system fitted and a **View Project** link when the project has one.
- Admin: three customer segments were renamed (Academic Institutions → **Educational Institutions**, Hospitals → **Healthcare**, Community → **Community / Estate**). The names show on the website; their web addresses are unchanged.

**2026-09-18 (packages use the category)**
- Admin: a package no longer has a **Battery type**. Pick a **Category** instead (it is now required), and create the categories you need under **Categories**. The packages list filters by category.
- Customer: the website groups and filters packages by category instead of battery type. Only real, visible categories appear as filters, and hiding a category takes its packages off the packages page.

**2026-09-18 (staff photos show everywhere)**
- Admin: a staff photo now shows everywhere that person appears, including installation jobs, the engineer picker, an order's installation section and your own account button at the top right. Change the photo and it updates everywhere.

**2026-09-18 (carts page removed; save waits for uploads)**
- Admin: the **Carts** page is gone. Customer carts live in the customer's own browser, so there was never anything to see there.
- Admin: while a photo is uploading, **Save** shows "Uploading…" and waits for it, so you no longer have to change another field to make the save take.

**2026-09-18 (no product links when products are hidden)**
- Customer: with products hidden, the items listed inside a package are shown as plain text instead of links, so nothing leads to a missing page.

**2026-09-18 (contact us in the menu)**
- Customer: the top menu item **Contact** now reads **Contact us**.

**2026-09-18 (youtube and social icons)**
- Customer: the footer now links to the YouTube channel as well, and on a phone the social links show their logos instead of their names so they all fit.

**2026-09-18 (Our Team)**
- Everywhere: the **Team** menu item, page title and admin page are now called **Our Team**. Nothing else changed; the web address `/team` is the same.

**2026-09-18 (whatsapp button)**
- Customer: the floating WhatsApp button is now WhatsApp green with the WhatsApp logo.

**2026-09-18 (why customers choose us)**
- Owner: a new **Website → Why choose us** page manages the cards in the home page band. Add, edit, reorder, hide or delete them, each with an icon, a title and a sentence. Delete them all and the four standard cards come back.

**2026-09-17 (load calculator button in the header)**
- Customer: the top menu's gold button is now **Load calculator** instead of **Get a quote** (which moved into the phone menu), the separate **Calculator** menu item is gone, and the floating **Size your system** button at the bottom right is gone too. **Chat on WhatsApp** still floats there.

**2026-09-17 (products on the website switch)**
- Owner: **Settings → Website → Homepage & contact** has a new switch, **Show products on the website**. Turn it off to sell packages only: customers stop seeing the Products menu item, the product sections on the home page and every product page. Packages keep their products, and nothing changes in the admin.

**2026-09-17 (brand red admin chrome)**
- Admin: the menu down the left and the bar across the top are now the deep Juwon red, with gold menu wording and the page you are on highlighted in white. Nothing moved and nothing works differently.

**2026-09-17 (settings opens on a section page)**
- Admin: **Settings** now opens **Business profile** straight away, with the list of settings pages beside it. The page of cards and the **Back to settings** link are gone.

**2026-09-17 (round hero photo dots)**
- Customer: the buttons that change the home page background photo are now round dots, and the "Scroll" prompt at the bottom of the banner is gone.

**2026-09-17 (brand red dark surfaces)**
- Customer: the website's dark areas (the home banner, page headers, dark sections and the footer) are now the deep Juwon red instead of near-black.

**2026-09-17 (mobile and footer motion)**
- Customer: on phones, sections now slide in from the left, the right and below as you scroll, and the footer animates in too.

**2026-09-17 (lifted scrolled header)**
- Customer: when you scroll the website, the top bar lifts into a floating, see-through dark bar so the logo and menu stay easy to read.

**2026-09-17 (nationwide wording)**
- Customer: the website now describes Juwon Electric as serving homes and businesses across Nigeria.

**2026-09-17 (checkout wording)**
- Customer: checkout and the order confirmation no longer mention a payment link; payment is agreed on the confirmation call. Order steps now describe "the items in your order", which can be a package, single products or both.

**2026-09-17 (Settings redesign)**
- Settings is now an overview with cards grouped under Business, Communication, Sales and Website, each opening its own page: **Business profile**, **Notification emails**, **Payments**, **Inventory**, **Homepage & contact**, **Financing** and **Load calculator**. New section in chapter 3, Finding your way around Settings.
- Each settings page has one **Save changes** button in a bar that appears when you change something, with **Discard**; it replaces **Save website**, **Save financing**, **Save calculator** and the other per-section buttons. Leaving with unsaved changes asks first.
- Updated the Settings paths in stories 4.3, 7.4, 9.3, 10A.5 to 10A.8, the chapter 10A roles table and troubleshooting; added troubleshooting for the unsaved-changes question and the missing Save button.

**2026-09-17 (Upload follow-ups)**
- Engineers add job photos by uploading or taking a photo on the phone (**Add photos**), with **Use a photo link instead** as a fallback (story 8.3).
- Staff profile photos are uploaded with **Choose image**; the field is now **Photo** (story 9.4).
- Adding images: new message "You’ve uploaded a lot of images in a short time. Wait a few minutes, then try again." and what to do, plus "That file is empty. Choose another image."; staff profiles and job photos added to the list of forms.
- Product image rows: the buttons now show their names (**Move up**, **Move down**, **Replace**, **Edit link**, **Remove**) on computers and tablets; phones keep the icons (story 7.2).
- Messages are now quoted exactly as the console shows them, including curly apostrophes.

**2026-09-17 (Image uploads)**
- New section in chapter 3, Adding images: **Choose image** or drag and drop, progress, **Replace** and **Remove**, JPEG, PNG and WebP only, big photos shrunk automatically, what each error message means, and **Use an image link instead**.
- Uploading images instead of typing links: services and customer segments (story 5.1), portfolio (story 5.2), categories (story 7.1), products with up to 10 images, the **Main** badge and **Move up** / **Move down** (story 7.2), review photos (story 10A.2), client logos, which stay transparent (story 10A.3), and team photos, now labelled **Photo** (stories 10A.8, 10A.9).
- Engineer job photos (story 8.3) and staff profile photos (story 9.4) are still added as links.
- Troubleshooting: image won't upload, image looks blurry, and wrong file type.

**2026-09-17 (motion on every page)**
- Customer: every page now opens with a dark photo header and animates like the home page; in the cart, a removed item folds away and **Undo** brings it back.

**2026-09-17 (navigation and floating buttons)**
- Customer: the Calculator link is hidden when the calculator is off; on phones the floating buttons appear after you scroll past the home page photo (stories 11.8, 11.13).

**2026-09-17 (Team page and home redesign)**
- Menu: **Team** added to the **Website** group (chapter 3).
- New story 10A.9, manage the team page: add and edit team members (**Name**, **Role**, **Group**, **Bio**, **Photo URL**, **LinkedIn URL**, **Show on the website**), order with **Move up** / **Move down**, **Filter by group**, hide or delete, and replace the 12 sample members.
- Owner: story 4.7 and story 10A.8 now include the sample team members. Corrected 10A.8: saving without changing anything, moving an item or switching it off keeps the Sample mark; only changing and saving removes it.
- Website settings: homepage stats now show in the hero and count up; WhatsApp also drives the hero button and the floating **Chat on WhatsApp** button; the calculator adds a floating **Size your system** button (stories 10A.5, 10A.7).
- Customer: new top menu (**Team** replaces **Careers** on computers; **Careers** stays in the phone menu and the footer) and **Get a quote**; new stories for the home page hero (photos, bars, pause button, stats, price card), the floating buttons (hidden on cart and checkout) and the **Our Team** page (stories 11.12 to 11.14); stories 11.6 and 11.10 updated.
- How updates reach the website: team member changes included (chapter 12).
- Troubleshooting: hero photos aren't changing, team member not showing, numbers show 0 briefly, and team page shows drawings instead of photos; WhatsApp button missing now mentions the cart and checkout.

**2026-09-17 (Landing v1)**
- New chapter 10A, Website content: edit **FAQs** (order and categories), add **Reviews** (real and permitted only), add **Client logos** (with permission; link or site path), fill in portfolio case-study details, set homepage stats, WhatsApp number and business hours, set up **Financing** or leave it off, set up the **Calculator**, and replace sample content before launch (stories 10A.1 to 10A.8).
- Menu: new **Website** group with FAQs, Reviews and Client logos (chapter 3).
- Owner: story 4.7, sign off website content using the Before launch checklist.
- Admin: story 5.2 points to the case-study details.
- Customer: contact page footer details, and new stories for the calculator, the FAQ page, the WhatsApp button and browsing case studies by category (stories 11.7 to 11.11).
- Troubleshooting: sample label showing on the website, calculator/financing not showing, WhatsApp button missing, and a home page section missing.

**2026-09-17 (home hero)**
- Customer: home page shortcuts by battery type and the starting package price (chapter 11).

**2026-09-17 (Commerce v3)**
- Installation jobs: a job can have a crew of up to 10 engineers, with a **Lead**; every crew member sees and can update the job, and newly added engineers are notified (stories 6.3, 8.1, 8.2).
- One installation job per order: **Create job** is hidden while the order has a job that isn't cancelled (story 6.3, troubleshooting).
- Job dialogs: **Scheduled for** uses a calendar with 15-minute times in Lagos time and **Clear**; **Estimated duration** uses hours and minutes, at least 15 minutes (story 6.3).
- In-store sales: customer name and phone are optional; blanks show as **Walk-in customer** and **No phone** (story 6.1).
- Product search lists the first 20 products as soon as you click into it, on the in-store sale page and in the package editor (stories 6.1, 7.5).
- Packages can have a **Category**; categories used by packages can't be deleted (stories 7.1, 7.5, troubleshooting).
- Website: customers can buy single products with **Add to cart**, in the same cart as packages; product-only website orders start with **Requires installation** off (stories 5.3, 11.3, 11.4a, 11.4, 11.5, troubleshooting).
- Roles table: engineers see jobs where they are on the crew.

**2026-09-17 (installation default)**
- Orders: new website orders start with **Requires installation** on; turn it off if the customer doesn't need our installation (story 5.3).

**2026-09-17 (installed step and menu)**
- Orders: every delivered order now offers **Mark as installed**; confirming turns on **Requires installation** if it was off (story 5.3).
- Menu: **New sale** is no longer in the sidebar. Start an in-store sale with **New in-store sale** on the Orders page (story 6.1).

**2026-09-17 (orders list)**
- Orders: fulfilment and payment now have separate labelled columns; payment labels are Unpaid and Part-paid; cancelled orders that were paid show **Refund due** (stories 5.3 and 6.2).

**2026-09-17 (later)**
- Sales rep: added Story 6.5, recording a return by cancelling a delivered in-store sale (stock goes back; update payment to Refunded if money is returned).
- Inventory manager: Story 7.5 now states that inventory managers don't edit packages (owner decision).

**2026-09-17**
- First version of the guide.
- Covers: sign-in and password reset; the roles table; Owner/Super admin (invites, roles, deactivation, Settings, dashboard, package price adjustment, activity log); Admin (services, customer segments, portfolio, order handling, carts); Sales rep (in-store sales with Collected now / Deliver or install later, discount with reason, insufficient stock, payment status, engineer assignment and installation jobs, message replies); Inventory manager (categories, products with specs, stock adjustments, low stock, composing packages, archiving); Engineer (My jobs); HR (vacancies and staff profiles); Support (messages, replies, newsletter); Customer (the new public website); how updates reach the website; troubleshooting.
