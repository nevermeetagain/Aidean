import { ReactNode } from "react";

export interface ToolGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function ToolGrid({ children, columns = 4, className = "" }: ToolGridProps) {
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-5 ${className}`}>
      {children}
    </div>
  );
}
