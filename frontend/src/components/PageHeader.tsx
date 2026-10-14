import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  badge?: ReactNode;
  action?: ReactNode;
}

/** Consistent page-level header with optional badge and action slot */
export function PageHeader({ title, description, badge, action }: Props) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight text-paper">
            {title}
          </h1>
          {badge ?? null}
        </div>
        {description ? (
          <p className="mt-1 text-sm text-sub leading-relaxed max-w-2xl">
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <div className="shrink-0 pt-0.5">{action}</div>
      ) : null}
    </div>
  );
}
