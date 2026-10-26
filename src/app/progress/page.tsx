import { Suspense } from "react";
import { connection } from "next/server";
import { LineChart } from "@/components/LineChart";
import { SiteNav } from "@/components/SiteNav";
import { getBodyWeightHistory, getExerciseHistories } from "@/lib/progress";
import { todayDate } from "@/lib/workouts";
import styles from "./page.module.css";

export default function ProgressPage() {
  return (
    <main>
      <SiteNav />
      <Suspense fallback={<p className={styles.page}>Loading…</p>}>
        <ProgressCharts />
      </Suspense>
    </main>
  );
}

async function ProgressCharts() {
  // The charts must show what is logged now, not what was there when the page was prerendered.
  await connection();
  const [bodyWeights, exercises] = await Promise.all([getBodyWeightHistory(), getExerciseHistories()]);

  // Every chart runs from the first logged workout to today, so the same date lines up across them.
  const loggedDates = exercises.flatMap((exercise) => exercise.points.map((point) => point.date));
  const allDates = [...loggedDates, ...bodyWeights.map((point) => point.date)].sort();
  const lastDate = todayDate();
  const firstDate = allDates[0] ?? lastDate;

  return (
    <div className={styles.page}>
      <h1>Progress</h1>
      <section className={styles.section}>
        <h2>Body weight</h2>
        <LineChart label="Body weight by date" unit="kg" points={bodyWeights} firstDate={firstDate} lastDate={lastDate} />
      </section>
      {exercises.map((exercise) => (
        <section key={exercise.id} className={styles.section}>
          <h2>{exercise.name}</h2>
          <LineChart
            label={`${exercise.name}: total reps by date`}
            unit="reps"
            points={exercise.points}
            firstDate={firstDate}
            lastDate={lastDate}
          />
        </section>
      ))}
    </div>
  );
}
