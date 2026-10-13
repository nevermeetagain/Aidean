"use client";

import type { ReactNode } from "react";

interface ContainerProps {
  children: ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

/**
 * 统一宽度容器组件
 * 最大宽度: 1600px
 * 居中显示
 * 响应式内边距: px-4 sm:px-6 lg:px-8
 */
export function Container({ 
  children, 
  className = "",
  as: Component = "div"
}: ContainerProps) {
  return (
    <Component 
      className={`mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8 ${className}`}
    >
      {children}
    </Component>
  );
}

/**
 * 全宽容器（用于Section背景）
 */
export function FullWidthSection({ 
  children, 
  className = ""
}: Omit<ContainerProps, 'as'>) {
  return (
    <section className={`w-full ${className}`}>
      <Container>
        {children}
      </Container>
    </section>
  );
}
