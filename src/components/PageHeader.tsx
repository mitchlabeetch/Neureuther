import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Path the back button navigates to. Defaults to Home. */
  backTo?: string;
  backLabel?: string;
  /** Optional leading icon block (already styled by the caller). */
  icon?: ReactNode;
  /** Optional right-aligned slot, e.g. a progress badge or action button. */
  right?: ReactNode;
}

/**
 * Shared page header with a consistent back button, title, and optional
 * icon/subtitle/right-slot. Standardizes back behavior across pages so no
 * screen dead-ends and the layout stays predictable.
 */
export function PageHeader({
  title,
  subtitle,
  backTo = "/",
  backLabel = "Home",
  icon,
  right,
}: PageHeaderProps) {
  const navigate = useNavigate();
  return (
    <div className="px-5 pt-14 pb-4 animate-fade-in-up">
      <button
        type="button"
        onClick={() => navigate(backTo)}
        className="flex items-center gap-1 text-muted-ink text-sm font-medium mb-3 hover:text-ink transition-colors"
      >
        <ArrowLeft size={18} /> {backLabel}
      </button>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {icon}
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold text-[#171e19] tracking-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-muted-ink font-medium">{subtitle}</p>
            )}
          </div>
        </div>
        {right}
      </div>
    </div>
  );
}
