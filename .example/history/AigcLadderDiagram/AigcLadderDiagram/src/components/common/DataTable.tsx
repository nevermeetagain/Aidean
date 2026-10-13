"use client";

interface Column {
  key: string;
  label: string;
}

interface Props {
  columns: Column[];
  data: Record<string, unknown>[];
}

export function DataTable({ columns, data }: Props) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b">
          {columns.map((col) => (
            <th key={col.key} className="px-4 py-2 text-left">
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i} className="border-b hover:bg-gray-50">
            {columns.map((col) => (
              <td key={col.key} className="px-4 py-2">
                {String(row[col.key] ?? "")}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
