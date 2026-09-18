// Sample website content (LANDING_V1 §4, TEAM_AND_MOTION_V1 §1) for local development and review only. Every record
// and settings section is `sample: true`, so the admin and the storefront label it, and it must
// be replaced before launch. Used by backend/scripts/seed-sample-website.mjs (Express store) and
// backend/cloudflare/scripts/export-sample-website-sql.mjs (local D1). Never wired into
// migrations, seed.sql or CI.
//
// The wording is Juwon Electric's own. Answers describe how the platform actually works
// (PRODUCT_REQUIREMENTS.md §6): no payment to place an order, a confirmation call, the
// fulfilment steps, products sold individually, and the calculator.

export const SAMPLE_ID_PREFIX = "sample-";

// Fixed timestamps keep the seed idempotent and the order stable.
const SEEDED_AT = "2026-09-17T08:00:00.000Z";
const at = (index) => new Date(Date.parse(SEEDED_AT) + index * 1000).toISOString();

const records = (prefix, items) =>
  items.map((item, index) => ({
    id: `${SAMPLE_ID_PREFIX}${prefix}-${index + 1}`,
    ...item,
    sortOrder: index + 1,
    isActive: true,
    sample: true,
    createdAt: at(index),
    updatedAt: at(index),
  }));

// ---- FAQs (8) -------------------------------------------------------------------------------

export const SAMPLE_FAQS = records("faq", [
  {
    question: "Do I pay to place an order?",
    answer:
      "No. Placing an order on our website is free. After you order, our team calls you to confirm the details and arrange payment with you.",
    category: "Ordering",
  },
  {
    question: "How long does installation take?",
    answer:
      "Most home systems are installed and tested in one day. Larger systems with many panels can take two to three days. Your engineer confirms the timeline with you before the visit.",
    category: "Installation",
  },
  {
    question: "Can I buy a single battery or inverter?",
    answer:
      "Yes. Inverters, batteries and solar panels are sold individually on the Products page. Add what you need to your cart and order it the same way as a package.",
    category: "Products",
  },
  {
    question: "What's the difference between tubular and lithium batteries?",
    answer:
      "Tubular batteries cost less up front but are heavier, need a ventilated space and regular water top-ups.\nLithium batteries cost more but are lighter, need no maintenance, charge faster and last for many more charge cycles.\nEvery product page lists the battery's full specs.",
    category: "Products",
  },
  {
    question: "Which states do you cover?",
    answer:
      "We deliver and install across Nigeria. Delivery and installation costs depend on your location, and we confirm them with you on the confirmation call.",
    category: "Installation",
  },
  {
    question: "What happens after I order?",
    answer:
      "1. We call you to confirm your order and arrange payment.\n2. We prepare your equipment.\n3. Your order goes out for delivery.\n4. When your order includes installation, our engineers install and test the system after delivery.\nYou can call us at any step.",
    category: "Ordering",
  },
  {
    question: "Can I add solar panels later?",
    answer:
      "Yes. Many customers start with an inverter and batteries and add panels later. Our packages come with and without solar, so tell us your plans when we call and we'll recommend an inverter that can take panels later.",
    category: "Products",
  },
  {
    question: "How do I choose a package size?",
    answer:
      "Use our solar calculator: pick the appliances you want to power and it estimates the inverter size, batteries and panels you need, then shows matching packages. If you're not sure, talk to an engineer and we'll recommend a size before installation.",
    category: "Ordering",
  },
]);

// ---- Reviews (6) ------------------------------------------------------------------------------

export const SAMPLE_TESTIMONIALS = records("review", [
  {
    name: "Adaeze O.",
    context: "3.5kVA lithium, Ikeja",
    quote:
      "I ordered on the website late at night and got a call the next morning to confirm everything. No payment until they called. Installation was done the same week.",
    rating: 5,
    source: "google",
    imageUrl: null,
  },
  {
    name: "Tunde B.",
    context: "5kVA tubular system, Surulere",
    quote:
      "NEPA took light for three days on our street and my house stayed on the whole time. The engineers explained how to check the batteries before they left.",
    rating: 5,
    source: "whatsapp",
    imageUrl: null,
  },
  {
    name: "Chioma E.",
    context: "2.5kVA inverter and batteries, Lekki",
    quote:
      "The calculator helped me see that I didn't need a big system for my flat. The team confirmed the size on the call and the installation was neat and quick.",
    rating: 4,
    source: "website",
    imageUrl: null,
  },
  {
    name: "Ibrahim M.",
    context: "10kVA lithium with solar, Abuja",
    quote:
      "We run our small office on solar during the day now. Delivery to Abuja was arranged on the confirmation call and the engineers tested every circuit.",
    rating: 5,
    source: "in_person",
    imageUrl: null,
  },
  {
    name: "Folake A.",
    context: "Clinic backup system, Ibadan",
    quote:
      "Our clinic fridge and lights no longer go off when the grid fails. The engineers came back after a month to check the system without us asking.",
    rating: 4,
    source: "facebook",
    imageUrl: null,
  },
  {
    name: "Emeka N.",
    context: "Single lithium battery, Kano",
    quote:
      "I only needed one extra battery for my existing inverter. I found it on the Products page, ordered it, and they called within the hour to confirm.",
    rating: 5,
    source: "website",
    imageUrl: null,
  },
]);

// ---- Client logos (6): fictional names; neutral text-logo SVGs live in frontend-next/public/samples.

export const SAMPLE_CLIENTS = records("client", [
  { name: "Lagoon View Clinic", logoUrl: "/samples/client-1.svg", website: null },
  { name: "Crestfield Academy", logoUrl: "/samples/client-2.svg", website: null },
  { name: "Palmgrove Farms", logoUrl: "/samples/client-3.svg", website: null },
  { name: "Northbridge Microfinance", logoUrl: "/samples/client-4.svg", website: null },
  { name: "Unity Court Residents", logoUrl: "/samples/client-5.svg", website: null },
  { name: "Brightpath Logistics", logoUrl: "/samples/client-6.svg", website: null },
]);

// ---- Team members (12, TEAM_AND_MOTION_V1 §1): fictional names; illustrated placeholder portraits
// live in frontend-next/public/samples/team. Groups appear on the team page in this order.

const LEADERSHIP = "Leadership";
const ENGINEERING = "Engineering & installations";
const SALES = "Sales & customer care";
const OPERATIONS = "Operations";

const member = (index, name, role, group, bio) => ({
  name,
  role,
  group,
  bio,
  photoUrl: `/samples/team/member-${index}.svg`,
  linkedinUrl: null,
});

export const SAMPLE_TEAM_MEMBERS = records("team", [
  member(1, "Adebayo Ogunleye", "Managing director", LEADERSHIP,
    "Leads the business and signs off every large installation before it is handed over to the customer."),
  member(2, "Chiamaka Nwosu", "Head of engineering", LEADERSHIP,
    "Reviews the sizing behind every quote so each customer gets an inverter and battery bank that fits their load."),
  member(3, "Ifeanyi Obi", "Lead installation engineer", ENGINEERING,
    "Plans installation days and leads the crew that mounts panels, wires inverters and tests each system."),
  member(4, "Kehinde Alabi", "Solar design engineer", ENGINEERING,
    "Sizes systems from customers' appliance lists and site visits, then lays out the panels and batteries."),
  member(5, "Musa Danjuma", "Installation technician", ENGINEERING,
    "Installs inverters and batteries and walks customers through their new system before leaving the site."),
  member(6, "Tolulope Akinwale", "Electrical technician", ENGINEERING,
    "Handles changeover wiring and earthing so every system switches cleanly between the grid and backup."),
  member(7, "Blessing Okafor", "Sales lead", SALES,
    "Helps customers choose the right package and explains what each system can power in their home or office."),
  member(8, "Yetunde Salami", "Customer care officer", SALES,
    "Makes the confirmation call after each order and keeps customers updated from processing to delivery."),
  member(9, "Emmanuel Udoh", "After-sales support officer", SALES,
    "Books maintenance visits and follows up on battery and inverter questions after installation."),
  member(10, "Aisha Bello", "Operations manager", OPERATIONS,
    "Coordinates stock, delivery and installation dates so every order moves through fulfilment on time."),
  member(11, "Segun Oladipo", "Logistics coordinator", OPERATIONS,
    "Arranges delivery of panels, inverters and batteries to customers' sites across Nigeria."),
  member(12, "Halima Yusuf", "Inventory officer", OPERATIONS,
    "Keeps stock counts accurate so the prices and availability shown on the website stay current."),
]);

// ---- Portfolio case-study fields for the existing records ---------------------------------------
// `id` is the record id in D1 (backend/data/catalog-ids.json). The Express JSON store generates
// its own ids, so the Express seed falls back to `slug` + `sortOrder` (backend/data/seed.js order).
// `category` is a customer-segment slug.

export const SAMPLE_PORTFOLIO = [
  {
    id: "4aa57972-706d-4a7a-81af-b5e8b7f9766a",
    slug: "2-1kwp-trina-solar-panel",
    sortOrder: 1,
    category: "academic-institutions",
    location: "Ikorodu, Lagos",
    system: "5kVA inverter, 4 × 200Ah tubular batteries, 4 × 550W panels",
    summary: "Daytime solar for a primary school's classrooms and staff room, so lessons no longer stop when the grid goes off.",
  },
  {
    id: "ebc263ec-8266-4a3f-8a9a-ab49b0eb891f",
    slug: "7-5kva-lithium-battery",
    sortOrder: 2,
    category: "hospitals",
    location: "Surulere, Lagos",
    system: "7.5kVA inverter, 2 × 5kWh lithium batteries",
    summary: "Backup power for a clinic's consulting rooms, vaccine fridge and lighting, switching over without a break.",
  },
  {
    id: "7566f276-5fc8-43aa-b043-3e6193c94558",
    slug: "5kva-tubular-battery-energy",
    sortOrder: 3,
    category: "community",
    location: "Ikeja, Lagos",
    system: "5kVA inverter, 4 × 220Ah tubular batteries",
    summary: "Shared backup for an estate gatehouse, security lights and CCTV through the night.",
  },
  {
    id: "27148cbc-5fb8-4beb-92f4-4448b9689f06",
    slug: "1-2kwp-canadian-solar-panel",
    sortOrder: 4,
    category: "farms",
    location: "Wuse, Abuja",
    system: "3kVA inverter, 2 × 200Ah tubular batteries, 3 × 400W panels",
    summary: "Solar power for a poultry farm's lighting and water pump, cutting daily generator use.",
  },
  {
    id: "5ae9fa72-1d40-4eb2-90ba-855523897bbc",
    slug: "3-2kva-tubular-battery",
    sortOrder: 5,
    category: "community",
    location: "Yaba, Lagos",
    system: "3.5kVA inverter, 2 × 220Ah tubular batteries",
    summary: "A compact backup system for a community centre's hall lighting, fans and sound system.",
  },
  {
    id: "63e34b6b-7830-4053-ba14-6cb01f4ee089",
    slug: "8-8kwp-canadian-solar-panel",
    sortOrder: 6,
    category: "government-institutions",
    location: "Port Harcourt, Rivers",
    system: "15kVA inverter, 4 × 10kWh lithium batteries, 16 × 550W panels",
    summary: "Solar and storage for a local government records office, keeping computers and air conditioning running in office hours.",
  },
  {
    id: "1225e47f-c417-4e3e-b535-8626010c1e4b",
    slug: "2-1kwp-trina-solar",
    sortOrder: 7,
    category: "academic-institutions",
    location: "Abeokuta, Ogun",
    system: "5kVA inverter, 2 × 5kWh lithium batteries, 4 × 550W panels",
    summary: "Solar power for a secondary school's computer lab, so practical classes run on schedule.",
  },
  {
    id: "c99d942b-59ff-4ed8-a87f-8168a9139c14",
    slug: "10kva-lithium-battery",
    sortOrder: 8,
    category: "banking-sectors",
    location: "Victoria Island, Lagos",
    system: "10kVA inverter, 3 × 5kWh lithium batteries",
    summary: "Uninterrupted power for a microfinance branch's servers, ATM and banking hall.",
  },
  {
    id: "b1cf5bed-e8aa-454d-b498-52ef888a9bbb",
    slug: "550w-mono-crystalline-solar-panel",
    sortOrder: 9,
    category: "farms",
    location: "Ogun State",
    system: "5kVA inverter, 4 × 200Ah tubular batteries, 6 × 550W panels",
    summary: "A solar-powered borehole pump and cold room lighting for a vegetable farm.",
  },
  {
    id: "e937f944-5e9e-4cea-93be-0c2d7f27ba4f",
    slug: "2-5kva-tubular-battery-energy",
    sortOrder: 10,
    category: "community",
    location: "Enugu, Enugu",
    system: "2.5kVA inverter, 2 × 200Ah tubular batteries",
    summary: "Evening lighting and phone charging for a neighbourhood association's meeting hall.",
  },
  {
    id: "5622e0d0-b8e1-4b9c-835b-c8191531626e",
    slug: "10kva-lithium-battery-energy",
    sortOrder: 11,
    category: "hospitals",
    location: "Ibadan, Oyo",
    system: "10kVA inverter, 4 × 5kWh lithium batteries",
    summary: "Backup for a maternity clinic's theatre lights, oxygen concentrators and nurses' station.",
  },
  {
    id: "f06d012e-e026-47cd-90aa-03832e41ea14",
    slug: "550w-mono-crystalline-solar-panel",
    sortOrder: 12,
    category: "government-institutions",
    location: "Ikeja, Lagos",
    system: "7.5kVA inverter, 2 × 10kWh lithium batteries, 10 × 550W panels",
    summary: "Daytime solar for a public health office, reducing diesel spend on its generator.",
  },
  {
    id: "3e6e8a4e-2b18-44ab-aa8e-9d208ce001b2",
    slug: "10kva-lithium-battery-energy",
    sortOrder: 13,
    category: "banking-sectors",
    location: "Lekki, Lagos",
    system: "10kVA inverter, 4 × 5kWh lithium batteries",
    summary: "Power continuity for a bank branch's network equipment and customer service desks.",
  },
  {
    id: "c173b02d-6f84-4630-b1d1-d789ce92fe9a",
    slug: "7-5kva-tubular-battery-energy",
    sortOrder: 14,
    category: "academic-institutions",
    location: "Ota, Ogun",
    system: "7.5kVA inverter, 8 × 220Ah tubular batteries",
    summary: "Night-time power for a boarding school's hostels and study rooms.",
  },
  {
    id: "318ec7db-aac4-4e95-b07c-1e28241acfe6",
    slug: "550w-mono-crystalline-solar-panel",
    sortOrder: 15,
    category: "farms",
    location: "Benin City, Edo",
    system: "3kVA inverter, 2 × 200Ah tubular batteries, 4 × 550W panels",
    summary: "Solar power for a fish farm's aerators and water circulation pumps.",
  },
];

// ---- Settings sections ----------------------------------------------------------------------------

export const SAMPLE_SETTINGS = {
  website: {
    stats: [
      { label: "Installations", value: "500+" },
      { label: "Years in business", value: "10+" },
      { label: "Engineers", value: "25" },
      { label: "Average install time", value: "1 day" },
    ],
    whatsappNumber: "+2348000000000",
    businessHours: "Mon–Sat 8am–6pm",
    productsEnabled: true,
    sample: true,
  },
  financing: {
    enabled: true,
    depositPercent: 40,
    termsMonths: [3, 6, 12],
    monthlyRatePercent: 3.5,
    approvalTime: "48 hours",
    note: "Sample terms — not an offer.",
    sample: true,
  },
  calculator: {
    enabled: true,
    appliances: [
      { key: "fan", label: "Fan", watts: 75, defaultHours: 8, defaultQuantity: 2 },
      { key: "led-bulb", label: "LED bulb", watts: 10, defaultHours: 6, defaultQuantity: 6 },
      { key: "tv", label: "TV", watts: 120, defaultHours: 5, defaultQuantity: 1 },
      { key: "decoder", label: "Decoder", watts: 25, defaultHours: 5, defaultQuantity: 1 },
      { key: "laptop", label: "Laptop", watts: 65, defaultHours: 4, defaultQuantity: 1 },
      { key: "phone-charging", label: "Phone charging", watts: 10, defaultHours: 3, defaultQuantity: 3 },
      { key: "fridge", label: "Fridge", watts: 150, defaultHours: 12, defaultQuantity: 1 },
      { key: "freezer", label: "Freezer", watts: 200, defaultHours: 12, defaultQuantity: 0 },
      { key: "washing-machine", label: "Washing machine", watts: 500, defaultHours: 1, defaultQuantity: 0 },
      { key: "microwave", label: "Microwave", watts: 1000, defaultHours: 0.5, defaultQuantity: 0 },
      { key: "ac-1hp", label: "1hp air conditioner", watts: 900, defaultHours: 4, defaultQuantity: 0 },
      { key: "pumping-machine", label: "Pumping machine", watts: 750, defaultHours: 0.5, defaultQuantity: 0 },
    ],
    inverterHeadroomPercent: 25,
    batteryDepthOfDischargePercent: 80,
    batteryVoltage: 48,
    panelWatts: 550,
    peakSunHours: 4.5,
    generator: { fuelPricePerLitre: 1000, litresPerKvaHour: 0.25, maintenancePerMonth: 20000 },
    sample: true,
  },
};

// ---- Why customers choose us (4) ------------------------------------------------------------
// The wording the storefront shipped with: only claims the platform can back up.

export const SAMPLE_REASONS = records("reason", [
  {
    icon: "wrench",
    title: "Professionally Installed & Commissioned",
    text: "Every system is installed, tested and commissioned by our trained engineering team to ensure safety, performance and reliability.",
  },
  {
    icon: "clipboard",
    title: "Quality Equipment. Clear Specifications.",
    text: "We use carefully selected inverters, batteries and solar panels from trusted manufacturers, with system specifications clearly stated.",
  },
  {
    icon: "phone",
    title: "Flexible & Secure Order Process",
    text: "Place your order or request a consultation without immediate payment. Our team will confirm your requirements and installation details before payment is required.",
  },
  {
    icon: "badge",
    title: "Transparent Pricing & Availability",
    text: "Our prices and product availability are regularly updated, giving you clear and accurate information when making your decision.",
  },
]);

/** Sample records per content collection. */
export const SAMPLE_COLLECTIONS = {
  faqs: SAMPLE_FAQS,
  testimonials: SAMPLE_TESTIMONIALS,
  clients: SAMPLE_CLIENTS,
  teamMembers: SAMPLE_TEAM_MEMBERS,
  reasons: SAMPLE_REASONS,
};

export const SAMPLE_SEEDED_AT = SEEDED_AT;

/**
 * True when a stored settings section may be replaced by the sample: it is missing, still
 * sample content, or empty (never configured). Mirrored in SQL by the D1 exporter.
 */
export const isSeedableSection = (section, value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return true;
  if (value.sample === true) return true;
  const empty = (key) => value[key] === undefined || value[key] === null;
  const noItems = (key) => !Array.isArray(value[key]) || value[key].length === 0;
  if (section === "website") return noItems("stats") && empty("whatsappNumber") && empty("businessHours");
  if (section === "financing") return value.enabled !== true && noItems("termsMonths") && empty("depositPercent");
  if (section === "calculator") return value.enabled !== true && noItems("appliances");
  return false;
};
