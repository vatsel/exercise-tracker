import { Suspense } from "react";
import { connection } from "next/server";
import { WorkoutForm } from "@/components/WorkoutForm";
import { getPreviousSession, todayDate, workoutExists } from "@/lib/workouts";

export default function Home() {
  return (
    <main>
      <Suspense fallback={<p>Loading…</p>}>
        <TodayLog />
      </Suspense>
    </main>
  );
}

async function TodayLog() {
  // Today's date must be read per request, not when the page is prerendered.
  await connection();
  const date = todayDate();
  const [alreadyLogged, previous] = await Promise.all([workoutExists(date), getPreviousSession(date)]);

  return <WorkoutForm date={date} alreadyLogged={alreadyLogged} previous={previous} />;
}
