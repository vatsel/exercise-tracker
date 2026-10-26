"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { retireExercise, saveWorkout, type SaveState } from "@/app/actions";
import { AddExerciseForm } from "@/components/AddExerciseForm";
import { CopyIcon } from "@/components/Icons";
import type { ExerciseLog, LoggedSet, WorkoutLog } from "@/lib/workouts";
import {
  approximateField,
  bandField,
  bodyWeightField,
  dateField,
  noteField,
  otherSideRepsField,
  repsField,
} from "@/lib/workoutFields";
import formStyles from "./Form.module.css";
import styles from "./WorkoutForm.module.css";

type WorkoutFormProps = {
  date: string;
  savedLog: WorkoutLog | null;
  previous: WorkoutLog;
};

const initialState: SaveState = { message: null, saved: false };

// How long typing has to pause before the form saves, or opens a date typed into the picker.
const typingPauseMs = 800;

export function WorkoutForm(props: WorkoutFormProps) {
  const router = useRouter();
  const [formNumber, setFormNumber] = useState(1);

  // A new key starts a blank form, which clears the last save's status too, even when today is already open.
  function startNewWorkout() {
    setFormNumber(formNumber + 1);
    router.push("/");
  }

  return <WorkoutLogForm key={formNumber} {...props} onNewWorkout={startNewWorkout} />;
}

type WorkoutLogFormProps = WorkoutFormProps & {
  onNewWorkout: () => void;
};

function WorkoutLogForm({ date, savedLog, previous, onNewWorkout }: WorkoutLogFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(saveWorkout, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A saved log picks up where it left off; a new log starts from the previous one.
  const startingLog = savedLog ?? previous;
  const startingBodyWeight = savedLog?.bodyWeight ?? "";

  // Sending the form through the action directly, rather than as the form's action, keeps what was entered.
  function saveNow() {
    if (saveTimer.current !== null) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (formRef.current === null) {
      return;
    }
    const formData = new FormData(formRef.current);
    startTransition(() => formAction(formData));
  }

  function scheduleSave() {
    if (saveTimer.current !== null) {
      clearTimeout(saveTimer.current);
    }
    saveTimer.current = setTimeout(saveNow, typingPauseMs);
  }

  function saveIfWaiting() {
    if (saveTimer.current !== null) {
      saveNow();
    }
  }

  // The picker only chooses which date's log to open, so its change must not set off a save of this one.
  // Typing a date makes a valid date after every digit (0002-01-01, 0020-01-01, …), so only the one
  // the typing settles on is opened.
  function openDate(event: ChangeEvent<HTMLInputElement>) {
    event.stopPropagation();
    if (dateTimer.current !== null) {
      clearTimeout(dateTimer.current);
      dateTimer.current = null;
    }
    const pickedDate = event.target.value;
    if (pickedDate === "") {
      return;
    }
    dateTimer.current = setTimeout(() => {
      saveIfWaiting();
      router.push(`/?date=${pickedDate}`);
    }, typingPauseMs);
  }

  // Phones can discard a hidden tab, so an edit still waiting for its save goes out right away.
  useEffect(() => {
    function saveIfHidden() {
      if (document.visibilityState === "hidden") {
        saveIfWaiting();
      }
    }
    document.addEventListener("visibilitychange", saveIfHidden);
    return () => document.removeEventListener("visibilitychange", saveIfHidden);
  });

  let status = state.message;
  if (pending) {
    status = "Saving…";
  }

  return (
    <>
      <form ref={formRef} className={formStyles.form} onChange={scheduleSave}>
        <h1>Log for {date}</h1>
        <label className={formStyles.field}>
          Date
          <input type="date" defaultValue={date} required onChange={openDate} />
        </label>
        {/* Saves go to the date this form was opened for, never to one the picker is still moving to. */}
        <input type="hidden" name={dateField} value={date} />
        {savedLog === null && previous.date !== null && <p>Filled in from {previous.date}.</p>}
        {savedLog !== null && <p>Editing the log already saved for this date.</p>}
        <p>Changes save as you type.</p>

        <label className={formStyles.field}>
          Body weight (kg)
          <input
            type="number"
            name={bodyWeightField}
            inputMode="decimal"
            step="0.1"
            min="0"
            defaultValue={startingBodyWeight}
          />
        </label>

        {startingLog.exercises.map((exercise, index) => (
          <ExerciseFields
            key={exercise.id}
            exercise={exercise}
            // A new log starts with empty notes and offers last time's to copy instead.
            startingNote={savedLog === null ? "" : (exercise.note ?? "")}
            previousNote={previous.exercises[index].note}
            onNoteCopied={scheduleSave}
          />
        ))}

        {status !== null && <p role="status">{status}</p>}
        {state.saved && (
          <button type="button" onClick={onNewWorkout}>
            New workout
          </button>
        )}
      </form>
      <AddExerciseForm />
    </>
  );
}

type ExerciseFieldsProps = {
  exercise: ExerciseLog;
  startingNote: string;
  previousNote: string | null;
  onNoteCopied: () => void;
};

function ExerciseFields({ exercise, startingNote, previousNote, onNoteCopied }: ExerciseFieldsProps) {
  // Show the routine's sets, or more if the last session logged extra.
  const rowCount = Math.max(exercise.setCount, exercise.sets.length);
  const setNumbers = Array.from({ length: rowCount }, (_, index) => index + 1);

  return (
    <fieldset className={styles.exercise}>
      <legend>{exercise.name}</legend>
      <RetireButton exerciseId={exercise.id} exerciseName={exercise.name} />

      <label className={formStyles.field}>
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

      <NoteField
        exerciseId={exercise.id}
        startingNote={startingNote}
        previousNote={previousNote}
        onNoteCopied={onNoteCopied}
      />
    </fieldset>
  );
}

function RetireButton({ exerciseId, exerciseName }: { exerciseId: number; exerciseName: string }) {
  const [pending, setPending] = useState(false);

  function retire() {
    const confirmed = window.confirm(`Delete ${exerciseName} from the routine? Past logs keep its sets.`);
    if (!confirmed) {
      return;
    }
    setPending(true);
    startTransition(() => retireExercise(exerciseId));
  }

  return (
    <button type="button" onClick={retire} disabled={pending}>
      Delete exercise
    </button>
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
      <label className={`${formStyles.field} ${styles.setField}`}>
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
        <label className={`${formStyles.field} ${styles.setField}`}>
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

type NoteFieldProps = {
  exerciseId: number;
  startingNote: string;
  previousNote: string | null;
  onNoteCopied: () => void;
};

function NoteField({ exerciseId, startingNote, previousNote, onNoteCopied }: NoteFieldProps) {
  const [note, setNote] = useState(startingNote);

  // Setting the note from code fires no change event, so the copy asks for a save itself.
  function copyPreviousNote(text: string) {
    setNote(text);
    onNoteCopied();
  }

  return (
    <div className={formStyles.field}>
      <label className={formStyles.field}>
        Notes
        <textarea name={noteField(exerciseId)} value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      {previousNote !== null && (
        <p>
          Last time: {previousNote}{" "}
          <button type="button" onClick={() => copyPreviousNote(previousNote)}>
            <CopyIcon width={16} height={16} /> Copy
          </button>
        </p>
      )}
    </div>
  );
}
