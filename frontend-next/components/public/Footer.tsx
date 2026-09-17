import Image from "next/image";
import Link from "next/link";
import { routes } from "@/lib/site";
import NewsletterForm from "./NewsletterForm";

// Footer column heading and link list: same size, weight and rhythm in every column.
const footerHeading = "inter-medium text-lg leading-snug text-white mb-4";
const footerList = "text-center text-base leading-relaxed space-y-2";
const footerLink = "rounded-sm hover:underline underline-offset-4 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white";

/** Port of frontend/src/components/Footer.jsx. The newsletter form is a client island. */
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-deep_red p-5">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center text-[#E67E82] md:mt-10 md:items-stretch lg:justify-between">
          <div className="about mb-10 mt-8 md:mt-0 lg:mb-0">
            <Image src="/logo.svg" alt="Juwon Electric" width={88} height={62} className="mx-auto md:mx-0" />
            <p className="inter-medium my-5 text-center text-lg leading-snug text-[#E67E82] md:text-left">
              Stay informed about our latest product.
            </p>
            <NewsletterForm />
          </div>

          <nav
            aria-label="Footer"
            className="flex flex-col flex-wrap items-center justify-center gap-10 text-center md:flex-row md:items-start md:justify-between md:text-left"
          >
            <div>
              <h2 className={footerHeading}>Support</h2>
              <ul className={footerList}>
                <li>
                  <Link className={footerLink} href={routes.contact}>
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link className={footerLink} href={routes.contact}>
                    Contact us
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h2 className={footerHeading}>Help and Solution</h2>
              <ul className={footerList}>
                <li>
                  <Link className={footerLink} href={routes.contact}>
                    Talk to support
                  </Link>
                </li>
                <li>
                  <Link className={footerLink} href={routes.contact}>
                    Urgent response
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h2 className={footerHeading}>Product</h2>
              <ul className={footerList}>
                <li>
                  <Link className={footerLink} href={routes.packages}>
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link className={footerLink} href={routes.products}>
                    Products
                  </Link>
                </li>
                <li>
                  <Link className={footerLink} href={routes.vacancies}>
                    Careers
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-5 text-[#E67E82] md:text-white lg:justify-between">
          <p className="text-center">© {currentYear} Juwon Electric Inc. Copyright and rights reserved</p>

          {/* The Vite site links these to nowhere; they stay plain text until the pages exist. */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 md:gap-10">
            <span>Terms and Conditions</span>
            <ul>
              <li className="md:list-disc">
                <span>Privacy Policy</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
