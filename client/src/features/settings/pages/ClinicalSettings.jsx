import React, { useEffect, useState } from "react";
import { Camera, ImageOff, LoaderCircle, Moon, Palette, RotateCcw, Save, Sun, UserRound } from "lucide-react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import DashboardLayout from "../../../layouts/DashboardLayout";
import FloatingToast from "@shared/components/FloatingToast";
import { useAuth } from "@features/auth/context/useAuth";
import { roleLabel, userRoles } from "@shared/constants/userRoles";
import { applySystemTheme, defaultSystemSettings, readSystemSettings, saveSystemSettings } from "@shared/utils/systemSettings";
import { db } from "@/firebaseClient";

function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(sourceUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = sourceUrl;
  });
}

async function optimizeProfileImage(file) {
  if (!document.createElement("canvas").getContext) {
    return readImageAsDataUrl(file);
  }

  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(sourceUrl);
    const maxDimension = 720;
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", 0.84);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export default function ClinicalSettings() {
  const { currentUser, userProfile, userRole } = useAuth();
  const [toast, setToast] = useState(null);
  const [settings, setSettings] = useState(readSystemSettings);
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [description, setDescription] = useState("");
  const [portalSubtitle, setPortalSubtitle] = useState("");
  const [isSavingPanel, setIsSavingPanel] = useState(false);
  const assignment = userRole === userRoles.doctor
    ? userProfile?.clinic || "No clinic assigned"
    : userProfile?.department || "No department assigned";
  const panelRoleLabel = roleLabel(userRole);

  useEffect(() => {
    setPhotoDataUrl(userProfile?.photoDataUrl || "");
    setDescription(userProfile?.clinicalDescription || userProfile?.doctorDescription || "");
    setPortalSubtitle(userProfile?.clinicalPortalSubtitle || "");
  }, [
    userProfile?.clinicalDescription,
    userProfile?.clinicalPortalSubtitle,
    userProfile?.doctorDescription,
    userProfile?.photoDataUrl,
  ]);

  const updateAppearance = (key, value) => {
    setSettings((currentSettings) => {
      const nextSettings = { ...currentSettings, [key]: value };
      saveSystemSettings(nextSettings);
      applySystemTheme(nextSettings);
      window.dispatchEvent(new CustomEvent("mrs-settings-updated"));
      return nextSettings;
    });
  };

  const resetAppearance = () => {
    const nextSettings = {
      ...settings,
      appearanceMode: defaultSystemSettings.appearanceMode,
      lightComfortMode: defaultSystemSettings.lightComfortMode,
    };
    setSettings(nextSettings);
    saveSystemSettings(nextSettings);
    applySystemTheme(nextSettings);
    window.dispatchEvent(new CustomEvent("mrs-settings-updated"));
    setToast({ type: "success", title: "Appearance Reset", message: "Appearance settings were restored." });
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setToast({ type: "error", message: "Choose an image file for the profile." });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setToast({ type: "error", message: "Use an image smaller than 2 MB." });
      return;
    }

    try {
      const optimizedImage = await optimizeProfileImage(file);
      if (optimizedImage.length > 750 * 1024) {
        setToast({ type: "error", message: "Use a smaller profile image." });
        return;
      }
      setPhotoDataUrl(optimizedImage);
      event.target.value = "";
    } catch (error) {
      setToast({ type: "error", message: error.message || "Unable to process that image." });
    }
  };

  const saveDashboardPanel = async () => {
    if (!currentUser?.uid || !db) {
      setToast({ type: "error", message: "Clinical settings are unavailable while Firebase is not configured." });
      return;
    }

    const nextDescription = description.trim().slice(0, 420);
    const nextSubtitle = portalSubtitle.trim().slice(0, 180);
    const profileUpdate = {
      photoDataUrl,
      clinicalDescription: nextDescription,
      clinicalPortalSubtitle: nextSubtitle,
      updatedAt: serverTimestamp(),
    };

    if (userRole === userRoles.doctor) {
      profileUpdate.doctorDescription = nextDescription;
    }

    try {
      setIsSavingPanel(true);
      await setDoc(doc(db, "users", currentUser.uid), profileUpdate, { merge: true });
      setToast({ type: "success", title: "Dashboard Panel Saved", message: "Your clinical dashboard panel was updated." });
    } catch (error) {
      setToast({ type: "error", message: error.message || "Unable to save dashboard panel." });
    } finally {
      setIsSavingPanel(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-1">
        <div className="mrs-panel rounded-xl p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-green-700">Clinical Workspace</p>
              <h1 className="mt-1 text-2xl font-black uppercase text-slate-900">{panelRoleLabel} Settings</h1>
              <p className="mt-1 text-xs font-bold uppercase text-slate-400">Dashboard panel and appearance controls.</p>
            </div>
          </div>
        </div>

        <div className="grid min-h-0 gap-3 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="mrs-panel overflow-hidden rounded-xl">
            <div className="mrs-section-band border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-black uppercase text-slate-900">Dashboard Panel</p>
              <p className="mt-1 text-[10px] font-bold uppercase text-slate-400">This controls the profile block shown on your dashboard.</p>
            </div>

            <div className="grid gap-4 p-4 lg:grid-cols-[13rem_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <div className="relative aspect-square bg-slate-900/5">
                  <div className="absolute inset-0 flex items-center justify-center text-green-700">
                    {photoDataUrl ? (
                      <img src={photoDataUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <UserRound size={78} />
                    )}
                  </div>
                </div>
                <div className="grid gap-2 border-t border-slate-200 p-2">
                  <label className="mrs-soft-button inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-[10px] font-black uppercase">
                    <Camera size={15} />
                    Add Image
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                  {photoDataUrl && (
                    <button
                      type="button"
                      onClick={() => setPhotoDataUrl("")}
                      className="mrs-soft-button inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 py-2 text-[10px] font-black uppercase"
                    >
                      <ImageOff size={15} />
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-green-700">{panelRoleLabel} Profile Preview</p>
                  <p className="mt-2 text-lg font-black uppercase text-slate-900">{userProfile?.fullName || currentUser?.displayName || panelRoleLabel}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase text-slate-500">{assignment}</p>
                  {userProfile?.specialty && <p className="mt-1 text-[10px] font-bold uppercase text-green-700">{userProfile.specialty}</p>}
                  <p className="mt-3 whitespace-pre-line text-xs font-semibold leading-relaxed text-slate-600">
                    {description || "Your profile description will appear here."}
                  </p>
                </div>

                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Portal Subtitle</span>
                  <textarea
                    value={portalSubtitle}
                    onChange={(event) => setPortalSubtitle(event.target.value.slice(0, 180))}
                    className="mt-1 min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold leading-relaxed text-slate-800 outline-none focus:border-green-300 focus:ring-4 focus:ring-green-300/20"
                    placeholder="Request charts, track pickup readiness, and review your transaction history from one clinical workspace."
                  />
                </label>

                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Profile Description</span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value.slice(0, 420))}
                    className="mt-1 min-h-28 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold leading-relaxed text-slate-800 outline-none focus:border-green-300 focus:ring-4 focus:ring-green-300/20"
                    placeholder={`Add a short ${panelRoleLabel.toLowerCase()} dashboard description`}
                  />
                </label>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400">{description.length}/420</p>
                  <button
                    type="button"
                    onClick={saveDashboardPanel}
                    disabled={isSavingPanel}
                    className="mrs-primary-button inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-[10px] font-black uppercase disabled:opacity-60"
                  >
                    {isSavingPanel ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}
                    {isSavingPanel ? "Saving" : "Save Panel"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mrs-panel rounded-xl">
            <div className="mrs-section-band border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-black uppercase text-slate-900">Appearance</p>
              <p className="mt-1 text-[10px] font-bold uppercase text-slate-400">Workstation display preferences.</p>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Theme Mode</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {[
                    { id: "dark", label: "Dark", icon: Moon },
                    { id: "light", label: "Light", icon: Sun },
                  ].map((mode) => {
                    const Icon = mode.icon;
                    const isActive = settings.appearanceMode === mode.id;
                    return (
                      <button
                        type="button"
                        key={mode.id}
                        onClick={() => updateAppearance("appearanceMode", mode.id)}
                        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-black uppercase transition ${
                          isActive ? "border-green-300 bg-green-50 text-green-800" : "border-slate-200 bg-white text-slate-600 hover:border-green-200"
                        }`}
                      >
                        <Icon size={15} />
                        {mode.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Light Comfort</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {[
                    { id: "normal", label: "Normal" },
                    { id: "soft", label: "Soft" },
                  ].map((mode) => {
                    const isActive = settings.lightComfortMode === mode.id;
                    return (
                      <button
                        type="button"
                        key={mode.id}
                        onClick={() => updateAppearance("lightComfortMode", mode.id)}
                        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-black uppercase transition ${
                          isActive ? "border-green-300 bg-green-50 text-green-800" : "border-slate-200 bg-white text-slate-600 hover:border-green-200"
                        }`}
                      >
                        <Palette size={15} />
                        {mode.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={resetAppearance}
                className="mrs-soft-button inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-[10px] font-black uppercase"
              >
                <RotateCcw size={15} />
                Reset Appearance
              </button>
            </div>
          </div>
        </div>
      </div>
      <FloatingToast toast={toast} onClose={() => setToast(null)} />
    </DashboardLayout>
  );
}
