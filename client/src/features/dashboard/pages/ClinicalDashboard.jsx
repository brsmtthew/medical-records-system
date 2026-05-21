import React, { useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, ClipboardList, Clock, Hospital, ImageOff, Stethoscope } from "lucide-react";
import { Link } from "react-router-dom";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import DashboardLayout from "../../../layouts/DashboardLayout";
import FloatingToast from "@shared/components/FloatingToast";
import { useAuth } from "@features/auth/context/useAuth";
import { roleLabel, userRoles } from "@shared/constants/userRoles";
import { subscribeToChartRequests } from "@features/charts/services/chartService";
import { formatDisplayDate } from "@shared/utils/dateFormatting";
import { db } from "@/firebaseClient";
import hospitalImage from "@assets/hospital image.jpg";

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

async function optimizeCoverImage(file) {
  if (!document.createElement("canvas").getContext) {
    return readImageAsDataUrl(file);
  }

  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(sourceUrl);
    const maxDimension = 1400;
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function statusBadgeClass(status) {
  if (status === "ready" || status === "completed") return "mrs-status-success";
  if (status === "canceled") return "mrs-status-danger";
  if (status === "preparing" || status === "received") return "mrs-status-info";
  return "mrs-status-warning";
}

export default function ClinicalDashboard() {
  const { currentUser, userProfile, userRole } = useAuth();
  const [requests, setRequests] = useState([]);
  const [toast, setToast] = useState(null);
  const assignmentLabel = userRole === userRoles.doctor ? "Clinic" : "Department";
  const assignment = userRole === userRoles.doctor
    ? userProfile?.clinic || "No clinic assigned"
    : userProfile?.department || "No department assigned";
  const coverImage = userProfile?.clinicalCoverDataUrl || hospitalImage;

  useEffect(() => {
    const unsubscribeRequests = subscribeToChartRequests(
      setRequests,
      (error) => setToast({ type: "error", message: error.message || "Unable to load clinical request logs." }),
    );

    return () => unsubscribeRequests();
  }, []);

  const stats = useMemo(() => ([
    { label: "Active Requests", value: requests.filter((request) => !["completed", "canceled"].includes(request.status)).length, icon: ClipboardList },
    { label: "Ready For Pickup", value: requests.filter((request) => request.status === "ready").length, icon: CheckCircle2 },
    { label: "Received", value: requests.filter((request) => request.status === "received").length, icon: Hospital },
    { label: "Completed Logs", value: requests.filter((request) => request.status === "completed").length, icon: Clock },
  ]), [requests]);
  const recentRequests = requests.slice(0, 6);

  const saveCoverImage = async (clinicalCoverDataUrl) => {
    if (!currentUser?.uid || !db) {
      setToast({ type: "error", message: "Profile customization is unavailable while Firebase is not configured." });
      return;
    }

    try {
      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          clinicalCoverDataUrl,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      setToast({ type: "success", title: "Dashboard Updated", message: "Clinical dashboard image was saved." });
    } catch (error) {
      setToast({ type: "error", message: error.message || "Unable to save dashboard image." });
    }
  };

  const handleCoverUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setToast({ type: "error", message: "Choose an image file for the dashboard." });
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setToast({ type: "error", message: "Use an image smaller than 3 MB." });
      return;
    }

    try {
      const optimizedImage = await optimizeCoverImage(file);
      if (optimizedImage.length > 900 * 1024) {
        setToast({ type: "error", message: "Use a smaller dashboard image." });
        return;
      }

      await saveCoverImage(optimizedImage);
      event.target.value = "";
    } catch (error) {
      setToast({ type: "error", message: error.message || "Unable to process that image." });
    }
  };

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 flex-col gap-2.5 overflow-y-auto pr-1">
        <div className="mrs-panel overflow-hidden rounded-xl">
          <div className="relative min-h-[11rem]">
            <img src={coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-slate-950/70" />
            <div className="relative grid min-h-[11rem] gap-4 p-4 text-white lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-stretch">
              <div className="flex min-w-0 flex-col justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-green-200">Version 3 Clinical Workspace</p>
                  <h1 className="mt-1 text-2xl font-black uppercase tracking-tight sm:text-3xl">
                    {roleLabel(userRole)} Portal
                  </h1>
                  <p className="mt-2 max-w-3xl text-xs font-semibold leading-relaxed text-slate-100 sm:text-sm">
                    Request charts, track pickup readiness, and review your transaction history from one clinical workspace.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-black uppercase text-white backdrop-blur transition hover:bg-white/20">
                    <Camera size={15} />
                    Upload Image
                    <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                  </label>
                  {userProfile?.clinicalCoverDataUrl && (
                    <button
                      type="button"
                      onClick={() => saveCoverImage("")}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-black uppercase text-white backdrop-blur transition hover:bg-white/20"
                    >
                      <ImageOff size={15} />
                      Reset Image
                    </button>
                  )}
                </div>
              </div>

              <div className="flex min-w-0 flex-col justify-center rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-200">{assignmentLabel}</p>
                <p className="mt-1 break-words text-lg font-black uppercase leading-tight">{assignment}</p>
                {userProfile?.specialty && (
                  <p className="mt-2 break-words text-xs font-bold uppercase text-green-100">{userProfile.specialty}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <div key={item.label} className="mrs-card rounded-xl p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                  <p className="mt-1 text-2xl font-black leading-none text-slate-900">{item.value}</p>
                </div>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-green-200 bg-green-50 text-green-700">
                  <item.icon size={19} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          {[
            {
              title: "Request Patient Chart",
              text: "Submit a digital request so Medical Records can prepare the physical chart for pickup.",
              icon: ClipboardList,
            },
            {
              title: "Pickup Notification",
              text: "Requests will show when the chart is confirmed, being prepared, or ready for pickup.",
              icon: Hospital,
            },
            {
              title: "Return Tracking",
              text: "Borrowed physical charts will be tracked until Medical Records marks them returned.",
              icon: Clock,
            },
          ].map((item) => (
            <div key={item.title} className="mrs-card rounded-xl p-3">
              <div className="mb-2 flex size-9 items-center justify-center rounded-xl bg-green-50 text-green-700">
                <item.icon size={18} />
              </div>
              <p className="text-xs font-black uppercase text-slate-900">{item.title}</p>
              <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mrs-panel min-h-[20rem] overflow-hidden rounded-xl">
          <div className="mrs-section-band flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-black uppercase text-slate-900">My Transaction Logs</p>
              <p className="mt-1 text-[10px] font-bold uppercase text-slate-400">Latest doctor/nurse chart request activity.</p>
            </div>
            <Link to="/chart-requests" className="mrs-soft-button rounded-lg px-3 py-2 text-[10px] font-black uppercase">
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] table-fixed text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="w-[30%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Patient / Case</th>
                  <th className="w-[26%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Purpose</th>
                  <th className="w-[17%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="w-[27%] p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentRequests.map((request) => (
                  <tr key={request.id} className="mrs-table-row">
                    <td className="p-3">
                      <p className="text-xs font-black uppercase text-slate-900">{request.patientName || "No patient name"}</p>
                      <p className="mt-1 font-mono text-[10px] font-black uppercase text-green-700">{request.caseNumber}</p>
                    </td>
                    <td className="p-3 text-xs font-bold leading-snug text-slate-600">{request.purpose || "No purpose saved"}</td>
                    <td className="p-3">
                      <span className={`mrs-status-badge ${statusBadgeClass(request.status)}`}>{request.status || "pending"}</span>
                    </td>
                    <td className="p-3 text-xs font-black uppercase text-slate-500">{formatDisplayDate(request.updatedAt || request.createdAt)}</td>
                  </tr>
                ))}
                {recentRequests.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-8 text-center">
                      <ClipboardList size={34} className="mx-auto mb-3 text-slate-300" />
                      <p className="font-black uppercase text-slate-700">No transaction logs yet</p>
                      <p className="mt-1 text-sm font-semibold text-slate-400">Your chart request actions will appear here.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mrs-panel rounded-xl p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Stethoscope size={20} />
              </div>
              <div>
                <p className="text-sm font-black uppercase text-slate-900">Chart Request Module</p>
                <p className="text-xs font-semibold text-slate-600">
                  Open requests to submit new charts, mark pickup receipt, or review request history.
                </p>
              </div>
            </div>
            <Link
              to="/chart-requests"
              className="mrs-primary-button inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-black uppercase"
            >
              <ClipboardList size={16} />
              Open Requests
            </Link>
          </div>
        </div>
      </div>
      <FloatingToast toast={toast} onClose={() => setToast(null)} />
    </DashboardLayout>
  );
}
