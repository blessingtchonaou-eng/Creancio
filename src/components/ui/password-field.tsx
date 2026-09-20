"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Field, type FieldProps } from "./field";

/** Champ mot de passe avec bouton « afficher » : on se trompe moins en tapant sur un téléphone. */
export function PasswordField(props: Omit<FieldProps, "type" | "suffix" | "prefix">) {
  const [visible, setVisible] = useState(false);
  return (
    <Field
      {...props}
      type={visible ? "text" : "password"}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      suffix={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Cacher le mot de passe" : "Afficher le mot de passe"}
          aria-pressed={visible}
          className="-mr-3 flex size-11 items-center justify-center rounded-md text-ink-muted hover:text-ink"
        >
          {visible ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
        </button>
      }
    />
  );
}
