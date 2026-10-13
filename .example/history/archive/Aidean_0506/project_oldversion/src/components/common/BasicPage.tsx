"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface BasicPageProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  children?: React.ReactNode;
}

export function BasicPage({
  title,
  description,
  backHref,
  backLabel = "返回",
  children,
}: BasicPageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8 py-8">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>
          {description && (
            <p className="text-gray-600 text-lg">{description}</p>
          )}
          {children && <div className="mt-8">{children}</div>}
        </div>
      </div>
    </div>
  );
}

