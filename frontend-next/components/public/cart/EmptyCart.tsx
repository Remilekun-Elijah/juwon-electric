import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { buttonBase, buttonHover } from "@/lib/publicStyles";
import { routes } from "@/lib/site";

/** Port of frontend/src/pages/Cart/EmptyCartUi.jsx. */
export default function EmptyCart() {
  return (
    <div className="my-5 flex justify-center">
      <div className="text-center">
        <Image src="/emptyCart.svg" alt="" width={386} height={386} className="mx-auto" />
        <p className="inter-medium mb-1 text-xl leading-tight md:mb-2 md:text-[30px] lg:mb-3 lg:text-[35px]">Your cart is empty</p>
        <p className="inter-regular text-base text-[#838282] md:text-2xl">Start adding items to enjoy our services!</p>

        <Link href={routes.packages} className={cn(buttonBase, buttonHover, "mt-7 w-full border bg-brand-500 text-white md:mt-10")}>
          Go to packages
        </Link>
      </div>
    </div>
  );
}
