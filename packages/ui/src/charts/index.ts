// @aidean/ui/charts - 图表组件独立子路径
// 将 EChartWrapper 从主 barrel 拆出，避免 echarts (~900KB) 污染所有只用到 Button/Badge 的页面 bundle。
// 使用方式：import { EChartWrapper } from "@aidean/ui/charts"
export { EChartWrapper, type EChartWrapperProps, type ECInstanceLike } from "./EChartWrapper";
