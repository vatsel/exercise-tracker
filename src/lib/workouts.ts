import "server-only";
import { z } from "zod";
import { sql } from "@/lib/db";

export type LoggedSet = {
  reps: number;
  otherSideReps: number | null;
  approximate: boolean;
};

// One exercise from the routine, with what one workout logged for it.
export type ExerciseLog = {
  id: number;
  name: string;
  perSide: boolean;
  setCount: number;
  band: string | null;
  note: string | null;
  sets: LoggedSet[];
};

// Every exercise in the current routine as one workout logged it. Exercises it didn't include have no band, note or sets.
// Retired exercises are left out, though their sets stay in the database.
export type WorkoutLog = {
  date: string | null;
  bodyWeight: number | null;
  exercises: ExerciseLog[];
};

type WorkoutRow = { id: number; date: string; bodyWeight: number | null };

const workoutColumns = `id, date::text as date, body_weight_kg::float8 as "bodyWeight"`;

// A workout date as YYYY-MM-DD, the form both the date picker and the workout.date column use.
export const workoutDate = z.iso.date("Invalid date.");

// Today's date as YYYY-MM-DD in the server's local time zone.
export function todayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// The log saved for `date`, or null when nothing has been saved for it yet.
export async function getWorkoutLog(date: string): Promise<WorkoutLog | null> {
  const workouts = await sql<WorkoutRow>(`select ${workoutColumns} from workout where date = $1`, [date]);
  const workout = workouts[0];
  if (workout === undefined) {
    return null;
  }
  return logFor(workout);
}

// The most recent log before `date`, or an empty one when there is none.
export async function getPreviousLog(date: string): Promise<WorkoutLog> {
  const workouts = await sql<WorkoutRow>(
    `select ${workoutColumns} from workout where date < $1 order by date desc limit 1`,
    [date],
  );
  const workout = workouts[0];
  if (workout === undefined) {
    const exercises = await getExerciseLogs(null);
    return { date: null, bodyWeight: null, exercises };
  }
  return logFor(workout);
}

async function logFor(workout: WorkoutRow): Promise<WorkoutLog> {
  const exercises = await getExerciseLogs(workout.id);
  return { date: workout.date, bodyWeight: workout.bodyWeight, exercises };
}

async function getExerciseLogs(workoutId: number | null): Promise<ExerciseLog[]> {
  return sql<ExerciseLog>(
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
     where e.retired_at is null
     group by e.id, we.id
     order by e.position`,
    [workoutId],
  );
}
