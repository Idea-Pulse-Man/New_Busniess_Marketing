import { BLOCKED_MESSAGES, type BlockReason } from "@/lib/proxycheck";
import { LogoMark } from "./logo";

// Shown instead of the public pages while "Block site access" is on and the visitor is blocked.
// Colours follow the logo: its near-black backdrop, gold frame and teal glow.
export function AccessBlocked({ reason }: { reason: BlockReason }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[#111113] px-4"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at 50% 0%, rgb(234 179 8 / 0.14), transparent 55%), radial-gradient(ellipse at 50% 100%, rgb(45 212 191 / 0.12), transparent 55%)",
      }}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-amber-200/15 bg-[#18181b]/90 p-8 text-center shadow-2xl shadow-black/60">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
        <LogoMark size={72} className="mx-auto rounded-2xl! ring-amber-300/30! shadow-lg! shadow-amber-500/10!" />
        <h1 className="mt-5 text-xl font-semibold text-amber-50">
          {reason === "proxy" ? "Please turn off your VPN" : "Not available"}
        </h1>
        <p className="mt-2 text-zinc-400">{BLOCKED_MESSAGES[reason]}</p>
      </div>
    </div>
  );
}
