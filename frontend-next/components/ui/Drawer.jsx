"use client";

import {
  Description,
  Dialog as HeadlessDialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { closeButtonClasses } from "./Dialog";

const sizes = { md: "sm:max-w-md", lg: "sm:max-w-xl" };

/**
 * Drawer (right side panel on Headless UI Dialog; full width on mobile). Props: open, onClose(), title, description,
 * children (scrolling body), footer (right-aligned buttons), size (md = 448px | lg = 576px), initialFocus (ref),
 * className (panel), bodyClassName.
 */
export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  initialFocus,
  className,
  bodyClassName,
}) {
  return (
    <Transition show={Boolean(open)}>
      <HeadlessDialog onClose={() => onClose?.()} initialFocus={initialFocus} className="relative z-50">
        <TransitionChild
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div aria-hidden="true" className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity" />
        </TransitionChild>
        <div className="fixed inset-0 flex justify-end overflow-hidden">
          <TransitionChild
            enter="transform transition ease-[cubic-bezier(0.22,1,0.36,1)] duration-300"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="transform transition ease-in duration-200"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <DialogPanel
              className={cn(
                "flex h-full w-full flex-col border-l border-slate-200 bg-white text-slate-900 shadow-elev-5",
                sizes[size] ?? sizes.md,
                className
              )}
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
                <div className="min-w-0 space-y-1">
                  {title && <DialogTitle className="text-lg font-semibold text-slate-900">{title}</DialogTitle>}
                  {description && <Description className="text-sm text-slate-500">{description}</Description>}
                </div>
                <button type="button" onClick={() => onClose?.()} aria-label="Close" className={cn("relative -mr-1 mt-0.5 shrink-0", closeButtonClasses)}>
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
              <div className={cn("flex-1 space-y-6 overflow-y-auto px-6 py-5", bodyClassName)}>{children}</div>
              {footer && (
                <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-6 py-4 sm:flex-row sm:justify-end">
                  {footer}
                </div>
              )}
            </DialogPanel>
          </TransitionChild>
        </div>
      </HeadlessDialog>
    </Transition>
  );
}

export default Drawer;
