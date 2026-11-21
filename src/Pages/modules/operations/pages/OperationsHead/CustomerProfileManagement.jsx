// src/Pages/modules/operations/pages/OperationsHead/CustomerProfileManagement.jsx   (সম্পূর্ণ বদলান)
import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Printer, Search } from "lucide-react";
import SectionCard from "../../components/SectionCard";
import Chip from "../../components/Chip";
import { Kv, KvGrid, MiniTable } from "../../components/customer/ProfileBits";
import Loader from "../../../../../Components/Shared/Loader";
import { useDataVersion } from "../../hooks/useDataVersion";
import { fetchClients } from "../../services/clientService";
import { fetchShipments } from "../../services/shipmentService";
import { formatRateFormula } from "../../services/rateService";
import { amountInWordsBD } from "../../utils/numberToWords";
import { sameId } from "../../services/serviceUtils";
import { humanizeStatus } from "../../../../../Components/utils/format";
import ClientDocsViewer from "../../components/customer/ClientDocsViewer";

const TABS = [
  ["recommendation", "Recommendation Form"],
  ["profile", "Account Profile"],
  ["rates", "Rate Card & Credit"],
  ["shipments", "Shipments"],
];
const PRINT_CSS =
  "@media print { body * { visibility: hidden !important; } .print-area, .print-area * { visibility: visible !important; } .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 12mm; background: #fff; } }";

const RATE_COLS = [
  { key: "mode", label: "Mode" },
  { key: "country", label: "Country" },
  {
    key: "formula",
    label: "Rate (base + per kg)",
    render: (r) => formatRateFormula(r),
  },
  { key: "version", label: "Rate Reference" },
];

const CustomerProfileManagement = () => {
  const version = useDataVersion();
  const [params, setParams] = useSearchParams();
  const [clients, setClients] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [term, setTerm] = useState("");
  const [tab, setTab] = useState("recommendation");

  const load = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([fetchClients(), fetchShipments()]);
      setClients(c);
      setShipments(s);
    } finally {
      setIsLoading(false);
    }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    load();
  }, [load, version]);

  const list = useMemo(() => {
    const q = term.trim().toLowerCase();
    return q
      ? clients.filter((c) =>
          [c.accountName, c.customerId, c.email, c.managingPartner].some((v) =>
            String(v || "")
              .toLowerCase()
              .includes(q),
          ),
        )
      : clients;
  }, [clients, term]);

  const selected = useMemo(
    () =>
      clients.find((c) => String(c.id) === params.get("c")) ||
      clients[0] ||
      null,
    [clients, params],
  );
  const mine = useMemo(
    () =>
      selected
        ? shipments
            .filter((s) => sameId(s.clientEmail, selected.email))
            .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
        : [],
    [shipments, selected],
  );

  if (isLoading) return <Loader label="Loading customers..." />;
  const limit = Number(selected?.creditLimitAmount) || 0;

  return (
    <div className="w-full space-y-6">
      <style>{PRINT_CSS}</style>
      <div>
        <h1 className="text-xl font-black text-slate-800">Customer Profile</h1>
        <p className="text-sm text-slate-500">
          Recommendation form, account profile, approved rates and credit terms
          (managed by Sales onboarding — read-only here).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <SectionCard title={`Customers (${list.length})`}>
          <div className="relative mb-3">
            <Search
              size={14}
              className="absolute left-2.5 top-2.5 text-slate-400"
            />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              maxLength={40}
              placeholder="Search name / ID / email"
              className="w-full border border-slate-300 rounded-lg pl-8 pr-2 py-2 text-xs bg-slate-50 focus:border-emerald-500 outline-none"
            />
          </div>
          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
            {list.length === 0 ? (
              <p className="text-xs text-slate-400">No customers match.</p>
            ) : (
              list.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setParams({ c: String(c.id) });
                    setTab("recommendation");
                  }}
                  className={`w-full text-left rounded-lg border p-2.5 transition ${selected?.id === c.id ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:bg-slate-50"}`}
                >
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {c.accountName}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {c.customerId} · {c.accountType}
                  </p>
                </button>
              ))
            )}
          </div>
        </SectionCard>

        <div className="lg:col-span-3 space-y-4">
          {!selected ? (
            <p className="text-sm text-slate-400">No customer selected.</p>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-black text-slate-800">
                    {selected.accountName}
                  </p>
                  <p className="text-xs text-slate-400">
                    {selected.customerId} · {selected.email}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone="green">
                    {humanizeStatus(selected.status) || "Active"}
                  </Chip>
                  <Chip tone="blue">{selected.accountType}</Chip>
                  {limit > 0 && (
                    <Chip tone="slate">
                      BDT {limit.toLocaleString("en-US")} /{" "}
                      {selected.creditPeriodDays} days
                    </Chip>
                  )}
                  {["recommendation", "profile"].includes(tab) && (
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex items-center gap-1.5 text-xs font-bold bg-slate-800 text-white px-3 py-2 rounded-lg hover:bg-slate-900 transition"
                    >
                      <Printer size={14} /> Print
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
                {TABS.map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTab(k)}
                    className={`px-4 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition ${tab === k ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {["recommendation", "profile"].includes(tab) && (
                <ClientDocsViewer client={selected} tab={tab} />
              )}

              {tab === "rates" && (
                <div className="space-y-6">
                  <SectionCard
                    title="Approved Rates"
                    subtitle={
                      selected.recommendation?.approvedRateText
                        ? `As approved: ${selected.recommendation.approvedRateText}`
                        : undefined
                    }
                  >
                    <MiniTable
                      columns={RATE_COLS}
                      rows={selected.rateCard || []}
                      empty="No approved rates on file."
                    />
                    <p className="text-[10px] text-slate-400 mt-2">
                      Quote = base charge + per-kg rate × weight. Used to
                      pre-fill the estimated charge on new bookings; the
                      Supervisor can override it at hub verification with a
                      reason.
                    </p>
                  </SectionCard>
                  <SectionCard title="Credit Terms">
                    <KvGrid>
                      <Kv k="Account Type" v={selected.accountType} />
                      <Kv
                        k="Credit Limit (BDT)"
                        v={limit ? limit.toLocaleString("en-US") : ""}
                      />
                      <Kv
                        k="Credit Period (Days)"
                        v={selected.creditPeriodDays}
                      />
                      <Kv
                        k="In Words"
                        v={limit ? amountInWordsBD(limit) : ""}
                        className="sm:col-span-2"
                      />
                    </KvGrid>
                  </SectionCard>
                </div>
              )}

              {tab === "shipments" && (
                <SectionCard title={`Shipments (${mine.length})`}>
                  {mine.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      No shipments for this customer yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                            <th className="py-2 pr-4">Shipment</th>
                            <th className="py-2 pr-4">Mode</th>
                            <th className="py-2 pr-4">Route</th>
                            <th className="py-2 pr-4">Kg</th>
                            <th className="py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mine.map((s) => (
                            <tr
                              key={s.id}
                              className="border-b border-slate-50 last:border-b-0"
                            >
                              <td className="py-3 pr-4">
                                <Link
                                  to={`/operations/head/shipments/${encodeURIComponent(s.shipmentId)}`}
                                  className="font-bold text-emerald-600 hover:underline"
                                >
                                  {s.shipmentId}
                                </Link>
                              </td>
                              <td className="py-3 pr-4 text-slate-600">
                                {s.mode}
                              </td>
                              <td className="py-3 pr-4 text-slate-600 text-xs">
                                {s.route?.originCountry} ✈{" "}
                                {s.route?.destCountry}
                              </td>
                              <td className="py-3 pr-4 text-slate-600">
                                {s.parcel?.weightKg}
                              </td>
                              <td className="py-3">
                                <Chip tone="blue">{s.statusLabel}</Chip>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </SectionCard>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerProfileManagement;
