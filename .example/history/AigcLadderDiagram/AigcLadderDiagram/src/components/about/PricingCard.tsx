"use client";

interface Props {
  title: string;
  price: string;
  features: string[];
}

export function PricingCard({ title, price, features }: Props) {
  return (
    <div className="border rounded-lg p-6">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-2xl font-bold my-4">{price}</p>
      <ul className="space-y-2">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}
