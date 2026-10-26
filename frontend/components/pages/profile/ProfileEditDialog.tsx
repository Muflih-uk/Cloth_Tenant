"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Pencil, X } from "lucide-react";

import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import StockFlowButton from "@/components/ui/custom/stockFlowButton";
import { brandApi } from "@/lib/api/brand";
import { authApi } from "@/lib/api/auth";
import { normalizeImageFile } from "@/lib/image-utils";
import { toastError, toastErrorFromError, toastSuccess } from "@/lib/toast";
import type { Brand } from "@/types/brand";
import type { UserProfile } from "@/types/auth";

interface ProfileEditDialogProps {
  open: boolean;
  onClose: () => void;
  profile: UserProfile;
  canEditCompanyLogo: boolean;
  /** Hands the refreshed account back so the page can redraw without a refetch. */
  onSaved: (updated: UserProfile) => void;
}

/**
 * The pencil on the admin's avatar.
 *
 * Two separate things are edited here, and they live in different places on the
 * server: the account details (your own name, username and email -- free to
 * change) and the company logo, which is the singleton brand profile and is what
 * prints on the order form, the invoice and every bundle slip.
 *
 * Because the logo is shared paperwork rather than a personal detail, the server
 * wants the admin's PIN for it.
 */
export default function ProfileEditDialog({
  open,
  onClose,
  profile,
  canEditCompanyLogo,
  onSaved,
}: ProfileEditDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [username, setUsername] = useState(profile.username ?? "");
  const [email, setEmail] = useState(profile.email ?? "");
  const [pin, setPin] = useState("");

  const [brand, setBrand] = useState<Brand | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // The dialog is mounted fresh every time it is opened, so the fields start
  // from the account as it is and a cancelled edit leaves nothing behind.
  useEffect(() => {
    if (!open || !canEditCompanyLogo) return;
    let live = true;
    brandApi
      .getAll()
      .then((rows) => {
        if (live) setBrand(rows[0] ?? null);
      })
      .catch(() => {
        // The account fields are still editable without the company profile, so
        // this is not worth interrupting the admin for.
      });
    return () => {
      live = false;
    };
  }, [open, canEditCompanyLogo]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const clearError = (key: string) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!username.trim()) next.username = "Username is required";
    if (!email.trim()) next.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) next.email = "Invalid email format";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleLogoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const normalised = await normalizeImageFile(file);
    setLogoFile(normalised);
    setLogoPreview(URL.createObjectURL(normalised));
    clearError("pin");
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const needsPin = !!logoFile && canEditCompanyLogo;
    if (needsPin && pin.trim().length !== 6) {
      setErrors({ pin: "Enter your 6-digit PIN to change the company logo." });
      return;
    }

    // Without the company profile there is nowhere to hang the logo, so say so
    // rather than saving the account fields and quietly dropping the upload.
    if (logoFile && !brand) {
      toastError(
        "Could not load the company profile",
        "Close this dialog and try again.",
      );
      return;
    }

    setBusy(true);
    try {
      let changed = false;

      if (
        username.trim() !== profile.username ||
        email.trim() !== profile.email ||
        displayName.trim() !== (profile.display_name ?? "")
      ) {
        const updated = await authApi.updateProfile({
          username: username.trim(),
          email: email.trim(),
          display_name: displayName.trim(),
        });
        onSaved(updated);
        changed = true;
      }

      if (logoFile && brand) {
        await brandApi.update(brand.id, { logo: logoFile }, pin.trim());
        changed = true;
      }

      if (changed) toastSuccess("Profile updated");
      onClose();
    } catch (error) {
      toastErrorFromError(error);
    } finally {
      setBusy(false);
    }
  };

  const logoToShow = logoPreview ?? brand?.logo_url;

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil size={16} className="text-primary" aria-hidden="true" />
            Edit profile
          </DialogTitle>
          <DialogDescription>
            {canEditCompanyLogo
              ? "Your own details, and the company logo that prints on order forms, invoices and bundle slips."
              : "Your own account details."}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup className="gap-5">
          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-gray-400">
              Your details
            </p>
            <div className="space-y-3">
              <Field>
                <FieldLabel className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Display name
                </FieldLabel>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. John"
                  className="bg-white border-gray-100 rounded-xl h-12"
                />
              </Field>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel className="text-xs font-bold uppercase tracking-widest text-gray-400">
                    Username
                  </FieldLabel>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`bg-white border-gray-100 rounded-xl h-12 ${
                      errors.username ? "border-red-200" : ""
                    }`}
                  />
                  {errors.username && (
                    <p className="text-[10px] font-bold text-red-500">
                      {errors.username}
                    </p>
                  )}
                </Field>

                <Field>
                  <FieldLabel className="text-xs font-bold uppercase tracking-widest text-gray-400">
                    Email
                  </FieldLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`bg-white border-gray-100 rounded-xl h-12 ${
                      errors.email ? "border-red-200" : ""
                    }`}
                  />
                  {errors.email && (
                    <p className="text-[10px] font-bold text-red-500">
                      {errors.email}
                    </p>
                  )}
                </Field>
              </div>
            </div>
          </div>

          {canEditCompanyLogo && (
          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-gray-400">
              Company logo
            </p>
            <div className="flex items-start gap-4">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                {logoToShow ? (
                  <img
                    src={logoToShow}
                    alt="Company logo"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-gray-300">
                    No logo
                  </div>
                )}
                {logoFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogoFile(null);
                      if (logoPreview) URL.revokeObjectURL(logoPreview);
                      setLogoPreview(null);
                    }}
                    aria-label="Remove selected logo"
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-gray-200 transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <Camera size={22} className="text-gray-300" />
                  <span className="text-xs font-medium text-gray-500">
                    {logoFile ? "Choose a different logo" : "Upload logo"}
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoSelect}
                />
                <p className="mt-1.5 text-[10px] text-gray-400">
                  Shown on the order form, invoice and bundle slip.
                </p>
              </div>
            </div>

            {logoFile && (
              <Field className="mt-3 max-w-[180px]">
                <FieldLabel className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Admin PIN
                </FieldLabel>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                    clearError("pin");
                  }}
                  placeholder="6-digit PIN"
                  className={`bg-white border-gray-100 rounded-xl h-12 ${
                    errors.pin ? "border-red-200" : ""
                  }`}
                />
                {errors.pin && (
                  <p className="text-[10px] font-bold text-red-500">
                    {errors.pin}
                  </p>
                )}
              </Field>
            )}
          </div>
          )}
        </FieldGroup>

        <div className="flex gap-3">
          <StockFlowButton
            variant="outline"
            text="Cancel"
            onClick={onClose}
            disabled={busy}
            className="flex-1 h-12 rounded-2xl font-bold text-sm"
          />
          <StockFlowButton
            variant="filled"
            text={busy ? "Saving..." : "Save changes"}
            onClick={handleSubmit}
            disabled={busy}
            className="flex-1 h-12 rounded-2xl font-bold text-sm"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
