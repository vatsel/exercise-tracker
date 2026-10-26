// Form field names for the workout log, shared by the form and the action that reads it.
// Set numbers start at 1, matching exercise_set.set_number.

export const dateField = "date";
export const bodyWeightField = "bodyWeight";

export function bandField(exerciseId: number): string {
  return `band-${exerciseId}`;
}

export function noteField(exerciseId: number): string {
  return `note-${exerciseId}`;
}

export function repsField(exerciseId: number, setNumber: number): string {
  return `reps-${exerciseId}-${setNumber}`;
}

export function otherSideRepsField(exerciseId: number, setNumber: number): string {
  return `otherSideReps-${exerciseId}-${setNumber}`;
}
