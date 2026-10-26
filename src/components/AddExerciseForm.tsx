"use client";

import { useActionState } from "react";
import { addExercise, type ActionState } from "@/app/actions";
import { exerciseNameField, perSideField, setCountField } from "@/lib/exerciseFields";
import formStyles from "./Form.module.css";

const initialState: ActionState = { message: null };

// Kept outside the workout form so typing here doesn't set off a workout save.
export function AddExerciseForm() {
  const [state, formAction, pending] = useActionState(addExercise, initialState);

  return (
    <form className={formStyles.form} action={formAction}>
      <h2>Add an exercise</h2>
      <label className={formStyles.field}>
        Name
        <input type="text" name={exerciseNameField} required />
      </label>
      <label className={formStyles.field}>
        Sets
        <input
          type="number"
          name={setCountField}
          inputMode="numeric"
          min="1"
          max="20"
          step="1"
          defaultValue={3}
          required
        />
      </label>
      <label>
        <input type="checkbox" name={perSideField} />
        One side at a time
      </label>
      <button type="submit" disabled={pending}>
        Add exercise
      </button>
      {state.message !== null && <p role="status">{state.message}</p>}
    </form>
  );
}
