"use client";

import Link from "next/link";

export function DemoHeaderV4() {
  return (
    <header className="border-b bg-white">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold">
          Demo4
        </Link>
      </div>
    </header>
  );
}
