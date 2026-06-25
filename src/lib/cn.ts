import clsx, { type ClassValue } from "clsx";

/** Concatenate Tailwind class names, dropping falsy values. */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
