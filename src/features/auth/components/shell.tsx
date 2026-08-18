import type { ReactNode } from "react";

import { Link } from "@tanstack/react-router";
import { cn } from "src/lib/utils";

import { Input } from "#client/components/ui/input";
import { Label } from "#client/components/ui/label";

export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background flex min-h-screen flex-col justify-center px-6 py-12">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link
          to="/"
          className="text-primary mx-auto block text-center text-2xl font-bold tracking-tight"
        >
          LocaLoco
        </Link>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">{children}</div>
    </div>
  );
}

export function AuthCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "bg-card text-card-foreground border-border mx-auto max-w-md rounded-xl border p-8 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function FormErrorAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="border-destructive/30 bg-destructive/10 text-destructive mb-6 rounded-lg border p-3.5 text-sm font-medium"
    >
      {message}
    </div>
  );
}

interface FormFieldProps {
  id: string;
  label: string;
  type?: "text" | "email" | "password" | "url";
  autoComplete?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  value: string;
  onBlur: () => void;
  onChange: (value: string) => void;
}

export function FormField({
  id,
  label,
  type = "text",
  autoComplete,
  placeholder,
  disabled,
  required = true,
  error,
  value,
  onBlur,
  onChange,
}: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onBlur={onBlur}
        onChange={e => {
          onChange(e.target.value);
        }}
        disabled={disabled}
      />
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
