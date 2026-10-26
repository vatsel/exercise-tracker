import { Suspense } from "react";
import { connection } from "next/server";
import { SiteNav } from "@/components/SiteNav";
import { WorkoutForm } from "@/components/WorkoutForm";
import { getPreviousLog, getWorkoutLog, todayDate, workoutDate } from "@/lib/workouts";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default function Home({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main>
      <SiteNav />
      <Suspense fallback={<p>Loading…</p>}>
        <DateLog searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

// The log for the date in ?date=, or for today when there is none or it isn't a valid date.
async function DateLog({ searchParams }: { searchParams: SearchParams }) {
  // Today's date must be read per request, not when the page is prerendered.
  await connection();
  const requestedDate = (await searchParams).date;
  const parsedDate = workoutDate.safeParse(requestedDate);
  let date = todayDate();
  if (parsedDate.success) {
    date = parsedDate.data;
  }
  const [savedLog, previous] = await Promise.all([getWorkoutLog(date), getPreviousLog(date)]);

  // A new key per date starts the form over instead of keeping the last date's entries.
  return <WorkoutForm key={date} date={date} savedLog={savedLog} previous={previous} />;
}
