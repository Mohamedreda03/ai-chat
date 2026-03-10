import { Loader2Icon } from "lucide-react";

export default function ChatLoading() {
  return (
    <div className="flex h-full items-center justify-center bg-background">
      <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}
