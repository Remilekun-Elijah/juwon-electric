import PublicChrome from "@/components/public/PublicChrome";

/** Public site chrome: skip link, fixed Navbar, main landmark, Footer. `app/admin` stays outside this group. */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return <PublicChrome>{children}</PublicChrome>;
}
