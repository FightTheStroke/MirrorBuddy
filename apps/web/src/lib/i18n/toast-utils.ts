/**
 * Localized Toast Utilities
 *
 * Provides helper functions for showing localized toast notifications
 * using the i18n system with the "toasts" namespace.
 */

import { toast } from "@/components/ui/toast";
import type { Toast } from "@/components/ui/toast";

/**
 * Get translation function for toasts namespace
 * This should be called from a component that has access to useTranslations
 */
export type ToastTranslate = (
  key: string,
  values?: Record<string, string | number>,
) => string;

/**
 * Show a localized success toast
 */
export function showSuccessToast(
  t: ToastTranslate,
  key: string,
  values?: Record<string, string | number>,
  options?: Partial<Toast>,
) {
  const message = t(key, values);
  toast.success(message, undefined, options);
}

/**
 * Show a localized error toast
 */
export function showErrorToast(
  t: ToastTranslate,
  key: string,
  values?: Record<string, string | number>,
  options?: Partial<Toast>,
) {
  const message = t(key, values);
  toast.error(message, undefined, options);
}

/**
 * Show a localized info toast
 */
export function showInfoToast(
  t: ToastTranslate,
  key: string,
  values?: Record<string, string | number>,
  options?: Partial<Toast>,
) {
  const message = t(key, values);
  toast.info(message, undefined, options);
}

/**
 * Show a localized warning toast
 */
export function showWarningToast(
  t: ToastTranslate,
  key: string,
  values?: Record<string, string | number>,
  options?: Partial<Toast>,
) {
  const message = t(key, values);
  toast.warning(message, undefined, options);
}

/**
 * Show a localized toast with title and message
 */
export function showToastWithMessage(
  type: "success" | "error" | "info" | "warning",
  t: ToastTranslate,
  titleKey: string,
  messageKey?: string,
  values?: Record<string, string | number>,
  options?: Partial<Toast>,
) {
  const title = t(titleKey, values);
  const message = messageKey ? t(messageKey, values) : undefined;

  switch (type) {
    case "success":
      toast.success(title, message, options);
      break;
    case "error":
      toast.error(title, message, options);
      break;
    case "info":
      toast.info(title, message, options);
      break;
    case "warning":
      toast.warning(title, message, options);
      break;
  }
}

/**
 * Create localized toast helpers bound to a specific translation function
 *
 * Usage:
 * ```tsx
 * const t = useTranslations('toasts');
 * const { success, error, info, warning } = createToastHelpers(t);
 *
 * success('pdf.downloaded'); // Shows "PDF downloaded"
 * error('pdf.exportFailed'); // Shows "Error during export"
 * ```
 */
export function createToastHelpers(t: ToastTranslate) {
  return {
    success: (
      key: string,
      values?: Record<string, string | number>,
      options?: Partial<Toast>,
    ) => showSuccessToast(t, key, values, options),
    error: (
      key: string,
      values?: Record<string, string | number>,
      options?: Partial<Toast>,
    ) => showErrorToast(t, key, values, options),
    info: (
      key: string,
      values?: Record<string, string | number>,
      options?: Partial<Toast>,
    ) => showInfoToast(t, key, values, options),
    warning: (
      key: string,
      values?: Record<string, string | number>,
      options?: Partial<Toast>,
    ) => showWarningToast(t, key, values, options),
    withMessage: (
      type: "success" | "error" | "info" | "warning",
      titleKey: string,
      messageKey?: string,
      values?: Record<string, string | number>,
      options?: Partial<Toast>,
    ) => showToastWithMessage(type, t, titleKey, messageKey, values, options),
  };
}
