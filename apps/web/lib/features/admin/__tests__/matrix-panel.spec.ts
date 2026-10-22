/**
 * B11-03b · E2：MatrixPanel 共用外壳（node 环境 + renderToStaticMarkup，无 testing-library）。
 *
 * 锁定外壳的三件职责：
 * ① 表格与按钮全部走 @aidean/ui（源文件无原生 JSX 标签字面量，渲染出的唯一表格来自 Table 组件）；
 * ② 分页条文案「第 x/共 y 页」+ 首/末页禁用 + 页大小固定 50；
 * ③ 列头来自入参 columns（矩阵维度由调用方给，外壳不内置维度）。
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  MATRIX_PAGE_SIZE,
  MatrixPanel,
  type MatrixPanelProps,
} from "../../../../components/admin/MatrixPanel";

interface Row {
  id: string;
  name: string;
  openai: boolean;
  anthropic: boolean;
}

const ROWS: Row[] = [
  { id: "r1", name: "vendor:alpha", openai: true, anthropic: false },
  { id: "r2", name: "vendor:beta", openai: false, anthropic: true },
];

const COLUMNS = [
  { key: "entity", label: "实体" },
  { key: "OPENAI", label: "OPENAI" },
  { key: "ANTHROPIC", label: "ANTHROPIC" },
];

const SRC = join(__dirname, "../../../../components/admin/MatrixPanel.tsx");

const render = (over: Partial<MatrixPanelProps<Row>> = {}) => {
  const props: MatrixPanelProps<Row> = {
    testId: "admin-demo",
    columns: COLUMNS,
    rows: ROWS,
    rowKey: (r) => r.id,
    renderCell: (r, key) => (key === "entity" ? r.name : key === "OPENAI" ? String(r.openai) : String(r.anthropic)),
    page: 1,
    total: 120,
    onPageChange: () => {},
    ...over,
  };
  // MatrixPanel 为无 hook 纯展示件：直接函数调用取元素（对齐 lib/admin/__tests__/panel-state.spec.ts 的写法，
  // 规避 createElement 对泛型组件推断为 unknown 的重载限制）
  return renderToStaticMarkup(MatrixPanel<Row>(props));
};

/** 取某个 testid 所在标签片段，判断禁用态（SSR 输出 disabled=""；注意 class 里有 disabled: 前缀类，不能只查 "disabled"） */
const tagOf = (html: string, testid: string) => html.match(new RegExp(`<button[^>]*"${testid}"[^>]*>`))?.[0] ?? "";
const isDisabled = (html: string, testid: string) => tagOf(html, testid).includes('disabled=""');

describe("MatrixPanel 外壳", () => {
  it("源文件无原生表格/按钮等 JSX 字面量，表格来自 @aidean/ui Table*", () => {
    const src = readFileSync(SRC, "utf-8");
    expect(src).toMatch(/from "@aidean\/ui"/);
    expect(src).not.toMatch(/<(table|thead|tbody|tr|th|td|button)[\s>]/);
    const html = render();
    expect(html.match(/<table[\s>]/g) ?? []).toHaveLength(1);
    expect(html).toContain("caption-bottom");
  });

  it("页大小固定 50，分页文案为「第 x/共 y 页」并带 testid 三点", () => {
    expect(MATRIX_PAGE_SIZE).toBe(50);
    const html = render({ page: 2, total: 120 });
    expect(html).toContain('data-testid="admin-demo-pagination"');
    expect(html).toContain("第 2/共 3 页");
    expect(html).toContain("120 条");
  });

  it("首页禁用上一页、末页禁用下一页；total=0 仍为 1 页", () => {
    const p1 = render({ page: 1 });
    expect(tagOf(p1, "admin-demo-prev")).not.toBe("");
    expect(isDisabled(p1, "admin-demo-prev")).toBe(true);
    expect(isDisabled(p1, "admin-demo-next")).toBe(false);
    expect(isDisabled(render({ page: 3 }), "admin-demo-next")).toBe(true);
    const pEmpty = render({ page: 1, total: 0 });
    expect(pEmpty).toContain("第 1/共 1 页");
    expect(isDisabled(pEmpty, "admin-demo-next")).toBe(true);
    expect(isDisabled(render({ page: 2, busy: true }), "admin-demo-next")).toBe(true);
  });

  it("列头来自传入 columns；行 data-testid 与单元格内容来自 rowKey/renderCell", () => {
    const html = render();
    expect(html).toContain(">实体</th>");
    expect(html).toContain(">OPENAI</th>");
    expect(html).toContain(">ANTHROPIC</th>");
    expect(html).toContain('data-testid="admin-demo-row-r1"');
    expect(html).toContain("vendor:alpha");
    expect(html).toContain(">true</td>");

    const swapped = render({
      columns: [
        { key: "entity", label: "Model ID" },
        { key: "vision", label: "vision" },
      ],
    });
    expect(swapped).toContain(">vision</th>");
    expect(swapped).not.toContain("ANTHROPIC");
  });

  it("rows 为空（越界页）时保留表头并渲染占位行", () => {
    const html = render({ rows: [] });
    expect(html).toContain(">OPENAI</th>");
    expect(html).toContain("当前页无数据");
  });

  it("filters / toolbar slot 有则渲染筛选栏 testid，无则不产出空工具条", () => {
    expect(render()).not.toContain('data-testid="admin-demo-filters"');
    const withSlots = render({ filters: createElement("span", { "data-testid": "f" }, "筛选"), toolbar: createElement("span", { "data-testid": "t" }, "新建") });
    expect(withSlots).toContain('data-testid="admin-demo-filters"');
    expect(withSlots).toContain('data-testid="f"');
    expect(withSlots).toContain('data-testid="t"');
  });
});
