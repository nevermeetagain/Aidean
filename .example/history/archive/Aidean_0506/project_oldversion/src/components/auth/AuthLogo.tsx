import Link from "next/link";

export function AuthLogo() {
  return (
    <Link href="/" className="flex flex-col items-center gap-4">
      <img 
        src="/images/icons/logo.svg" 
        alt="Aidean" 
        className="h-16 w-16"
      />
      <div className="text-center">
        <div className="text-2xl font-bold text-gray-900">Aidean</div>
        <div className="mt-1 text-sm text-gray-600">AI模型天梯图平台</div>
      </div>
    </Link>
  );
}