/**
 * Compile-time proof that the .jsx UI kit is usable from strict .tsx (review FE1-1, FE_ACCEPTANCE §A).
 * Not a route and never imported: `next build` / `tsc --noEmit` type-check it on every commit.
 * Each export is used with only its required props, then with common optional props.
 */
import Link from "next/link";
import { useRef } from "react";
import { Inbox, Trash2 } from "lucide-react";
import * as UI from "@/components/ui";
import { Button as ButtonByPath } from "@/components/ui/Button";
import { Table as TableByPath } from "@/components/ui/Table";

export function KitTypecheck() {
  const ref = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const classes: string[] = [
    UI.buttonClasses(),
    UI.buttonClasses({ variant: "outline", size: "sm", className: ["x", false] }),
    UI.buttonVariants.primary,
    UI.buttonSizes.md,
    UI.fieldClasses,
  ];
  const page = UI.paginate([1, 2, 3], 1, 2);
  const pages: (number | string)[] = UI.getPageItems(page.page, page.totalPages);
  const meta: { tone: UI.Tone; label: string } = UI.getStatusMeta("order", "pending");
  const statuses = [UI.statusMaps.order.pending, UI.defaultStatus.payment];

  return (
    <UI.Container>
      {/* Only required props */}
      <UI.Button>go</UI.Button>
      <ButtonByPath>go</ButtonByPath>
      <UI.Spinner />
      <UI.Input />
      <UI.SearchInput />
      <UI.Textarea />
      <UI.Select />
      <UI.Field>{null}</UI.Field>
      <UI.Label>label</UI.Label>
      <UI.Checkbox />
      <UI.Radio />
      <UI.Switch />
      <UI.Card>card</UI.Card>
      <UI.CardHeader />
      <UI.CardTitle>title</UI.CardTitle>
      <UI.CardDescription />
      <UI.CardContent />
      <UI.CardFooter />
      <UI.ListCardHeader title="List" />
      <UI.Badge>badge</UI.Badge>
      <UI.StatusBadge type="order" />
      <UI.Table />
      <TableByPath />
      <UI.THead />
      <UI.TBody />
      <UI.TR />
      <UI.TH />
      <UI.TD />
      <UI.TableEmpty colSpan={3} />
      <UI.Pagination page={1} totalItems={0} />
      <UI.EmptyState />
      <UI.ErrorState />
      <UI.LoadingState />
      <UI.Skeleton />
      <UI.Alert>message</UI.Alert>
      <UI.Dialog open={false} />
      <UI.ConfirmDialog open={false} />
      <UI.Drawer open={false} />
      <UI.Tabs aria-label="Tabs" value="a" items={[{ value: "a", label: "A" }]} />
      <UI.TabPanel id="t" value="a" active />
      <UI.PageHeader title="Title" />
      <UI.StatCard label="KPI" />
      <UI.Avatar />
      <UI.Toaster />

      {/* Common optional props */}
      <UI.Button as={Link} href="/" variant="ghost" size="icon" icon={<Trash2 />} loading loadingText="Saving" ref={ref} />
      <UI.Button type="submit" onClick={() => UI.toast.success("ok")} disabled aria-label="Save" />
      <UI.Input ref={inputRef} size="lg" invalid type="email" name="email" onChange={(event) => event.target.value} />
      <UI.Select options={["a", { value: "b", label: "B", disabled: true }]} placeholder="Pick" size="lg" />
      <UI.Field label="Name" helper="Help" error="Required" required>
        {({ id, describedBy, invalid }) => <input id={id} aria-describedby={describedBy} aria-invalid={invalid} />}
      </UI.Field>
      <UI.Checkbox label="Remember" description="On this device" defaultChecked inputClassName="x" />
      <UI.Switch checked onChange={(value: boolean) => value} label="On" description="Toggle" aria-label="Toggle" />
      <UI.Card as="section" className="p-4" id="card" />
      <UI.Badge tone="brand" dot className="x" />
      <UI.StatusBadge type="catalog" status={false} label="Hidden" dot />
      <UI.Table header={<UI.ListCardHeader title="T" count={2} actions={<UI.Button size="sm">Add</UI.Button>} />} bare aria-label="T">
        <UI.THead>
          <UI.TH align="right" srOnly>
            Actions
          </UI.TH>
        </UI.THead>
        <UI.TBody>
          <UI.TR selected interactive onClick={() => undefined}>
            <UI.TD align="center">1</UI.TD>
          </UI.TR>
          <UI.TableEmpty colSpan={1} icon={Inbox} title="Empty" />
        </UI.TBody>
      </UI.Table>
      <UI.Pagination page={2} totalItems={40} pageSize={10} onChange={(next: number) => next} itemLabel="orders" bordered={false} />
      <UI.EmptyState icon={Inbox} title="None" description="Nothing yet" action={<UI.Button>Add</UI.Button>} standalone />
      <UI.ErrorState onRetry={() => undefined} retrying standalone />
      <UI.Alert tone="error" title="Failed" icon={false} onDismiss={() => undefined} />
      <UI.Dialog open onClose={() => undefined} title="T" description="D" footer={<UI.Button>OK</UI.Button>} size="lg" initialFocus={ref} role="alertdialog">
        body
      </UI.Dialog>
      <UI.ConfirmDialog open onClose={() => undefined} onConfirm={() => undefined} title="Delete?" loading tone="warning" confirmIcon={<Trash2 />} />
      <UI.Drawer open onClose={() => undefined} title="Edit" footer={<UI.Button>Save</UI.Button>} size="lg" />
      <UI.Tabs
        aria-label="Status"
        value="open"
        onChange={(value: string) => value}
        items={[{ value: "open", label: "Open", icon: Inbox, count: 2, disabled: false }]}
        id="status"
        withPanels
        fullWidth
      />
      <UI.PageHeader eyebrow="Admin" title="Orders" description="All orders" actions={<UI.Button>New</UI.Button>} titleAs="h2" />
      <UI.StatCard label="Revenue" value="₦0" helper="Today" icon={Inbox} tone="success" href="/admin" loading />
      <UI.Avatar name="Juwon Electric" src="/logo.svg" size="xl" decorative />
      <UI.Toaster position="bottom-center" />
      <span hidden>{[classes.length, pages.length, meta.label, statuses.length].join()}</span>
    </UI.Container>
  );
}
