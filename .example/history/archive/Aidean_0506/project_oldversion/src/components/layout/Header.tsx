"use client";

import Link from "next/link";

export function Header() {
  return (
    <header className="border-b bg-white">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold">
          Aidean
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/models" className="text-sm text-gray-600 hover:text-gray-900">
            模型
          </Link>
        </nav>
      </div>
    </header>
  );
}
