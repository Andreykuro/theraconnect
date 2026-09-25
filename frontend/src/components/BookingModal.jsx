import { useState, useEffect, useCallback } from "react";
import { X, Loader2, CalendarCheck } from "lucide-react";
import { format, parseISO, addDays } from "date-fns";
import api from "../lib/api";
import useModalEntrance from "../hooks/useModalEntrance";

function todayISODate() {
  const d = new Date();
  return format(d, "yyyy-MM-dd");
}

export default function BookingModal({ therapists, onClose, onBooked }) {
  const [therapistId, setTherapistId] = useState(therapists[0]?.id || "");
  const [date, setDate] = useState(todayISODate());
  const [slots, setSlots] = useState([]);
  const [closed, setClosed] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");
  const { backdropRef, panelRef } = useModalEntrance();

  const therapist = therapists.find((t) => String(t.id) === String(therapistId));
  const minDate = todayISODate();
  const maxDate = format(addDays(new Date(), 60), "yyyy-MM-dd");

  const loadSlots = useCallback(async () => {
    if (!therapistId || !date) return;
    setLoadingSlots(true);
    setError("");
    try {
      const { data } = await api.get("/appointments/slots", { params: { therapist_id: therapistId, date } });
      setSlots(data.slots);
      setClosed(data.closed);
    } catch {
      setError("Couldn't load available times. Please try again.");
    } finally {
      setLoadingSlots(false);
    }
  }, [therapistId, date]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  async function bookSlot(slot) {
    if (!therapist || booking) return;
    setBooking(true);
    setError("");
    try {
      await api.post("/appointments/book", {
        therapist_id: therapist.id,
        service_type: therapist.specialty,
        start_time: slot.start_time,
        end_time: slot.end_time,
      });
      onBooked();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't book that session. Please try another time.");
      loadSlots(); // that slot (or others) may no longer be accurate - refresh
    } finally {
      setBooking(false);
    }
  }

  return (
    <div ref={backdropRef} className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div ref={panelRef} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck size={20} className="text-harbor" />
            <h2 className="font-display text-xl font-semibold text-ink">Book a session</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-mist hover:text-ink">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-mist">
              Therapist
            </label>
            <select
              value={therapistId}
              onChange={(e) => setTherapistId(e.target.value)}
              className="w-full rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor"
            >
              {therapists.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.specialty}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-mist">
              Date
            </label>
            <input
              type="date"
              value={date}
              min={minDate}
              max={maxDate}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-mist-light px-3 py-2 text-sm outline-none focus:border-harbor"
            />
          </div>
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-mist">
          Available times
        </p>

        {loadingSlots ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-chalk py-10 text-sm text-mist">
            <Loader2 size={16} className="animate-spin" />
            Checking the schedule…
          </div>
        ) : closed ? (
          <p className="rounded-xl bg-chalk px-4 py-6 text-center text-sm text-mist">
            The clinic is closed on Sundays. Please pick another date.
          </p>
        ) : slots.length === 0 ? (
          <p className="rounded-xl bg-chalk px-4 py-6 text-center text-sm text-mist">
            No open times left on this date. Try another day.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {slots.map((slot) => (
              <button
                key={slot.start_time}
                disabled={booking}
                onClick={() => bookSlot(slot)}
                className="rounded-lg border border-harbor/30 bg-harbor-light px-2 py-2 font-mono text-sm font-medium text-harbor-dark transition hover:bg-harbor hover:text-white disabled:opacity-50"
              >
                {format(parseISO(slot.start_time), "h:mm a")}
              </button>
            ))}
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-lg bg-coral-red-light px-3 py-2 text-sm text-coral-red">{error}</p>
        )}

        <p className="mt-4 text-xs text-mist">
          Tap a time to request it for your child — the clinic will review and confirm it
          shortly. Once picked, that slot is no longer offered to other families while it's
          under review.
        </p>
      </div>
    </div>
  );
}
