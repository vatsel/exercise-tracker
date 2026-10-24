-- One row per exercise in the routine.
create table exercise (
  id integer generated always as identity primary key,
  name text not null unique,
  -- Unilateral exercises are done once on each side, so each set records reps for both sides.
  per_side boolean not null default false,
  -- How many sets the routine calls for; a workout can record fewer.
  set_count integer not null check (set_count > 0),
  -- Order the exercise appears in a workout.
  position integer not null unique
);

-- One row per workout date.
create table workout (
  id integer generated always as identity primary key,
  date date not null unique,
  body_weight_kg numeric(5, 1)
);

-- One exercise as done in one workout: the band used and that day's note.
-- A row with no sets means the exercise was planned but skipped.
create table workout_exercise (
  id integer generated always as identity primary key,
  workout_id integer not null references workout (id) on delete cascade,
  exercise_id integer not null references exercise (id),
  band text,
  note text,
  unique (workout_id, exercise_id)
);

create table exercise_set (
  id integer generated always as identity primary key,
  workout_exercise_id integer not null references workout_exercise (id) on delete cascade,
  set_number integer not null check (set_number > 0),
  reps numeric(4, 1) not null check (reps >= 0),
  -- Only filled for per_side exercises.
  other_side_reps numeric(4, 1) check (other_side_reps >= 0),
  -- The rep count is a rough figure (shown as ~9), not an exact one.
  reps_approximate boolean not null default false,
  unique (workout_exercise_id, set_number)
);
