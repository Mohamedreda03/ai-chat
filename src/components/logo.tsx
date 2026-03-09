import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      <path
        d="M21 12A9 9 0 0 1 12 21c-1.6 0-3.1-.4-4.5-1.2L3 21l1.2-4.5A9 9 0 1 1 21 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 7c0 2.761 2.239 5 5 5-2.761 0-5 2.239-5 5V7Z"
        fill="currentColor"
      />
      <path
        d="M12 7c0 2.761-2.239 5-5 5 2.761 0 5 2.239 5 5V7Z"
        fill="currentColor"
      />
    </svg>
  );
}
