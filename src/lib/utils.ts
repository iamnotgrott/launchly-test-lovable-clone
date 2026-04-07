import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString([], { month: "short", day: "numeric" });
}

export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "..." : str;
}
