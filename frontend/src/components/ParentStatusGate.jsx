import { useLocation } from "react-router-dom";
import { Clock3, FileWarning, LogOut, PartyPopper, PhoneCall } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import BrandLogo from "./BrandLogo";

// Buong /parent/* area ang gate na 'to hanggang 'active' ang client status -
// walang dashboard, appointments, o progress na makikita habang naka-pending
// o na-reject, kasi wala pa/hindi na-assign na therapist para doon.
export default function ParentStatusGate({ status, rejectionReason, clientName }) {
  const { logout } = useAuth();
  const location = useLocation();
  const justEnrolled = Boolean(location.state?.justEnrolled);

  const isRejected = status === "rejected";

  return (
    <div className="flex min-h-screen items-center justify-center bg-chalk px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-mist-light sm:p-10">
        <div className="mx-auto mb-6 h-14 w-auto">
          <BrandLogo className="mx-auto h-14 w-auto" />
        </div>

        <span
          className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full ${
            isRejected ? "bg-coral-red-light text-coral-red" : "bg-amber-light text-amber"
          }`}
        >
          {isRejected ? <FileWarning size={24} /> : <Clock3 size={24} />}
        </span>

        {!isRejected && (
          <>
            <p className="mb-2 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest text-sunrise">
              {justEnrolled && <PartyPopper size={14} />}
              {justEnrolled ? "Thanks for registering" : "Registration under review"}
            </p>
            <h1 className="font-display text-2xl font-semibold text-ink">
              We're reviewing {clientName ? `${clientName}'s` : "your"} registration
            </h1>
            <p className="mt-3 text-sm leading-6 text-mist">
              Our clinic checks the diagnosis you submitted and matches your child with the
              right available specialist. This usually takes a short while — you'll be able to
              book sessions here as soon as it's approved.
            </p>
          </>
        )}

        {isRejected && (
          <>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-coral-red">
              Registration not approved
            </p>
            <h1 className="font-display text-2xl font-semibold text-ink">
              We couldn't complete {clientName ? `${clientName}'s` : "this"} registration
            </h1>
            <p className="mt-3 text-sm leading-6 text-mist">
              {rejectionReason || "Please contact the front desk for details."}
            </p>
            <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-chalk px-4 py-3 text-sm text-ink">
              <PhoneCall size={15} className="flex-shrink-0 text-harbor" />
              Contact the front desk if you'd like to update and resubmit your information.
            </div>
          </>
        )}

        <button
          onClick={logout}
          className="mx-auto mt-8 flex items-center gap-2 rounded-xl border border-mist-light px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-chalk"
        >
          <LogOut size={15} />
          Log out
        </button>
      </div>
    </div>
  );
}
