import "server-only";
import { sql } from "@/lib/db";

// One value on a progress chart. `series` groups points into one coloured line; null when the chart has only one.
export type ChartPoint = {
  date: string;
  value: number;
  approximate: boolean;
  series: string | null;
};

// Everything one exercise has logged, oldest first.
export type ExerciseHistory = {
  id: number;
  name: string;
  points: ChartPoint[];
};

// Every logged body weight, oldest first.
export async function getBodyWeightHistory(): Promise<ChartPoint[]> {
  return sql<ChartPoint>(
    `select
       date::text as date,
       body_weight_kg::float8 as value,
       false as approximate,
       null as series
     from workout
     where body_weight_kg is not null
     order by date`,
  );
}

// The total reps each workout logged for each exercise, with the band it used as the series.
// A per-side set counts the average of its two sides, so it stays comparable to a one-sided set.
// Exercises never logged are left out; retired ones stay, since their history still shows progress.
export async function getExerciseHistories(): Promise<ExerciseHistory[]> {
  return sql<ExerciseHistory>(
    `select e.id, e.name, json_agg(day order by day.date) as points
     from exercise e
     join lateral (
       select
         w.date::text as date,
         sum((s.reps + coalesce(s.other_side_reps, s.reps)) / 2)::float8 as value,
         bool_or(s.reps_approximate) as approximate,
         nullif(trim(we.band), '') as series
       from workout_exercise we
       join workout w on w.id = we.workout_id
       join exercise_set s on s.workout_exercise_id = we.id
       where we.exercise_id = e.id
       group by we.id, w.date
     ) day on true
     group by e.id
     order by e.position`,
  );
}
