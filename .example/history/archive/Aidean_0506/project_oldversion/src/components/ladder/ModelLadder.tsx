"use client";

import { useState } from "react";
import Link from "next/link";

interface Model {
  id: string;
  name: string;
  vendor: string;
}

export function ModelLadder() {
  const [models] = useState<Model[]>([
    { id: "1", name: "GPT-4", vendor: "OpenAI" },
  ]);

  return (
    <div>
      <h2>Model Ladder</h2>
      <ul>
        {models.map((model) => (
          <li key={model.id}>
            <Link href={`/models/${model.id}`}>
              {model.name} - {model.vendor}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
