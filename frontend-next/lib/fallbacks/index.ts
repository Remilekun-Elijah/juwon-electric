// Local fallbacks the Vite site renders when the API is unavailable (FE_CONVENTIONS §3.4).
// Copied from frontend/src/pages/** and frontend/src/utils/{plans.json,helper.js}.
import type { PublicCustomerSegment, Package, PortfolioItem, ServiceOffering } from "@/lib/api/types";
import plans from "./plans.json";

/** frontend/src/utils/plans.json flattened, as Packages.jsx does. */
export const fallbackPackages: Package[] = (plans as { plan?: Package[] }[]).flatMap((group) => group.plan ?? []);

export type PortfolioTile = PortfolioItem & { mobile?: boolean };

const instagram = "https://www.instagram.com/juwon__electric?igsh=MWdkc3VrYjQ2b2lydQ%3D%3D";

/** Home "Our latest projects" (frontend/src/pages/Home/Portfolio.jsx). */
export const fallbackRecentWork: PortfolioTile[] = [
  { name: "2.1kwp Canadian Solar", image: "/image-1.jpg", link: "https://www.instagram.com/juwon__electric?igsh=MWdkc3VrYjQ2b2lydQ==", mobile: true },
  { name: "7.5Kva Lithium Battery", image: "/image-2.jpg", link: instagram, mobile: true },
  { name: "5Kva Tubular Battery", image: "/image-3.jpg", link: instagram, mobile: true },
  { name: "1.2kwp Canadian Solar", image: "/image-4.jpg", link: instagram, mobile: true },
  { name: "3.2Kva Tubular Battery", image: "/image-5.jpg", link: instagram, mobile: false },
  { name: "8.8kwp Canadian Solar", image: "/image-6.jpg", link: instagram, mobile: false },
  { name: "2.1kwp Trina Solar", image: "/image-7.jpg", link: instagram, mobile: false },
  { name: "10Kva Lithium Battery", image: "/image-8.jpg", link: instagram, mobile: false },
];

/** Portfolio page (frontend/src/pages/Portfolio.jsx). */
export const fallbackPortfolio: PortfolioTile[] = [
  { name: "2.1Kwp Trina Solar Panel", image: "/image-1.jpg", mobile: true },
  { name: "5Kva Tubular Battery Energy", image: "/image-3.jpg", mobile: true },
  { name: "8.8Kwp Canadian Solar Panel", image: "/image-6.jpg", mobile: true },
  { name: "7.5Kva Lithium Battery", image: "/image-2.jpg", mobile: true },
  { name: "550W Mono-Crystalline Solar Panel", image: "/portfolio-5.jpg", mobile: true },
  { name: "2.5Kva Tubular Battery Energy", image: "/portfolio-6.jpg", mobile: true },
  { name: "10Kva Lithium Battery Energy", image: "/portfolio-7.jpg", mobile: false },
  { name: "550W Mono-Crystalline Solar Panel", image: "/portfolio-8.jpg", mobile: false },
  { name: "10Kva Lithium Battery Energy", image: "/portfolio-9.jpg", mobile: false },
  { name: "1.2Kwp Canadian Solar Panel", image: "/image-4.jpg", mobile: false },
  { name: "7.5Kva Tubular Battery Energy", image: "/portfolio-11.jpg", mobile: false },
  { name: "550W Mono-Crystalline Solar Panel", image: "/portfolio-12.jpg", mobile: false },
];

/** Services "What we offer" (frontend/src/pages/Services/Services.jsx). */
export const fallbackOfferings: ServiceOffering[] = [
  {
    image: "/offer-1.svg",
    title: "System Design and Architecture",
    subtitle: `
      Our team does not just work, we do thorough inspections, assess the roof, and determine the best location for solar panels, batteries location and circuit boxes.

Spacing the power line is our priority. This application of theoretical knowledge has made us stand out among many.

We are here for you!

      `,
  },
  {
    image: "/offer-2.png",
    title: "Energy Audit",
    subtitle: `Our team provides expert assessments of your energy usage and solar potential, tailoring recommendations to best fit your unique residential and commercial properties.
`,
  },
  {
    image: "/offer-3.svg",
    title: "Light Solution",
    subtitle: `Light is needed everywhere and quick fixes are easy to find. At Juwon Electric, we take pride in delivering sustainable lighting solutions which is key.
`,
  },
  {
    image: "/offer-4.svg",
    title: "After Sales Services",
    subtitle: `Selling to a customer is like winning a game of chess because we trust our services which in turn generates a cohesive and lasting relationship with our clients.

We offer this After Sales Services.
`,
  },
  {
    image: "/offer-5.svg",
    title: "Maintenance ",
    subtitle: `Trust takes one higher. Our dedicated team does not rest until you are happy with the best maintenance of your equipment. Trust us to take you higher.`,
  },
];

/** Services "Our Customers" (frontend/src/pages/Services/Services.jsx). */
export const fallbackCustomers: PublicCustomerSegment[] = [
  {
    title: "Banking Sectors",
    subtitle: `Information technology must be reliable and available 24
                    hours a day, seven (7) days a week. Only solar systems and
                    back-up systems can provide such reliability for IT
                    Infrastructure, ATMs, and telecoms. This increases the reach
                    of the bank to more customers in rural, semi-urban areas,
                    Urban as well as schools and universities.`,
    image: "/panel-1.webp",
  },
  {
    title: "Hospitals",
    subtitle: `There is a demand for reliable and cost-effective electricity supplies to service remote medical and health care applications. Solar photovoltaic power is ideally suited to these applications because it is highly reliable, has low recurrent costs.`,
    image: "/panel-2.webp",
  },
  {
    title: "Community",
    subtitle: `We are capable of providing a large or small community with solar installations, such as; Mini grids, Solar powered boreholes, Solar powered street lights and solar powered community halls.`,
    image: "/panel-3.webp",
  },
  {
    title: "Farms",
    subtitle: `Most farms don’t have access to power. With our Solar powered system we provide electricity to farm and solar powered borehole for agriculture.`,
    image: "/panel-4.webp",
  },
  {
    title: "Government Institutions",
    subtitle: `Most government institution don’t have reliable power to aid their work. We provide reliable and sustainable power through renewable energy.`,
    image: "/panel-5.webp",
  },
  {
    title: "Academic Institutions",
    subtitle: `We design and install suitable solar and backup systems for schools in both urban and rural areas.`,
    image: "/panel-6.webp",
  },
];

/** About section tab copy (frontend/src/utils/helper.js `whatDrivesUs`). */
export const whatDrivesUs = [
  "We are a Nigerian energy company specialized in clean renewable energy - Particularly Inverter systems, Battery backup and Solar solutions. Over the years we have powered various homes, offices and government institution across the country. We are well known for our top notch professional installation and special love for premium quality. Our team are highly trained with vast experience, we sell and deploy only premium quality products.",
  "To lead the renewable energy revolution by empowering communities with reliable, sustainable, and innovative solar and inverter solutions, ensuring a brighter future for generations to come.",
  "We are well known for our top notch professional installation and special love for premium quality. Our team are highly trained with vast experience, we sell and deploy only premium quality products.",
];

export type Review = { name: string; img: string; message: string; rating: number };

/** Client testimonials, two per slide (frontend/src/pages/Home/Testimonials.jsx). */
export const reviews: Review[][] = [
  [
    {
      name: "Damilare James",
      img: "/person-1.svg",
      message: `It's working perfectly. It worth it.
        Have never been in a blackout for a sec. I Dey follow all the procedures told during installment. So I'm good.`,
      rating: 5,
    },
    {
      name: "Juliet Anthony",
      img: "/person-2.jpg",
      message:
        "Working well, except that more power is more consumption and more consumption is more expenditure 😄😄😄 \nNice job. My happiness\n level has increased.",
      rating: 4.5,
    },
  ],
  [
    {
      name: "Kehinde Ayodeji",
      img: "/person-3.svg",
      message:
        "Absolutely loved how professional your team was. Started using my inverter already and yes, I LOVE it already, Will definitely be back for more. I hundred percent recommend @juwon_electric to anyone looking to get an inverter.",
      rating: 5,
    },
    {
      name: "Victor Okonkwo",
      img: "/person-4.jpg",
      message: `
        Thanks for the good job juwon electric. I have never regret your services since am on the grid of 2.5kva inverter it Amazing, it has reduced the cost fuelling Gen and environmental population reduced totally.
        Thanks alot.`,
      rating: 4.5,
    },
  ],
  [
    {
      name: "Caroline Felix",
      img: "/person-5.svg",
      message: `
        No complaints!
Probably our fav purchase this year.
I also recommended a friend to you as well.
They just moved to Lagos so when they're ready, they will reach out.
Thank you.`,
      rating: 4.5,
    },
    {
      name: "Moses Adebayo",
      img: "/person-6.svg",
      message: `Thank you for your time and assistance. I am happy I chose Juwon Electric. You are absolutely unbelievable. 😃😃🔥🔥😇`,
      rating: 5,
    },
  ],
];
