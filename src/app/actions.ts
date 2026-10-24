"use server";

import { sql, transaction, type Query } from "@/lib/db";
import {
  approximateField,
  bandField,
  bodyWeightField,
  dateField,
  noteField,
  otherSideRepsField,
  repsField,
} from "@/lib/workoutFields";

export type SaveState = { message: string | null };

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

// Blank fields become null so they are stored as missing rather than empty.
function textOrNull(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  return trimmed;
}

function numberOrNull(formData: FormData, name: string): number | null {
  const text = textOrNull(formData, name);
  if (text === null) {
    return null;
  }
  return Number(text);
}

// Saves the log for one date, replacing whatever was logged for that date before.
export async function saveWorkout(_previousState: SaveState, formData: FormData): Promise<SaveState> {
  const date = textOrNull(formData, dateField);
  if (date === null || !datePattern.test(date)) {
    return { message: "Invalid date." };
  }

  const bodyWeight = numberOrNull(formData, bodyWeightField);
  const exercises = await sql<{ id: number }>("select id from exercise order by position");

  const queries: Query[] = [
    {
      query: `insert into workout (date, body_weight_kg) values ($1, $2)
              on conflict (date) do update set body_weight_kg = excluded.body_weight_kg`,
      params: [date, bodyWeight],
    },
    {
      query: "delete from workout_exercise where workout_id = (select id from workout where date = $1)",
      params: [date],
    },
  ];

  for (const exercise of exercises) {
    const band = textOrNull(formData, bandField(exercise.id));
    const note = textOrNull(formData, noteField(exercise.id));
    queries.push({
      query: `insert into workout_exercise (workout_id, exercise_id, band, note)
              select id, $2, $3, $4 from workout where date = $1`,
      params: [date, exercise.id, band, note],
    });

    // A set left without reps was skipped, so it is not stored.
    let setNumber = 1;
    while (formData.has(repsField(exercise.id, setNumber))) {
      const reps = numberOrNull(formData, repsField(exercise.id, setNumber));
      if (reps !== null) {
        const otherSideReps = numberOrNull(formData, otherSideRepsField(exercise.id, setNumber));
        const approximate = formData.has(approximateField(exercise.id, setNumber));
        queries.push({
          query: `insert into exercise_set (workout_exercise_id, set_number, reps, other_side_reps, reps_approximate)
                  select we.id, $3, $4, $5, $6
                  from workout_exercise we
                  join workout w on w.id = we.workout_id
                  where w.date = $1 and we.exercise_id = $2`,
          params: [date, exercise.id, setNumber, reps, otherSideReps, approximate],
        });
      }
      setNumber += 1;
    }
  }

  await transaction(queries);
  return { message: `Saved the log for ${date}.` };
}
