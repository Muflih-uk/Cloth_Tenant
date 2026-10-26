import { toast as sonner } from "sonner";

type ToastType = "success" | "error" | "warning";
interface ToastOptions {
  title: string;
  description?: string;
}

interface ApiErrorLike {
  response?: {
    status?: number;
    data?: unknown;
  };
  request?: unknown;
  code?: string;
  data?: {
    detail?: unknown;
    message?: unknown;
  };
  message?: string;
}

export function formatApiError(error: unknown): string {
  return parseApiError(error);
}

function parseApiError(error: unknown): string {
  try {
    const apiError: ApiErrorLike =
      typeof error === "object" && error !== null
        ? (error as ApiErrorLike)
        : {};
    const status = apiError.response?.status;

    if (status === 413) {
      return "Image is too large. Please pick a smaller photo and try again.";
    }

    if (!apiError.response && apiError.request) {
      if (apiError.code === "ERR_NETWORK") {
        return "Server unreachable. Check your connection and try again.";
      }
      if (apiError.code === "ECONNABORTED") {
        return "Request timed out. Try again.";
      }
      return "Could not reach the server. Check your connection and try again.";
    }

    const data = apiError.response?.data;

    if (data) {
      if (typeof data === "string") {
        const message = data.includes("<html")
          ? "Server error, please try again"
          : data;
        return status ? `${message} (HTTP ${status})` : message;
      }

      if (typeof data === "object") {
        const payload = data as Record<string, unknown>;

        if (typeof payload.error === "string") {
          return status
            ? `${payload.error} (HTTP ${status})`
            : payload.error;
        }
        if (typeof payload.detail === "string") {
          return status
            ? `${payload.detail} (HTTP ${status})`
            : payload.detail;
        }

        const messages = Object.entries(payload)
          .flatMap(([field, value]) => {
            if (Array.isArray(value)) {
              return value.map((message) => `${field}: ${String(message)}`);
            }
            if (typeof value === "string") return [`${field}: ${value}`];
            return [];
          })
          .join("\n");
        if (messages) return status ? `${messages} (HTTP ${status})` : messages;
      }
    }

    if (typeof apiError.data?.detail === "string") {
      return apiError.data.detail;
    }
    if (typeof apiError.data?.message === "string") {
      return apiError.data.message;
    }
    if (apiError.message) return apiError.message;
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
  } catch {
    // never crash the toast
  }

  return "Something went wrong";
}

function showToast(type: ToastType, { title, description }: ToastOptions) {
  const options = {
    duration: type === "warning" ? 5000 : 3000,
    ...(description && { description }),
  };
  if (type === "success") {
    sonner.success(title, options);
  } else if (type === "warning") {
    sonner.warning(title, options);
  } else {
    sonner.error(title, options);
  }
}

export function toastWarning(title: string, description?: string) {
  showToast("warning", { title, description });
}

export function toastSuccess(title: string, description?: string) {
  showToast("success", { title, description });
}

export function toastError(titleOrError: string | unknown, error?: unknown) {
  if (typeof titleOrError !== "string") {
    const message = parseApiError(titleOrError);
    showToast("error", { title: message });
    return;
  }
  const description = error ? parseApiError(error) : undefined;
  showToast("error", { title: titleOrError, description });
}

export function toastErrorFromError(error: unknown) {
  const message = parseApiError(error);
  showToast("error", { title: message });
}
