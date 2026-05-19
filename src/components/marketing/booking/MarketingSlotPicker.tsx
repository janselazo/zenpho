"use client";

import { useCallback, useEffect, useState } from "react";

const BUSINESS_HOURS = { start: 9, end: 17 };
const SLOT_DURATION = 30;
const BUSINESS_DAYS = [1, 2, 3, 4, 5];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type PickerSlot = { start: Date; end: Date; label: string };
type BookedSlot = { starts_at: string; ends_at: string };

function generateSlots(date: Date): PickerSlot[] {
  const slots: PickerSlot[] = [];
  for (let h = BUSINESS_HOURS.start; h < BUSINESS_HOURS.end; h++) {
    for (let m = 0; m < 60; m += SLOT_DURATION) {
      const start = new Date(date);
      start.setHours(h, m, 0, 0);
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + SLOT_DURATION);
      if (
        end.getHours() > BUSINESS_HOURS.end ||
        (end.getHours() === BUSINESS_HOURS.end &&
          end.getMinutes() > 0 &&
          h === BUSINESS_HOURS.end)
      ) {
        continue;
      }
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

function isSlotBooked(slot: PickerSlot, booked: BookedSlot[]) {
  return booked.some((b) => {
    const bs = new Date(b.starts_at).getTime();
    const be = new Date(b.ends_at).getTime();
    return slot.start.getTime() < be && slot.end.getTime() > bs;
  });
}

function isSlotPast(slot: PickerSlot) {
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

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function MarketingSlotPicker({
  value,
  onChange,
}: {
  value: PickerSlot | null;
  onChange: (slot: PickerSlot | null) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    if (!value) return null;
    const d = new Date(value.start);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBooked = useCallback(async (date: Date) => {
    try {
      const res = await fetch(`/api/book?date=${toDateStr(date)}`);
      const data = (await res.json()) as { slots?: BookedSlot[] };
      setBookedSlots(data.slots ?? []);
    } catch {
      setBookedSlots([]);
    }
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    fetchBooked(selectedDate).finally(() => setLoading(false));
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
    onChange(null);
  }

  const cells = getCalendarDays(viewYear, viewMonth);
  const slots = selectedDate ? generateSlots(selectedDate) : [];
  const canGoPrev =
    viewYear > today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth > today.getMonth());

  return (
    <div className="mkt-cal">
      <div className="mkt-cal-month">
        <div className="mkt-cal-month-head">
          <h3 className="mkt-cal-month-title">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h3>
          <div className="mkt-cal-nav">
            <button
              type="button"
              onClick={prevMonth}
              disabled={!canGoPrev}
              aria-label="Previous month"
            >
              ‹
            </button>
            <button type="button" onClick={nextMonth} aria-label="Next month">
              ›
            </button>
          </div>
        </div>

        <div className="mkt-cal-dow">
          {DAY_LABELS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        <div className="mkt-cal-grid">
          {cells.map((day, i) => {
            if (day === null) {
              return <span key={`e-${i}`} className="mkt-cal-day empty" />;
            }
            const d = new Date(viewYear, viewMonth, day);
            const isWeekend = !BUSINESS_DAYS.includes(d.getDay());
            const isPast = d < today;
            const disabled = isWeekend || isPast;
            const isSelected =
              selectedDate !== null && isSameDay(d, selectedDate);
            const isToday = isSameDay(d, today);

            const classes = ["mkt-cal-day"];
            if (isSelected) classes.push("selected");
            else if (disabled) classes.push("disabled");
            else if (isToday) classes.push("today");

            return (
              <button
                key={`d-${day}`}
                type="button"
                disabled={disabled}
                onClick={() => handleDateClick(day)}
                className={classes.join(" ")}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mkt-cal-slots">
        {!selectedDate ? (
          <div className="mkt-cal-slots-empty">
            Select a date to see available times.
          </div>
        ) : (
          <>
            <div className="mkt-cal-slots-head">
              <p className="mkt-cal-slots-date">
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p className="mkt-cal-slots-meta">30 min · Strategy call</p>
            </div>
            <div className="mkt-cal-slots-list">
              {loading ? (
                <div className="mkt-cal-slots-loading">Loading…</div>
              ) : (
                slots.map((slot) => {
                  const booked = isSlotBooked(slot, bookedSlots);
                  const past = isSlotPast(slot);
                  const unavailable = booked || past;
                  const active =
                    value?.start.getTime() === slot.start.getTime();

                  const classes = ["mkt-cal-slot"];
                  if (active) classes.push("active");
                  else if (unavailable) classes.push("unavailable");

                  return (
                    <button
                      key={slot.start.toISOString()}
                      type="button"
                      disabled={unavailable}
                      onClick={() => onChange(slot)}
                      className={classes.join(" ")}
                    >
                      {slot.label}
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
