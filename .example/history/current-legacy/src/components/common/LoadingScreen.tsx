"use client";

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-6">
        <div className="animate-pulse">
          <img 
            src="/images/icons/logo.svg" 
            alt="Aidean" 
            className="h-20 w-20"
          />
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">Aidean</div>
          <div className="mt-2 text-sm text-gray-600">加载中...</div>
        </div>
        <div className="flex gap-2">
          <div className="h-2 w-2 animate-bounce rounded-full bg-blue-600" style={{ animationDelay: "0ms" }}></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-blue-600" style={{ animationDelay: "150ms" }}></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-blue-600" style={{ animationDelay: "300ms" }}></div>
        </div>
      </div>
    </div>
  );
}