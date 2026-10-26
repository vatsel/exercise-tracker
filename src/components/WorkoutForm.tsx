"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { retireExercise, saveWorkout, type SaveState } from "@/app/actions";
import { AddExerciseForm } from "@/components/AddExerciseForm";
import { CircleCheckIcon, CirclePlusIcon, CircleXIcon, CopyIcon } from "@/components/Icons";
import type { ExerciseLog, LoggedSet, WorkoutLog } from "@/lib/workouts";
import {
  bandField,
  bodyWeightField,
  dateField,
  noteField,
  otherSideRepsField,
  repsField,
} from "@/lib/workoutFields";
import formStyles from "./Form.module.css";
import pageStyles from "./Page.module.css";
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
  // The Save button sits below the add-exercise form, outside this one, so it names this form by id.
  const formId = useId();
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

  function saveOnSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveNow();
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
    <div className={pageStyles.page}>
      <form id={formId} ref={formRef} className={formStyles.flow} onChange={scheduleSave} onSubmit={saveOnSubmit}>
        <h1>Log Workout</h1>
        <div className={formStyles.card}>
          <label className={formStyles.inlineField}>
            Date
            <input type="date" className={styles.dateInput} defaultValue={date} required onChange={openDate} />
          </label>
          <label className={formStyles.inlineField}>
            Weight (kg)
            <input
              type="number"
              name={bodyWeightField}
              className={formStyles.shortInput}
              inputMode="decimal"
              step="0.1"
              min="0"
              defaultValue={startingBodyWeight}
            />
          </label>
        </div>
        {/* Saves go to the date this form was opened for, never to one the picker is still moving to. */}
        <input type="hidden" name={dateField} value={date} />
        {savedLog === null && previous.date !== null && (
          <p className={formStyles.status}>Filled in from {previous.date}.</p>
        )}
        {savedLog !== null && <p className={formStyles.status}>Editing the log already saved for this date.</p>}

        <h2>Sets</h2>
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
      </form>

      <AddExerciseForm />

      <button type="submit" form={formId} className={`${formStyles.cardButton} ${formStyles.accent}`}>
        Save
        <CircleCheckIcon className={formStyles.disc} />
      </button>
      {status !== null && (
        <p role="status" className={formStyles.status}>
          {status}
        </p>
      )}
      {state.saved && (
        <button type="button" className={formStyles.cardButton} onClick={onNewWorkout}>
          New workout
          <CirclePlusIcon className={formStyles.disc} />
        </button>
      )}
    </div>
  );
}

type ExerciseFieldsProps = {
  exercise: ExerciseLog;
  startingNote: string;
  previousNote: string | null;
  onNoteCopied: () => void;
};

function ExerciseFields({ exercise, startingNote, previousNote, onNoteCopied }: ExerciseFieldsProps) {
  const headingId = useId();

  // Show the routine's sets, or more if the last session logged extra.
  const rowCount = Math.max(exercise.setCount, exercise.sets.length);
  const setNumbers = Array.from({ length: rowCount }, (_, index) => index + 1);

  // Every set fits on one row, unless each has a left and a right side to log.
  let setRows = [setNumbers];
  if (exercise.perSide) {
    setRows = setNumbers.map((setNumber) => [setNumber]);
  }

  return (
    <fieldset className={formStyles.card} aria-labelledby={headingId}>
      <ExerciseHeader exerciseId={exercise.id} exerciseName={exercise.name} headingId={headingId} />

      <label className={formStyles.field}>
        Band
        <input type="text" name={bandField(exercise.id)} defaultValue={exercise.band ?? ""} />
      </label>

      <div className={styles.sets}>
        {setRows.map((setRow) => (
          <div key={setRow[0]} className={styles.setRow}>
            {setRow.map((setNumber) => (
              <SetFields
                key={setNumber}
                exerciseId={exercise.id}
                perSide={exercise.perSide}
                setNumber={setNumber}
                previousSet={exercise.sets[setNumber - 1]}
              />
            ))}
          </div>
        ))}
      </div>

      <NoteField
        exerciseId={exercise.id}
        startingNote={startingNote}
        previousNote={previousNote}
        onNoteCopied={onNoteCopied}
      />
    </fieldset>
  );
}

type ExerciseHeaderProps = {
  exerciseId: number;
  exerciseName: string;
  headingId: string;
};

// The exercise's name and a delete button, which asks for a confirmation in the header itself.
function ExerciseHeader({ exerciseId, exerciseName, headingId }: ExerciseHeaderProps) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  // Past logs keep the exercise's sets.
  function retire() {
    setPending(true);
    startTransition(() => retireExercise(exerciseId));
  }

  if (!confirming) {
    return (
      <div className={formStyles.cardHeader}>
        <h3 id={headingId}>{exerciseName}</h3>
        <button type="button" onClick={() => setConfirming(true)} aria-label={`Delete ${exerciseName}`}>
          <CircleXIcon className={formStyles.disc} />
        </button>
      </div>
    );
  }
  return (
    <div className={formStyles.cardHeader}>
      <h3 id={headingId}>Confirm Deletion</h3>
      <div className={formStyles.discButtons}>
        <button type="button" onClick={retire} disabled={pending} aria-label={`Delete ${exerciseName}`}>
          <CircleCheckIcon className={formStyles.disc} />
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          aria-label={`Keep ${exerciseName}`}
        >
          <CircleXIcon className={formStyles.disc} />
        </button>
      </div>
    </div>
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

  if (!perSide) {
    return <RepsField label={`Set ${setNumber}`} name={repsField(exerciseId, setNumber)} defaultValue={reps} />;
  }
  return (
    <>
      <RepsField label={`Set ${setNumber} L`} name={repsField(exerciseId, setNumber)} defaultValue={reps} />
      <RepsField
        label={`Set ${setNumber} R`}
        name={otherSideRepsField(exerciseId, setNumber)}
        defaultValue={otherSideReps}
      />
    </>
  );
}

type RepsFieldProps = {
  label: string;
  name: string;
  defaultValue: number | "";
};

function RepsField({ label, name, defaultValue }: RepsFieldProps) {
  return (
    <label className={styles.setField}>
      {label}
      <input type="number" name={name} inputMode="decimal" step="0.1" min="0" defaultValue={defaultValue} />
    </label>
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
        <p className={styles.previousNote}>
          Last time: {previousNote}{" "}
          <button type="button" className={styles.copyButton} onClick={() => copyPreviousNote(previousNote)}>
            <CopyIcon width={16} height={16} /> Copy
          </button>
        </p>
      )}
    </div>
  );
}
