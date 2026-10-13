// cn 冲突消解单测（AT-18.2.2 / WF-18）：
// 三组用例分别覆盖背景色组 / 文字色组 / 间距组——后者必须胜出（与书写意图一致）。
// 回归锚：P3 登录按钮曾因手写拼接使 bg-transparent 与 bg-primary 并存、
// 级联顺序随构建器漂移而白字白底；本组用例守住「冲突必须被消解」这一底线。
import { describe, expect, it } from "vitest";

import { cn } from "../cn";

describe("cn tailwind-merge 冲突消解", () => {
  it("背景色组：bg-primary 应胜出 bg-transparent（P3 回归锚）", () => {
    const merged = cn("bg-transparent hover:bg-[var(--muted)]", "bg-primary");
    expect(merged).toContain("bg-primary");
    expect(merged).not.toContain("bg-transparent");
  });

  it("文字色组：后写入的文字色胜出", () => {
    const merged = cn("text-slate-700", "text-[var(--primary-foreground)]");
    expect(merged).toContain("text-[var(--primary-foreground)]");
    expect(merged).not.toContain("text-slate-700");
  });

  it("间距组：后写入的 padding 胜出且不同轴互不吞并", () => {
    const merged = cn("px-3 py-2", "px-4");
    expect(merged).toContain("px-4");
    expect(merged).not.toContain("px-3");
    expect(merged).toContain("py-2");
  });

  it("假值过滤与非冲突类保留（旧契约不回归）", () => {
    const merged = cn("rounded-md", false && "hidden", null, undefined, "", [
      "font-medium",
      ["inline-flex"],
    ]);
    expect(merged).toBe("rounded-md font-medium inline-flex");
  });
});
