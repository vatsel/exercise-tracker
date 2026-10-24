"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { saveWorkout, type SaveState } from "@/app/actions";
import { CopyIcon } from "@/components/Icons";
import type { LoggedSet, PreviousExercise, PreviousSession } from "@/lib/workouts";
import {
  approximateField,
  bandField,
  bodyWeightField,
  dateField,
  noteField,
  otherSideRepsField,
  repsField,
} from "@/lib/workoutFields";
import styles from "./WorkoutForm.module.css";

type WorkoutFormProps = {
  date: string;
  alreadyLogged: boolean;
  previous: PreviousSession;
};

const initialState: SaveState = { message: null };

export function WorkoutForm({ date, alreadyLogged, previous }: WorkoutFormProps) {
  const [state, formAction, pending] = useActionState(saveWorkout, initialState);

  // Submitting through a plain form action resets every field afterwards; this keeps what was entered.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h1>Log for {date}</h1>
      <input type="hidden" name={dateField} value={date} />
      {previous.date !== null && <p>Filled in from {previous.date}.</p>}
      {alreadyLogged && <p>This date already has a log. Saving replaces it.</p>}

      <label className={styles.field}>
        Body weight (kg)
        <input type="number" name={bodyWeightField} inputMode="decimal" step="0.1" min="0" />
      </label>

      {previous.exercises.map((exercise) => (
        <ExerciseFields key={exercise.id} exercise={exercise} />
      ))}

      <button type="submit" disabled={pending}>
        Save
      </button>
      {state.message !== null && <p role="status">{state.message}</p>}
    </form>
  );
}

function ExerciseFields({ exercise }: { exercise: PreviousExercise }) {
  // Show the routine's sets, or more if the last session logged extra.
  const rowCount = Math.max(exercise.setCount, exercise.sets.length);
  const setNumbers = Array.from({ length: rowCount }, (_, index) => index + 1);

  return (
    <fieldset className={styles.exercise}>
      <legend>{exercise.name}</legend>

      <label className={styles.field}>
        Band
        <input type="text" name={bandField(exercise.id)} defaultValue={exercise.band ?? ""} />
      </label>

      {setNumbers.map((setNumber) => (
        <SetFields
          key={setNumber}
          exerciseId={exercise.id}
          perSide={exercise.perSide}
          setNumber={setNumber}
          previousSet={exercise.sets[setNumber - 1]}
        />
      ))}

      <NoteField exerciseId={exercise.id} previousNote={exercise.note} />
    </fieldset>
  );
}

type SetFieldsProps = {
  exerciseId: number;
  perSide: boolean;
  setNumber: number;
  previousSet: LoggedSet | undefined;
};

function SetFields({ exerciseId, perSide, setNumber, previousSet }: SetFieldsProps) {
  const reps = previousSet?.reps ?? "";
  const otherSideReps = previousSet?.otherSideReps ?? "";
  const approximate = previousSet?.approximate ?? false;

  return (
    <div className={styles.set}>
      <span>Set {setNumber}</span>
      <label className={styles.field}>
        Reps
        <input
          type="number"
          name={repsField(exerciseId, setNumber)}
          inputMode="decimal"
          step="0.1"
          min="0"
          defaultValue={reps}
        />
      </label>
      {perSide && (
        <label className={styles.field}>
          Other side
          <input
            type="number"
            name={otherSideRepsField(exerciseId, setNumber)}
            inputMode="decimal"
            step="0.1"
            min="0"
            defaultValue={otherSideReps}
          />
        </label>
      )}
      <label>
        <input type="checkbox" name={approximateField(exerciseId, setNumber)} defaultChecked={approximate} />
        Approx.
      </label>
    </div>
  );
}

function NoteField({ exerciseId, previousNote }: { exerciseId: number; previousNote: string | null }) {
  const [note, setNote] = useState("");

  return (
    <div className={styles.field}>
      <label className={styles.field}>
        Notes
        <textarea name={noteField(exerciseId)} value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      {previousNote !== null && (
        <p>
          Last time: {previousNote}{" "}
          <button type="button" onClick={() => setNote(previousNote)}>
            <CopyIcon width={16} height={16} /> Copy
          </button>
        </p>
      )}
    </div>
  );
}
