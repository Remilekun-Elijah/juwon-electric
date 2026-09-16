"use client";

import { useRef } from "react";
import {
  Description,
  Dialog as HeadlessDialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

const sizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

export const closeButtonClasses =
  "rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500";

/**
 * Dialog (Headless UI; Escape and overlay click call onClose). Props: open, onClose(), title, description, children (body),
 * footer (buttons; stacked on mobile, right-aligned on sm+), size (sm|md|lg), hideClose, initialFocus (ref),
 * role ("dialog"|"alertdialog"), className (panel), bodyClassName.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  hideClose = false,
  initialFocus,
  role,
  className,
  bodyClassName,
}) {
  return (
    <Transition show={Boolean(open)}>
      <HeadlessDialog onClose={() => onClose?.()} initialFocus={initialFocus} role={role} className="relative z-50">
        <TransitionChild
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div aria-hidden="true" className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" />
        </TransitionChild>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 sm:items-center">
            <TransitionChild
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel
                className={cn(
                  "relative w-full rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-elev-5 transition",
                  sizes[size] ?? sizes.md,
                  className
                )}
              >
                {!hideClose && (
                  <button
                    type="button"
                    onClick={() => onClose?.()}
                    aria-label="Close"
                    className={cn("absolute right-4 top-4", closeButtonClasses)}
                  >
                    <X aria-hidden="true" className="h-4 w-4" />
                  </button>
                )}
                {(title || description) && (
                  <div className={cn("space-y-1.5", !hideClose && "pr-8")}>
                    {title && (
                      <DialogTitle className="text-lg font-semibold leading-none tracking-tight text-slate-900">
                        {title}
                      </DialogTitle>
                    )}
                    {description && <Description className="text-sm text-slate-500">{description}</Description>}
                  </div>
                )}
                {children && <div className={cn((title || description) && "mt-4", bodyClassName)}>{children}</div>}
                {footer && (
                  <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>
                )}
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </HeadlessDialog>
    </Transition>
  );
}

const confirmTones = {
  danger: { tile: "bg-red-100 text-red-600", button: "destructive" },
  warning: { tile: "bg-amber-100 text-amber-600", button: "primary" },
};

/**
 * ConfirmDialog. Props: open, onClose(), onConfirm(), title, description (name the object and consequence),
 * confirmLabel (default "Delete"), cancelLabel (default "Cancel"), loading (spinner on confirm; blocks closing),
 * loadingText (e.g. "Deleting…"), tone (danger|warning), icon (lucide component, default TriangleAlert),
 * confirmIcon (node inside the confirm button, e.g. <Trash2 />), children (extra body).
 * Initial focus goes to Cancel.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading = false,
  loadingText,
  tone = "danger",
  icon: Icon = TriangleAlert,
  confirmIcon,
  children,
}) {
  const cancelRef = useRef(null);
  const toneConfig = confirmTones[tone] ?? confirmTones.danger;
  const handleClose = () => {
    if (!loading) onClose?.();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      role="alertdialog"
      size="md"
      hideClose
      initialFocus={cancelRef}
      footer={
        <>
          <Button ref={cancelRef} variant="outline" onClick={handleClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={toneConfig.button}
            onClick={() => onConfirm?.()}
            loading={loading}
            loadingText={loadingText}
            icon={confirmIcon}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", toneConfig.tile)}>
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="min-w-0 space-y-1.5 pt-0.5">
          {title && (
            <DialogTitle className="text-lg font-semibold leading-tight tracking-tight text-slate-900">{title}</DialogTitle>
          )}
          {description && <Description className="text-sm text-slate-500">{description}</Description>}
          {children && <div className="pt-2">{children}</div>}
        </div>
      </div>
    </Dialog>
  );
}

export default Dialog;
