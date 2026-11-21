// src/Pages/modules/operations/components/PrintShell.jsx   (সম্পূর্ণ বদলান)
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import { ArrowLeft, Printer, Download } from "lucide-react";
import CompanyLetterhead from "./CompanyLetterhead";
import DocumentLinksPanel from "./DocumentLinksPanel";
import { Watermark } from "./print/PrintStates";
import { downloadElementAsPdf } from "../utils/pdf";
import { useShipment } from "../hooks/useShipment";
import { useOperationsAuth } from "../hooks/useOperationsAuth";
import { OPERATIONS_ROLES as R, ROLE_HOME } from "../constants/operationsRoles";

// docStatus = { complete, missing[] }. Draft ✈ watermark, print/download বন্ধ।
// ?embed=1 ✈ Shipment পেজের ভেতরে দেখানোর জন্য (Back ও sidebar ছাড়া)।
const PrintShell = ({
  title,
  children,
  fileName = "MILEX-Document",
  sidebar,
  docStatus = null,
  letterhead = true, // false = blank white A4 paper, no MILEX letterhead (Commercial Invoice)
  orientation = "portrait", // "landscape" for manifests and the HAWB
}) => {
  const navigate = useNavigate();
  const { shipmentId } = useParams();
  const [params] = useSearchParams();
  const { currentUser } = useOperationsAuth();
  const { shipment } = useShipment(shipmentId);
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const embed = params.get("embed") === "1";
  const draft = !!docStatus && !docStatus.complete;
  const auto =
    !sidebar && shipment && currentUser?.role !== R.COURIER ? (
      <DocumentLinksPanel shipment={shipment} />
    ) : null;
  const side = embed ? null : sidebar || auto;
  const landscape = orientation === "landscape";
  const width = side ? "max-w-7xl" : landscape ? "max-w-6xl" : "max-w-4xl";
  const goBack = () => (shipmentId && currentUser ? navigate(`${ROLE_HOME[currentUser.role]}/shipments/${encodeURIComponent(shipmentId)}`) : navigate(-1));

  const download = async () => {
    if (draft || !ref.current) return;
    setBusy(true);
    setError("");
    try {
      await downloadElementAsPdf(ref.current, fileName);
    } catch {
      setError("Could not create the PDF. Use Print ✈ Save as PDF instead.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (params.get("download") !== "1" || draft) return undefined;
    const id = setTimeout(download, 700);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, draft]);

  const btn =
    "flex items-center gap-2 text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 rounded-lg shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed";
  return (
    <div
      className={
        embed
          ? "bg-slate-100 p-2 sm:p-3 min-h-screen"
          : "min-h-screen bg-slate-100 py-4 px-3 sm:py-8 sm:px-4"
      }
    >
      <div
        className={`${embed ? "" : `${width} mx-auto`} mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden`}
      >
        {embed ? (
          <span />
        ) : (
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-700 transition"
          >
            <ArrowLeft size={16} /> {shipmentId ? "Back to shipment" : "Back"}
          </button>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={draft}
            onClick={() => window.print()}
            className={`${btn} bg-slate-800 text-white hover:bg-slate-900`}
          >
            <Printer size={16} /> Print
          </button>
          <button
            type="button"
            disabled={draft || busy}
            onClick={download}
            className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}
          >
            <Download size={16} /> {busy ? "Preparing..." : "Download PDF"}
          </button>
        </div>
      </div>
      {draft && (
        <div
          className={`${embed ? "" : `${width} mx-auto`} mb-3 print:hidden bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-800`}
        >
          <b>DRAFT</b> — Print and Download unlock automatically when nothing is
          left to fill. Still waiting for: {docStatus.missing.join(", ")}.
        </div>
      )}
      {error && (
        <p
          className={`${embed ? "" : `${width} mx-auto`} mb-3 text-xs text-red-600 font-semibold print:hidden`}
        >
          {error}
        </p>
      )}
      <div
        className={`${embed ? "" : `${width} mx-auto`} flex flex-col lg:flex-row lg:items-start gap-4`}
      >
        <div
          ref={ref}
          className={`relative flex-1 min-w-0 self-start bg-white shadow-xl rounded-xl p-4 sm:p-8 sm:min-h-[297mm] print:min-h-0 print:shadow-none print:rounded-none print:p-0 ${draft ? "print:hidden" : ""}`}
        >
          {draft && <Watermark text="DRAFT" />}
          <div className="relative">
            {letterhead ? <CompanyLetterhead /> : null}
            <h1 className={`${letterhead ? "text-base sm:text-lg mb-4" : "text-xl text-center mb-5 pb-2 border-b-2 border-slate-800"} font-black text-slate-800 uppercase tracking-wide`}>
              {title}
            </h1>
            {children}
          </div>
        </div>
        {side && (
          <aside className="w-full lg:w-[420px] shrink-0 self-start print:hidden lg:sticky lg:top-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs font-black text-slate-700 uppercase tracking-wide mb-3 pb-2 border-b border-slate-100">
                Related Documents
              </p>
              <div className="flex flex-col gap-2 [&>*]:w-full [&_a]:w-full [&_a]:flex [&_a]:items-center [&_a]:justify-start [&_button]:w-full [&_button]:justify-start [&_ul]:m-0 [&_ul]:p-0 [&_ul]:list-none [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2">
                {side}
              </div>
            </div>
          </aside>
        )}
      </div>
      <style>
        {`@media print { html, body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } @page { size: A4 ${orientation}; margin: 10mm; } table { page-break-inside: auto; } tr, .avoid-break { page-break-inside: avoid; } thead { display: table-header-group; } }`}
      </style>
    </div>
  );
};

export default PrintShell;
