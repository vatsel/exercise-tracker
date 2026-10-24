import "server-only";
import { sql } from "@/lib/db";

export type LoggedSet = {
  reps: number;
  otherSideReps: number | null;
  approximate: boolean;
};

// One exercise from the routine, with what was logged for it in the previous session.
export type PreviousExercise = {
  id: number;
  name: string;
  perSide: boolean;
  setCount: number;
  band: string | null;
  note: string | null;
  sets: LoggedSet[];
};

export type PreviousSession = {
  date: string | null;
  exercises: PreviousExercise[];
};

// Today's date as YYYY-MM-DD in the server's local time zone.
export function todayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function workoutExists(date: string): Promise<boolean> {
  const rows = await sql<{ exists: boolean }>(
    "select exists (select 1 from workout where date = $1) as exists",
    [date],
  );
  return rows[0].exists;
}

// The most recent workout before `date`, with every exercise in the routine.
// Exercises that workout didn't include come back with no band, note or sets.
export async function getPreviousSession(date: string): Promise<PreviousSession> {
  const workouts = await sql<{ id: number; date: string }>(
    "select id, date::text as date from workout where date < $1 order by date desc limit 1",
    [date],
  );
  const previousWorkout = workouts[0];
  const previousWorkoutId = previousWorkout ? previousWorkout.id : null;

  const exercises = await sql<PreviousExercise>(
    `select
       e.id,
       e.name,
       e.per_side as "perSide",
       e.set_count as "setCount",
       we.band,
       we.note,
       coalesce(
         json_agg(
           json_build_object(
             'reps', s.reps,
             'otherSideReps', s.other_side_reps,
             'approximate', s.reps_approximate
           )
           order by s.set_number
         ) filter (where s.id is not null),
         '[]'
       ) as sets
     from exercise e
     left join workout_exercise we on we.exercise_id = e.id and we.workout_id = $1
     left join exercise_set s on s.workout_exercise_id = we.id
     group by e.id, we.id
     order by e.position`,
    [previousWorkoutId],
  );

  return {
    date: previousWorkout ? previousWorkout.date : null,
    exercises,
  };
}
