import { SearchX } from "lucide-react";
import { ButtonLink, EmptyState } from "../components/ui";

export function NotFoundPage() {
  return (
    <div className="container-page py-20">
      <div className="mx-auto max-w-lg">
        <EmptyState
          icon={SearchX}
          title="Page not found"
          description="The page you are looking for does not exist or has moved."
          action={<ButtonLink to="/">Back to home</ButtonLink>}
        />
      </div>
    </div>
  );
}
