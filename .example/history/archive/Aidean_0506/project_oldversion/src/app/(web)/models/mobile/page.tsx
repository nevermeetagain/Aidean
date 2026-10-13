"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ModelLadderV5 } from "@/components/ladder/ModelLadderV5";

function MobileContent() {
  const searchParams = useSearchParams();
  const keyword = searchParams.get("q") || undefined;

  return <ModelLadderV5 kind="mobile" keyword={keyword} />;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center">加载中...</div>}>
      <MobileContent />
    </Suspense>
  );
}

