"use client";

import { useActionState } from "react";
import { logIn, type ActionState } from "@/app/actions";
import { emailField, passwordField } from "@/lib/loginFields";
import formStyles from "./Form.module.css";
import pageStyles from "./Page.module.css";

const initialState: ActionState = { message: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(logIn, initialState);

  return (
    <form className={pageStyles.page} action={formAction}>
      <h1>Log in</h1>
      <label className={formStyles.field}>
        Email
        <input type="email" name={emailField} autoComplete="username" required />
      </label>
      <label className={formStyles.field}>
        Password
        <input type="password" name={passwordField} autoComplete="current-password" required />
      </label>
      <button type="submit" className={`${formStyles.cardButton} ${formStyles.accent}`} disabled={pending}>
        Log in
      </button>
      {state.message !== null && <p role="alert" className={formStyles.status}>{state.message}</p>}
    </form>
  );
}
