import Link from "next/link";
import { requireDoctor } from "@/lib/auth";
import { db, doctorCard, todayQueue } from "@/lib/db/store";
import { Badge, Card, Empty, Stat } from "@/components/ui";
import { QueueRow } from "@/components/doctor/queue-row";
import { fmtTime } from "@/lib/utils";

// Landing view is today's clinic: a vertical queue with token number,
// patient, age/sex, the chief complaint from the booking, and a status chip.
// One primary action per row.

export default async function DoctorHome() {
  const session = await requireDoctor();
  const doc = doctorCard(session.userId)!;
  const queue = todayQueue(session.userId);

  const completed = queue.filter((a) => a.status === "completed").length;
  const waiting = queue.filter((a) => ["checked_in", "confirmed"].includes(a.status)).length;

  // Average consult duration, derived rather than guessed
  const durations = db.caseSheets
    .filter((c) => c.doctor_id === session.userId && c.finalized_at)
    .map((c) => (new Date(c.finalized_at!).getTime() - new Date(c.created_at).getTime()) / 60000)
    .filter((d) => d > 0 && d < 120);
  const avg = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null;

  const drafts = db.caseSheets.filter((c) => c.doctor_id === session.userId && c.status === "draft");

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <div className="eyebrow">Today&apos;s clinic</div>
          <h1 className="text-[1.5rem] font-bold tracking-tight">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </h1>
        </div>
        <p className="text-sm text-[var(--color-ink-3)]">
          {doc.hospitals[0]?.name} · {doc.specialization}
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 mb-5">
        <Stat label="Patients today" value={queue.length} />
        <Stat label="Completed" value={completed} tone="good" />
        <Stat label="Waiting" value={waiting} tone={waiting > 3 ? "warning" : "neutral"} />
        <Stat label="Avg consult" value={avg ? `${avg} min` : "—"} />
      </div>

      {drafts.length > 0 && (
        <Card className="mb-4 border-[color-mix(in_srgb,var(--color-warning)_40%,transparent)] bg-[var(--color-warning-soft)]">
          <p className="text-sm text-[var(--color-warning)] font-medium">
            {drafts.length} unfinalised case sheet{drafts.length === 1 ? "" : "s"}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {drafts.slice(0, 4).map((d) => (
              <Link key={d.id} href={`/doctor/case/${d.id}`} className="pill bg-[var(--color-surface)]">
                {db.profiles.find((p) => p.id === d.patient_id)?.full_name} · resume
              </Link>
            ))}
          </div>
        </Card>
      )}

      {queue.length === 0 ? (
        <Empty
          title="No appointments today"
          body="Your availability rules decide which slots patients can book. Check them in your profile."
          action={
            <Link href="/doctor/profile" className="pill hover:border-[var(--color-brand)]">
              Open availability editor
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {queue.map((a) => (
            <QueueRow
              key={a.id}
              appointment={{
                id: a.id,
                token: a.token_no,
                time: fmtTime(a.slot_start),
                status: a.status,
                reason: a.reason,
                caseSheetId: a.caseSheet?.id ?? null,
                caseStatus: a.caseSheet?.status ?? null,
              }}
              patient={{
                id: a.patient.id,
                name: a.patient.full_name,
                age: a.patient.age,
                sex: a.patient.sex,
                mrn: a.patient.mrn,
              }}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-[var(--color-ink-3)] mt-4">
        This queue is subscribed to a realtime channel — a patient checking in at
        the desk appears here without a refresh.
      </p>
    </div>
  );
}
