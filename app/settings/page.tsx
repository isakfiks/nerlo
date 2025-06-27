"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ArrowLeft } from "lucide-react";

export default function ParentSettings() {
  const [checked, setChecked] = useState(false);

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [changingPin, setChangingPin] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkParentMode = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: session } = await supabase
        .from("parent_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .single();
      if (!session) {
        router.replace("/");
        return;
      }
      setChecked(true);
    };
    checkParentMode();

  }, []);

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    if (!currentPin || !newPin || !confirmPin) {
      setErrorMsg("All fields are required.");
      return;
    }
    if (newPin !== confirmPin) {
      setErrorMsg("New PIN and confirmation do not match.");
      return;
    }
    if (newPin.length < 4 || newPin.length > 6) {
      setErrorMsg("PIN must be 4-6 digits.");
      return;
    }
    setChangingPin(true);
    try {
      const res = await fetch("/api/change-parent-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin, newPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to update PIN.");
      } else {
        setSuccessMsg("PIN updated successfully.");
        setCurrentPin("");
        setNewPin("");
        setConfirmPin("");
      }
    } catch {
      setErrorMsg("Failed to update PIN.");
    }
    setChangingPin(false);
  };

  if (!checked) {
    // Block render before verified parentmode
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-8 py-6 flex items-center gap-4">
          <Link href="/" className="text-gray-500 hover:text-gray-800 flex items-center">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
          <h1 className="text-lg font-medium text-gray-900">Parent Settings</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow border border-gray-100 max-w-md mx-auto p-8">
          <h2 className="text-lg font-light text-gray-900 mb-8">Change Parent PIN</h2>
          <form onSubmit={handleChangePin} className="space-y-6">
            <div>
              <label className="block text-sm text-gray-700 mb-2">Current PIN</label>
              <input
                type="password"
                value={currentPin}
                onChange={e => setCurrentPin(e.target.value)}
                className="w-full p-0 border-0 text-gray-900 placeholder-gray-400 focus:outline-none text-lg bg-transparent"
                maxLength={6}
                required
                autoComplete="off"
              />
              <div className="h-px bg-gray-200 mt-2"></div>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2">New PIN</label>
              <input
                type="password"
                value={newPin}
                onChange={e => setNewPin(e.target.value)}
                className="w-full p-0 border-0 text-gray-900 placeholder-gray-400 focus:outline-none text-lg bg-transparent"
                maxLength={6}
                required
                autoComplete="off"
              />
              <div className="h-px bg-gray-200 mt-2"></div>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2">Confirm New PIN</label>
              <input
                type="password"
                value={confirmPin}
                onChange={e => setConfirmPin(e.target.value)}
                className="w-full p-0 border-0 text-gray-900 placeholder-gray-400 focus:outline-none text-lg bg-transparent"
                maxLength={6}
                required
                autoComplete="off"
              />
              <div className="h-px bg-gray-200 mt-2"></div>
            </div>
            {errorMsg && <div className="text-red-500 text-sm">{errorMsg}</div>}
            {successMsg && <div className="text-green-600 text-sm">{successMsg}</div>}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={changingPin}
                className="flex-1 px-6 py-3 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors"
              >
                {changingPin ? "Updating..." : "Update PIN"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}