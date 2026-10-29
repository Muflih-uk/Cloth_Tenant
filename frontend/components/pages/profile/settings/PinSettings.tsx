"use client";

import { useState } from "react";
import { KeyRound, MailCheck, ShieldCheck } from "lucide-react";

import { Input } from "@/components/ui/input";
import StockFlowButton from "@/components/ui/custom/stockFlowButton";
import { authApi } from "@/lib/api/auth";
import { toastErrorFromError, toastSuccess } from "@/lib/toast";
import type { UserProfile } from "@/types/auth";

interface PinSettingsProps {
  profile: UserProfile;
  /** Called once a PIN exists or has changed, so the card can redraw. */
  onChanged: (hasPin: boolean) => void;
}

const isSixDigits = (value: string) => /^\d{6}$/.test(value);

/**
 * Profile settings › PIN.
 *
 * Two different situations, deliberately treated differently. With no PIN there
 * is nothing to prove -- the admin is signed in and said as much -- so one can
 * simply be chosen. An existing PIN only changes through a code emailed to the
 * admin, because that is the change someone who walked up to an unattended
 * screen would make.
 */
export default function PinSettings({ profile, onChanged }: PinSettingsProps) {
  const hasPin = profile.has_pin === true;

  const [codeSent, setCodeSent] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const resetForm = () => {
    setCode("");
    setPin("");
    setConfirm("");
    setError("");
  };

  const validate = () => {
    if (!isSixDigits(pin)) return "PIN must be exactly 6 digits.";
    if (pin !== confirm) return "The two PINs do not match.";
    return "";
  };

  const handleCreate = async () => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await authApi.createPin(pin);
      toastSuccess("PIN created", "You will be asked for it on destructive actions.");
      resetForm();
      onChanged(true);
    } catch (err) {
      toastErrorFromError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleRequestCode = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await authApi.requestPinCode();
      setCodeSent(result.expires_in_minutes);
      resetForm();
      toastSuccess("Code sent", `Check ${profile.email} for a 6-digit code.`);
    } catch (err) {
      toastErrorFromError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError("The code is 6 digits.");
      return;
    }
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await authApi.resetPin(code, pin);
      toastSuccess("PIN updated", "Use your new PIN from now on.");
      setCodeSent(null);
      resetForm();
      onChanged(true);
    } catch (err) {
      toastErrorFromError(err);
    } finally {
      setBusy(false);
    }
  };

  const digits = (value: string, setter: (next: string) => void) => (
    <Input
      type="password"
      inputMode="numeric"
      maxLength={6}
      value={value}
      onChange={(e) => {
        setter(e.target.value.replace(/\D/g, "").slice(0, 6));
        setError("");
      }}
      placeholder="6 digits"
      className="bg-white border-gray-100 rounded-xl h-12 tracking-[0.4em]"
    />
  );

  return (
    <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-5 lg:mx-auto lg:max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <KeyRound size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-gray-900">PIN</h3>
            <p className="text-[11px] text-gray-400 leading-snug">
              Asked for before you delete or change shared records.
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
            hasPin ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"
          }`}
        >
          <ShieldCheck size={10} />
          {hasPin ? "Set" : "Not set"}
        </span>
      </div>

      {!hasPin && (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500">
            This account has no PIN yet. Choose one here -- there is nothing to
            prove, you are already signed in.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold text-gray-700">
              New PIN
              {digits(pin, setPin)}
            </label>
            <label className="block text-xs font-bold text-gray-700">
              Confirm PIN
              {digits(confirm, setConfirm)}
            </label>
          </div>
          {error && <p className="text-xs font-bold text-red-500">{error}</p>}
          <StockFlowButton
            variant="filled"
            text={busy ? "Saving..." : "Create PIN"}
            onClick={handleCreate}
            disabled={busy}
            className="h-12 rounded-2xl font-bold text-sm"
          />
        </div>
      )}

      {hasPin && codeSent === null && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="text-xs font-semibold text-gray-500 flex-1 min-w-[180px]">
            A PIN is already set. Changing it needs a code sent to{" "}
            <span className="text-gray-700">{profile.email}</span>.
          </p>
          <StockFlowButton
            variant="filled"
            text={busy ? "Sending..." : "Edit PIN"}
            onClick={handleRequestCode}
            disabled={busy}
            icon={<MailCheck className="size-4" />}
            className="h-11 rounded-2xl font-bold text-sm"
          />
        </div>
      )}

      {hasPin && codeSent !== null && (
        <div className="mt-4 space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3">
          <p className="text-xs font-semibold text-emerald-800">
            We emailed a 6-digit code to {profile.email}. It expires in{" "}
            {codeSent} minutes.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block text-xs font-bold text-gray-700">
              Code
              {digits(code, setCode)}
            </label>
            <label className="block text-xs font-bold text-gray-700">
              New PIN
              {digits(pin, setPin)}
            </label>
            <label className="block text-xs font-bold text-gray-700">
              Confirm PIN
              {digits(confirm, setConfirm)}
            </label>
          </div>
          {error && <p className="text-xs font-bold text-red-500">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <StockFlowButton
              variant="filled"
              text={busy ? "Saving..." : "Save new PIN"}
              onClick={handleReset}
              disabled={busy}
              className="h-11 rounded-2xl font-bold text-sm"
            />
            <StockFlowButton
              variant="outline"
              text="Send a new code"
              onClick={handleRequestCode}
              disabled={busy}
              className="h-11 rounded-2xl font-bold text-sm"
            />
            <StockFlowButton
              variant="outline"
              text="Cancel"
              onClick={() => {
                setCodeSent(null);
                resetForm();
              }}
              disabled={busy}
              className="h-11 rounded-2xl border-gray-200 font-bold text-sm text-gray-500"
            />
          </div>
        </div>
      )}
    </section>
  );
}
