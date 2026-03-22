"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check, Clock, ArrowLeft } from "lucide-react";

const BUSINESS_HOURS = { start: 9, end: 17 };
const SLOT_DURATION = 30;
const BUSINESS_DAYS = [1, 2, 3, 4, 5]; // Mon–Fri

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const inputClass =
  "w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/40 outline-none shadow-sm transition-all focus:border-accent focus:ring-2 focus:ring-accent/15";

type Step = "pick" | "form" | "done";
type BookedSlot = { starts_at: string; ends_at: string };

function generateSlots(date: Date): { start: Date; end: Date; label: string }[] {
  const slots: { start: Date; end: Date; label: string }[] = [];
  for (let h = BUSINESS_HOURS.start; h < BUSINESS_HOURS.end; h++) {
    for (let m = 0; m < 60; m += SLOT_DURATION) {
      const start = new Date(date);
      start.setHours(h, m, 0, 0);
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + SLOT_DURATION);
      if (end.getHours() > BUSINESS_HOURS.end || (end.getHours() === BUSINESS_HOURS.end && end.getMinutes() > 0 && h === BUSINESS_HOURS.end)) continue;
      const label = start.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      slots.push({ start, end, label });
    }
  }
  return slots;
}

function isSlotBooked(slot: { start: Date; end: Date }, booked: BookedSlot[]) {
  return booked.some((b) => {
    const bs = new Date(b.starts_at).getTime();
    const be = new Date(b.ends_at).getTime();
    return slot.start.getTime() < be && slot.end.getTime() > bs;
  });
}

function isSlotPast(slot: { start: Date }) {
  return slot.start.getTime() <= Date.now();
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Calendar grid for a given month
function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  // Monday-based: 0=Mon … 6=Sun
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function BookingCalendar() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{
    start: Date;
    end: Date;
    label: string;
  } | null>(null);
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("pick");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBooked = useCallback(async (date: Date) => {
    try {
      const res = await fetch(`/api/book?date=${toDateStr(date)}`);
      const data = await res.json();
      setBookedSlots(data.slots ?? []);
    } catch {
      setBookedSlots([]);
    }
  }, []);

  useEffect(() => {
    if (selectedDate) {
      setLoading(true);
      fetchBooked(selectedDate).finally(() => setLoading(false));
    }
  }, [selectedDate, fetchBooked]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  function handleDateClick(day: number) {
    const d = new Date(viewYear, viewMonth, day);
    d.setHours(0, 0, 0, 0);
    if (!BUSINESS_DAYS.includes(d.getDay())) return;
    if (d < today) return;
    setSelectedDate(d);
    setSelectedSlot(null);
  }

  function handleSlotClick(slot: { start: Date; end: Date; label: string }) {
    setSelectedSlot(slot);
  }

  function goToForm() {
    if (selectedSlot) {
      setStep("form");
      setError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedSlot) return;
    setSubmitting(true);
    setError(null);

    const fd = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          phone: fd.get("phone"),
          company: fd.get("company"),
          message: fd.get("message"),
          starts_at: selectedSlot.start.toISOString(),
          ends_at: selectedSlot.end.toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setSubmitting(false);
        return;
      }
      setStep("done");
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  const cells = getCalendarDays(viewYear, viewMonth);
  const slots = selectedDate ? generateSlots(selectedDate) : [];
  const canGoPrev =
    viewYear > today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth > today.getMonth());

  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-border bg-white shadow-soft-lg">
      <AnimatePresence mode="wait">
        {step === "pick" && (
          <motion.div
            key="pick"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col md:flex-row"
          >
            {/* Left — Calendar */}
            <div className="flex-1 border-b border-border p-6 md:border-b-0 md:border-r">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-base font-semibold text-text-primary">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </h3>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={prevMonth}
                    disabled={!canGoPrev}
                    className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Day headers */}
              <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium uppercase tracking-wide text-text-secondary/60">
                {DAY_LABELS.map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7">
                {cells.map((day, i) => {
                  if (day === null) {
                    return <div key={`e-${i}`} />;
                  }
                  const d = new Date(viewYear, viewMonth, day);
                  const isWeekend = !BUSINESS_DAYS.includes(d.getDay());
                  const isPast = d < today;
                  const disabled = isWeekend || isPast;
                  const isSelected =
                    selectedDate !== null && isSameDay(d, selectedDate);
                  const isToday = isSameDay(d, today);

                  return (
                    <button
                      key={`d-${day}`}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleDateClick(day)}
                      className={`m-0.5 flex h-10 w-full items-center justify-center rounded-lg text-sm font-medium transition-all ${
                        isSelected
                          ? "bg-accent text-white shadow-sm"
                          : disabled
                            ? "cursor-default text-text-secondary/25"
                            : isToday
                              ? "bg-accent/10 text-accent hover:bg-accent/20"
                              : "text-text-primary hover:bg-surface"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right — Time slots */}
            <div className="flex w-full flex-col md:w-72">
              {!selectedDate ? (
                <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-text-secondary/60">
                  Select a date to see available times
                </div>
              ) : (
                <>
                  <div className="border-b border-border px-5 py-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-text-secondary/60">
                      {selectedDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <p className="mt-0.5 text-[11px] text-text-secondary/40">
                      30 min · Strategy call
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 py-3" style={{ maxHeight: 340 }}>
                    {loading ? (
                      <div className="flex h-full items-center justify-center py-12 text-sm text-text-secondary/40">
                        Loading…
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {slots.map((slot) => {
                          const booked = isSlotBooked(slot, bookedSlots);
                          const past = isSlotPast(slot);
                          const unavailable = booked || past;
                          const active =
                            selectedSlot?.start.getTime() ===
                            slot.start.getTime();

                          return (
                            <button
                              key={slot.start.toISOString()}
                              type="button"
                              disabled={unavailable}
                              onClick={() => handleSlotClick(slot)}
                              className={`flex w-full items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                                active
                                  ? "border-accent bg-accent text-white shadow-sm"
                                  : unavailable
                                    ? "cursor-default border-border bg-surface/50 text-text-secondary/30 line-through"
                                    : "border-border bg-white text-text-primary hover:border-accent/40 hover:text-accent"
                              }`}
                            >
                              <Clock className="mr-2 h-3.5 w-3.5 opacity-60" />
                              {slot.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Confirm button */}
                  {selectedSlot && (
                    <div className="border-t border-border px-4 py-3">
                      <button
                        type="button"
                        onClick={goToForm}
                        className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover"
                      >
                        Continue
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}

        {step === "form" && selectedSlot && (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25 }}
            className="p-6 sm:p-8"
          >
            <button
              type="button"
              onClick={() => setStep("pick")}
              className="mb-5 flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-accent"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to calendar
            </button>

            <div className="mb-6 rounded-xl bg-surface px-4 py-3">
              <p className="text-sm font-medium text-text-primary">
                {selectedSlot.start.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p className="text-xs text-text-secondary">
                {selectedSlot.label} – {selectedSlot.end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })} · 30 min
              </p>
            </div>

            {error && (
              <p className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="book-name" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">
                    Name
                  </label>
                  <input
                    id="book-name"
                    name="name"
                    type="text"
                    required
                    className={inputClass}
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label htmlFor="book-email" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">
                    Email
                  </label>
                  <input
                    id="book-email"
                    name="email"
                    type="email"
                    required
                    className={inputClass}
                    placeholder="you@company.com"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="book-phone" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">
                    Phone
                  </label>
                  <input
                    id="book-phone"
                    name="phone"
                    type="tel"
                    className={inputClass}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <div>
                  <label htmlFor="book-company" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">
                    Company
                  </label>
                  <input
                    id="book-company"
                    name="company"
                    type="text"
                    className={inputClass}
                    placeholder="Your company (optional)"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="book-message" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">
                  What would you like to discuss?
                </label>
                <textarea
                  id="book-message"
                  name="message"
                  rows={3}
                  className={`${inputClass} resize-none`}
                  placeholder="Brief overview of your project or idea…"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-60"
              >
                {submitting ? "Booking…" : "Book call"}
              </button>
            </form>
          </motion.div>
        )}

        {step === "done" && selectedSlot && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center px-6 py-16 text-center sm:py-20"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-7 w-7 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">
              You&apos;re booked!
            </h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">
              We&apos;ll send a calendar invite to your email. See you on{" "}
              <span className="font-medium text-text-primary">
                {selectedSlot.start.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </span>{" "}
              at{" "}
              <span className="font-medium text-text-primary">
                {selectedSlot.label}
              </span>
              .
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
