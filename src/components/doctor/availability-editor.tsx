"use client";

import { useState } from "react";
import { Badge } from "@/components/ui";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Rule {
  id: string; hospital_id: string; weekday: number;
  start_time: string; end_time: string; slot_minutes: number;
}

/** A weekly grid: which hospital, which hours, what slot length. Read-only
 *  in the demo build — editing writes to doctor_availability, and the slot
 *  generator picks the change up on the next query with no other change. */
export function AvailabilityEditor({
  rules, hospitals,
}: { rules: Rule[]; hospitals: { id: string; name: string }[] }) {
  const [hospitalId, setHospitalId] = useState(hospitals[0]?.id ?? "");
  const forHospital = rules.filter((r) => r.hospital_id === hospitalId);

  const slotsPerWeek = forHospital.reduce((total, r) => {
    const [sh, sm] = r.start_time.split(":").map(Number);
    const [eh, em] = r.end_time.split(":").map(Number);
    return total + Math.floor(((eh * 60 + em) - (sh * 60 + sm)) / r.slot_minutes);
  }, 0);

  return (
    <div>
      {hospitals.length > 1 && (
        <div className="flex gap-1.5 mb-3">
          {hospitals.map((h) => (
            <button
              key={h.id}
              onClick={() => setHospitalId(h.id)}
              className={`pill px-3 py-1.5 ${
                hospitalId === h.id ? "bg-[var(--color-brand)] text-white border-[var(--color-brand)]" : ""
              }`}
            >
              {h.name}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-[var(--color-line)]">
              <th className="py-2 eyebrow font-normal w-16">Day</th>
              <th className="py-2 eyebrow font-normal">Clinic hours</th>
              <th className="py-2 eyebrow font-normal w-28">Slot length</th>
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day, i) => {
              const dayRules = forHospital.filter((r) => r.weekday === i);
              return (
                <tr key={day} className="border-b border-[var(--color-line)] last:border-0">
                  <td className="py-2 font-medium">{day}</td>
                  <td className="py-2">
                    {dayRules.length === 0 ? (
                      <span className="text-[var(--color-ink-3)]">No clinic</span>
                    ) : (
                      <span className="flex flex-wrap gap-1.5">
                        {dayRules.map((r) => (
                          <Badge key={r.id} tone="brand">
                            {r.start_time}–{r.end_time}
                          </Badge>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-[var(--color-ink-3)]">
                    {dayRules.length ? `${dayRules[0].slot_minutes} min` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[var(--color-ink-3)] mt-3">
        {slotsPerWeek} bookable slots a week at this hospital, minus anything
        already booked and anything blocked by a leave or theatre exception.
      </p>
    </div>
  );
}
