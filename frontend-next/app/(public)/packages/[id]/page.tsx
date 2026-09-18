import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import PackageDetailActions from "@/components/public/packages/PackageDetailActions";
import { getPackage, getPackages } from "@/lib/api/public";
import { isr, readOr } from "@/lib/api/server";
import type { Package } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { fallbackPackages } from "@/lib/fallbacks";
import { getAmount } from "@/lib/format";
import { packagePath, packageTitle } from "@/lib/packages";
import { sectionTitle, siteContainer } from "@/lib/publicStyles";
import { routes } from "@/lib/site";

export const revalidate = 300;
export const dynamicParams = true;

/** Pre-render every known package; new ones render on first request and are then cached (ISR). */
export async function generateStaticParams() {
  const packages = await readOr("GET /packages (static params)", () => getPackages(isr(["packages"])), fallbackPackages, (items) => items.length === 0);
  return packages.data.map((item) => ({ id: String(item.id) }));
}

/**
 * `GET /packages/:id`. A 404 means the package is gone; any other failure falls back to the local plans so a
 * backend outage doesn't turn every detail page into a 404.
 */
async function loadPackage(id: string): Promise<Package | null> {
  const fallback = fallbackPackages.find((item) => String(item.id) === id) ?? null;
  const result = await readOr(`GET /packages/${id}`, () => getPackage(id, isr(["packages", `package:${id}`])), fallback);
  if (result.notFound) return null;
  return result.data;
}

export async function generateMetadata({ params }: PageProps<"/packages/[id]">): Promise<Metadata> {
  const { id } = await params;
  const item = await loadPackage(id);
  if (!item) return { title: "Package not found", robots: { index: false } };

  const prices = item.options.map((option) => `${option.name}: ₦${getAmount(option.price)}`).join("; ");
  const title = packageTitle(item);
  const description = `${title} for ${item.load}. ${prices}.`;
  return {
    title,
    description,
    alternates: { canonical: packagePath(item) },
    openGraph: { url: packagePath(item), title: `${title} | Juwon Electric`, description },
  };
}

export default async function PackageDetailPage({ params }: PageProps<"/packages/[id]">) {
  const { id } = await params;
  const item = await loadPackage(id);
  if (!item) notFound();

  return (
    <div className="bg-cover bg-center pb-20 pt-32" style={{ backgroundImage: "url('/contactBackground.jpg')" }}>
      <div className={cn(siteContainer, "max-w-3xl")}>
        <nav aria-label="Breadcrumb" className="mb-6">
          <Link
            href={routes.packages}
            className="inter-medium inline-flex items-center gap-1 rounded-sm text-faint hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            All packages
          </Link>
        </nav>

        <h1 className={cn("mb-3 text-center text-deep_red", sectionTitle)}>{packageTitle(item)}</h1>
        <p className="inter-medium mb-10 text-center text-base capitalize leading-relaxed text-faint">
          {item.type} package
        </p>

        <div className="mx-auto max-w-md">
          <PackageDetailActions item={item} />
        </div>

        {item.items && item.items.length > 0 && (
          <section aria-labelledby="package-contents" className="mt-12 rounded-xl bg-white p-6 shadow-sm">
            <h2 id="package-contents" className="sora-semibold mb-4 text-xl text-deep_red">
              What&apos;s included
            </h2>
            <ul className="space-y-2">
              {item.items.map((line) => (
                <li key={line.productId} className="inter-regular flex justify-between gap-4 text-base">
                  <span>
                    {line.name}
                    {line.note ? <span className="text-faint"> — {line.note}</span> : null}
                  </span>
                  <span className="inter-semibold shrink-0">× {line.quantity}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
