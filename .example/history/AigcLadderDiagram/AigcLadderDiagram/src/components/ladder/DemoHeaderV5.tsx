"use client";

import Link from "next/link";

interface Props {
  showViewToggle?: boolean;
}

export function DemoHeaderV5({ showViewToggle = false }: Props) {
  return (
    <header className="border-b bg-white">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold">
          Demo5
        </Link>
        {showViewToggle && (
          <div className="flex gap-2">
            <button className="px-3 py-1 text-sm border rounded">横排</button>
            <button className="px-3 py-1 text-sm border rounded">竖排</button>
          </div>
        )}
      </div>
    </header>
  );
}
