"use client";

import { Check, Sparkles } from "lucide-react";

interface PricingCardProps {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  href?: string;
  recommended?: boolean;
  onCtaClick?: () => void;
}

/**
 * 定价方案卡片组件
 */
export function PricingCard({
  name,
  price,
  period,
  description,
  features,
  cta,
  recommended = false,
  onCtaClick,
}: PricingCardProps) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 transition-all hover:shadow-lg ${
        recommended
          ? "border-blue-500 bg-blue-50/30 shadow-md"
          : "border-gray-200 bg-white"
      }`}
    >
      {/* 推荐标签 */}
      {recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white">
            <Sparkles className="h-3 w-3" />
            推荐
          </span>
        </div>
      )}

      {/* 方案名称 */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </div>

      {/* 价格 */}
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-gray-900">{price}</span>
          <span className="text-gray-600">/{period}</span>
        </div>
      </div>

      {/* 功能列表 */}
      <ul className="mb-6 flex-1 space-y-3">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <Check className="h-5 w-5 shrink-0 text-green-500" />
            <span className="text-sm text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA按钮 */}
      <button
        onClick={onCtaClick}
        className={`w-full rounded-lg py-2.5 text-sm font-medium transition-colors ${
          recommended
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-gray-100 text-gray-900 hover:bg-gray-200"
        }`}
      >
        {cta}
      </button>
    </div>
  );
}

interface PricingFeatureComparisonProps {
  features: { name: string; free: boolean; pro: boolean; enterprise: boolean }[];
}

/**
 * 功能对比表格组件
 */
export function PricingFeatureComparison({ features }: PricingFeatureComparisonProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-3 text-left text-sm font-medium text-gray-600">功能特性</th>
            <th className="py-3 text-center text-sm font-medium text-gray-600">免费版</th>
            <th className="py-3 text-center text-sm font-medium text-gray-600">专业版</th>
            <th className="py-3 text-center text-sm font-medium text-gray-600">企业版</th>
          </tr>
        </thead>
        <tbody>
          {features.map((feature, index) => (
            <tr key={index} className="border-b border-gray-100">
              <td className="py-3 text-sm text-gray-700">{feature.name}</td>
              <td className="py-3 text-center">
                {feature.free ? (
                  <Check className="mx-auto h-5 w-5 text-green-500" />
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="py-3 text-center">
                {feature.pro ? (
                  <Check className="mx-auto h-5 w-5 text-green-500" />
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="py-3 text-center">
                {feature.enterprise ? (
                  <Check className="mx-auto h-5 w-5 text-green-500" />
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
