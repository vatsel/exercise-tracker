import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { SiteNav } from "@/components/SiteNav";
import { getAllLogs, type ExerciseLog, type LoggedSet } from "@/lib/workouts";
import styles from "@/components/Page.module.css";

export default function EditPage() {
  return (
    <main>
      <SiteNav />
      <Suspense fallback={<p className={styles.page}>Loading…</p>}>
        <LogList />
      </Suspense>
    </main>
  );
}

async function LogList() {
  // The list must show what is logged now, not what was there when the page was prerendered.
  await connection();
  const logs = await getAllLogs();

  return (
    <div className={styles.page}>
      <h1>All logs</h1>
      {logs.length === 0 && <p>Nothing logged yet.</p>}
      {logs.map((log) => (
        <section key={log.date} className={styles.section}>
          <h2>{log.date}</h2>
          {/* The log form opens the saved log for any date it is given. */}
          <Link href={`/?date=${log.date}`} className={styles.link}>
            Edit this log
          </Link>
          {log.bodyWeight !== null && <p>Body weight: {log.bodyWeight} kg</p>}
          {log.exercises.map((exercise) => (
            <ExerciseSummary key={exercise.id} exercise={exercise} />
          ))}
        </section>
      ))}
    </div>
  );
}

function ExerciseSummary({ exercise }: { exercise: ExerciseLog }) {
  let sets = "skipped";
  if (exercise.sets.length > 0) {
    sets = exercise.sets.map(formatSet).join(", ");
  }

  return (
    <div>
      <h3>{exercise.name}</h3>
      {exercise.band !== null && <p>Band: {exercise.band}</p>}
      <p>Reps: {sets}</p>
      {exercise.note !== null && <p>Notes: {exercise.note}</p>}
    </div>
  );
}

// Reps as "~12", or "12 / 11" for both sides of a per-side set.
function formatSet(set: LoggedSet): string {
  let reps = String(set.reps);
  if (set.otherSideReps !== null) {
    reps = `${reps} / ${set.otherSideReps}`;
  }
  if (set.approximate) {
    reps = `~${reps}`;
  }
  return reps;
}
