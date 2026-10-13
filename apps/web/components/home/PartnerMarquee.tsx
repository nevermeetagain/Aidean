"use client";

// 合作伙伴 logo 墙：两行灰度企业名反向无缝循环滚动，hover 暂停。
// 动画 keyframes（marquee-left / marquee-right）定义于 app/globals.css。
// S8 CMS 化：名单由首页 RSC 从 partners.marquee 配置读入后以 props 下传（缺省回退 shared 默认名单）。
import { useMemo } from "react";
import { MARQUEE_NAMES_DEFAULT } from "@aidean/shared";

function MarqueeRow({ names, reverse = false }: { names: readonly string[]; reverse?: boolean }) {
  // 列表整体复制一份，配合 translateX(-50%) 实现无缝循环
  const sets = useMemo(() => [names, names], [names]);

  return (
    <div className="marquee-row overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div className={`marquee-track flex w-max${reverse ? " marquee-track--reverse" : ""}`}>
        {sets.map((set, setIndex) => (
          <ul
            key={setIndex}
            aria-hidden={setIndex === 1}
            className="flex shrink-0 items-center"
          >
            {set.map((name) => (
              <li key={`${setIndex}-${name}`} className="px-10">
                <span
                  role="img"
                  aria-label={`${name} 标识`}
                  className="inline-block cursor-default select-none whitespace-nowrap text-xl font-semibold tracking-wide text-slate-400 transition-colors duration-300 hover:text-primary md:text-2xl"
                >
                  {name}
                </span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

export function PartnerMarquee({ names = MARQUEE_NAMES_DEFAULT }: { names?: readonly string[] }) {
  // 名单按半切分：前半第一行（正向），后半第二行（反向）；奇数时第一行多一。
  const half = Math.ceil(names.length / 2);
  const rowOne = names.slice(0, half);
  const rowTwo = names.slice(half);
  return (
    <div className="space-y-6" aria-label="合作企业滚动墙">
      <MarqueeRow names={rowOne} />
      {rowTwo.length > 0 && <MarqueeRow names={rowTwo} reverse />}
    </div>
  );
}
