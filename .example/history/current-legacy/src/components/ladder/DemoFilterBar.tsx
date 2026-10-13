"use client";

export function DemoFilterBar() {
  return (
    <div className="flex items-center gap-4 p-4 border-b">
      <input
        type="text"
        placeholder="Search models..."
        className="px-4 py-2 border rounded"
      />
      <button className="px-4 py-2 bg-blue-600 text-white rounded">
        Search
      </button>
    </div>
  );
}
