"use client";

import { useActionState, useRef, useState } from "react";
import { addExercise, type AddExerciseState } from "@/app/actions";
import { CircleCheckIcon, CirclePlusIcon, CircleXIcon } from "@/components/Icons";
import { exerciseNameField, perSideField, setCountField } from "@/lib/exerciseFields";
import formStyles from "./Form.module.css";

const initialState: AddExerciseState = { message: null, added: false };

// The Add Exercise button and the new-exercise cards it opens, one per tap.
// Each card is its own form, outside the workout form, so typing in it doesn't set off a workout save.
export function AddExerciseForm() {
  const [cardIds, setCardIds] = useState<number[]>([]);
  const nextCardId = useRef(1);

  function openCard() {
    setCardIds([...cardIds, nextCardId.current]);
    nextCardId.current += 1;
  }

  // Cards close after an add finishes, by when other cards may have opened or closed.
  function closeCard(cardId: number) {
    setCardIds((openIds) => openIds.filter((openId) => openId !== cardId));
  }

  return (
    <>
      {cardIds.map((cardId) => (
        <NewExerciseCard key={cardId} onClose={() => closeCard(cardId)} />
      ))}
      <button type="button" className={formStyles.cardButton} onClick={openCard}>
        Add Exercise
        <CirclePlusIcon className={formStyles.disc} />
      </button>
    </>
  );
}

// Once added, the exercise shows up in the workout form as a card of its own, so this one closes.
function NewExerciseCard({ onClose }: { onClose: () => void }) {
  async function addAndClose(previousState: AddExerciseState, formData: FormData) {
    const result = await addExercise(previousState, formData);
    if (result.added) {
      onClose();
    }
    return result;
  }

  const [state, formAction, pending] = useActionState(addAndClose, initialState);

  return (
    <form className={formStyles.card} action={formAction}>
      <div className={formStyles.cardHeader}>
        <input
          type="text"
          name={exerciseNameField}
          placeholder="Exercise name"
          aria-label="Exercise name"
          required
          autoFocus
        />
        <div className={formStyles.discButtons}>
          <button type="submit" disabled={pending} aria-label="Add exercise">
            <CircleCheckIcon className={formStyles.disc} />
          </button>
          <button type="button" onClick={onClose} disabled={pending} aria-label="Discard new exercise">
            <CircleXIcon className={formStyles.disc} />
          </button>
        </div>
      </div>
      <label className={formStyles.inlineField}>
        Sets
        <input
          type="number"
          name={setCountField}
          className={formStyles.shortInput}
          inputMode="numeric"
          min="1"
          max="20"
          step="1"
          defaultValue={3}
          required
        />
      </label>
      <label>
        <input type="checkbox" name={perSideField} /> One side at a time
      </label>
      {state.message !== null && (
        <p role="status" className={formStyles.status}>
          {state.message}
        </p>
      )}
    </form>
  );
}
