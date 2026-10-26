"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sql, transaction, type Query } from "@/lib/db";
import { exerciseNameField, perSideField, setCountField } from "@/lib/exerciseFields";
import { emailField, passwordField } from "@/lib/loginFields";
import { verifyPassword } from "@/lib/password";
import { startSession } from "@/lib/session";
import { workoutDate } from "@/lib/workouts";
import {
  approximateField,
  bandField,
  bodyWeightField,
  dateField,
  noteField,
  otherSideRepsField,
  repsField,
} from "@/lib/workoutFields";

// What a form action reports back for the form to show.
export type ActionState = { message: string | null };

// The workout form also needs to know whether its latest save went through.
export type SaveState = ActionState & { saved: boolean };

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

// Limits match the numeric(4, 1) and numeric(5, 1) columns in db/schema.sql.
const repCount = z.coerce
  .number({ error: "Reps must be a number." })
  .min(0, "Reps can't be negative.")
  .max(999.9, "Reps must be below 1000.");

const bodyWeightKg = z.coerce
  .number({ error: "Body weight must be a number." })
  .positive("Body weight must be above 0.")
  .max(9999.9, "Body weight must be below 10000 kg.");

const optionalText = z.string().max(1000, "Bands and notes must be under 1000 characters.").nullable();

const workoutSchema = z.object({
  date: workoutDate,
  bodyWeight: bodyWeightKg.nullable(),
  exercises: z.array(
    z.object({
      id: z.number(),
      band: optionalText,
      note: optionalText,
      sets: z.array(
        z.object({
          setNumber: z.number(),
          reps: repCount,
          otherSideReps: repCount.nullable(),
          approximate: z.boolean(),
        }),
      ),
    }),
  ),
});

// Gathers the workout form's fields into the shape workoutSchema checks; nothing is validated yet.
function readWorkoutForm(formData: FormData, exerciseIds: number[]) {
  const exercises = exerciseIds.map((exerciseId) => {
    // A set left without reps was skipped, so it is not stored.
    const sets = [];
    let setNumber = 1;
    while (formData.has(repsField(exerciseId, setNumber))) {
      const reps = textOrNull(formData, repsField(exerciseId, setNumber));
      if (reps !== null) {
        sets.push({
          setNumber,
          reps,
          otherSideReps: textOrNull(formData, otherSideRepsField(exerciseId, setNumber)),
          approximate: formData.has(approximateField(exerciseId, setNumber)),
        });
      }
      setNumber += 1;
    }
    return {
      id: exerciseId,
      band: textOrNull(formData, bandField(exerciseId)),
      note: textOrNull(formData, noteField(exerciseId)),
      sets,
    };
  });

  return {
    date: textOrNull(formData, dateField),
    bodyWeight: textOrNull(formData, bodyWeightField),
    exercises,
  };
}

// Saves the log for one date, replacing whatever was logged for that date before.
// The form calls this after every edit, so each save carries the whole form.
// Only exercises still in the routine are replaced; sets logged for retired ones are kept.
export async function saveWorkout(_previousState: SaveState, formData: FormData): Promise<SaveState> {
  const exerciseRows = await sql<{ id: number }>(
    "select id from exercise where retired_at is null order by position",
  );
  const exerciseIds = exerciseRows.map((exercise) => exercise.id);
  const parsed = workoutSchema.safeParse(readWorkoutForm(formData, exerciseIds));
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { message: `Not saved: ${firstIssue.message}`, saved: false };
  }
  const workout = parsed.data;

  const queries: Query[] = [
    {
      query: `insert into workout (date, body_weight_kg) values ($1, $2)
              on conflict (date) do update set body_weight_kg = excluded.body_weight_kg`,
      params: [workout.date, workout.bodyWeight],
    },
    {
      query: `delete from workout_exercise
              where workout_id = (select id from workout where date = $1)
                and exercise_id in (select id from exercise where retired_at is null)`,
      params: [workout.date],
    },
  ];

  for (const exercise of workout.exercises) {
    queries.push({
      query: `insert into workout_exercise (workout_id, exercise_id, band, note)
              select id, $2, $3, $4 from workout where date = $1`,
      params: [workout.date, exercise.id, exercise.band, exercise.note],
    });

    for (const set of exercise.sets) {
      queries.push({
        query: `insert into exercise_set (workout_exercise_id, set_number, reps, other_side_reps, reps_approximate)
                select we.id, $3, $4, $5, $6
                from workout_exercise we
                join workout w on w.id = we.workout_id
                where w.date = $1 and we.exercise_id = $2`,
        params: [workout.date, exercise.id, set.setNumber, set.reps, set.otherSideReps, set.approximate],
      });
    }
  }

  await transaction(queries);
  return { message: `Saved the log for ${workout.date}.`, saved: true };
}

// Limits match the exercise table's checks in db/schema.sql; the name cap is only a sanity limit.
const newExerciseSchema = z.object({
  name: z.string({ error: "Enter a name." }).max(100, "Names must be under 100 characters."),
  setCount: z.coerce
    .number({ error: "Sets must be a number." })
    .int("Sets must be a whole number.")
    .min(1, "Sets must be at least 1.")
    .max(20, "Sets must be 20 or fewer."),
  perSide: z.boolean(),
});

// Adds an exercise to the end of the routine. A retired exercise with the same name comes back instead,
// so its past sets line up with the new ones.
export async function addExercise(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = newExerciseSchema.safeParse({
    name: textOrNull(formData, exerciseNameField),
    setCount: textOrNull(formData, setCountField),
    perSide: formData.has(perSideField),
  });
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { message: `Not added: ${firstIssue.message}` };
  }
  const exercise = parsed.data;

  // The update only runs for a retired exercise, so a name already in the routine returns no row.
  const added = await sql<{ id: number }>(
    `insert into exercise (name, per_side, set_count, position)
     values ($1, $2, $3, (select coalesce(max(position), 0) + 1 from exercise))
     on conflict (name) do update
       set retired_at = null,
           per_side = excluded.per_side,
           set_count = excluded.set_count,
           position = excluded.position
       where exercise.retired_at is not null
     returning id`,
    [exercise.name, exercise.perSide, exercise.setCount],
  );
  if (added.length === 0) {
    return { message: `${exercise.name} is already in the routine.` };
  }

  refresh();
  return { message: `Added ${exercise.name}.` };
}

// Removes an exercise from the routine. Past logs keep its sets.
export async function retireExercise(exerciseId: number): Promise<void> {
  const id = z.number().int().parse(exerciseId);
  await sql("update exercise set retired_at = now() where id = $1 and retired_at is null", [id]);
  refresh();
}

// Emails are stored lowercase, so the entered one is lowercased before the lookup.
const loginSchema = z.object({
  email: z.email().transform((email) => email.toLowerCase()),
  password: z.string().min(1),
});

// Starts a session and opens the app when the email and password match a user.
export async function logIn(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  const failure = { message: "Wrong email or password." };
  const parsed = loginSchema.safeParse({
    email: textOrNull(formData, emailField),
    password: formData.get(passwordField),
  });
  if (!parsed.success) {
    return failure;
  }
  const { email, password } = parsed.data;

  const users = await sql<{ id: number; password_hash: string }>(
    "select id, password_hash from app_user where email = $1",
    [email],
  );
  const user = users[0];
  if (user === undefined) {
    return failure;
  }
  const passwordMatches = await verifyPassword(password, user.password_hash);
  if (!passwordMatches) {
    return failure;
  }

  await startSession(user.id);
  redirect("/");
}
