import { BLOCKED_MESSAGES, type BlockReason } from "@/lib/proxycheck";
import { site } from "@/lib/site";

// Shown instead of the public pages while "Block site access" is on and the visitor is blocked.
export function AccessBlocked({ reason }: { reason: BlockReason }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/60">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 font-bold text-white">
          {site.name[0]}
        </span>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">
          {reason === "proxy" ? "Please turn off your VPN" : "Not available"}
        </h1>
        <p className="mt-2 text-slate-600">{BLOCKED_MESSAGES[reason]}</p>
      </div>
    </div>
  );
}
