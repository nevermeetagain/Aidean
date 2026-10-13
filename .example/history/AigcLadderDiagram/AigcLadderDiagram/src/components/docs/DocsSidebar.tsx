"use client";

import Link from "next/link";

const items = [
  { label: "Getting Started", href: "/docs" },
  { label: "API Reference", href: "/docs/api" },
  { label: "Help", href: "/docs/help" },
];

export function DocsSidebar() {
  return (
    <aside className="w-64 p-4 border-r">
      <nav className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block px-3 py-2 rounded hover:bg-gray-100"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
