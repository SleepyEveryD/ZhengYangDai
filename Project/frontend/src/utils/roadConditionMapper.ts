import type { RouteCondition } from "../types/route";

/** 把 UI 的各种写法，统一转成 DB enum */
export function toDbRoadCondition(input: string): RouteCondition {
  const v = (input ?? "").trim().toLowerCase();

  if (v === "excellent") return "excellent";
  if (v === "good") return "good";
  if (v === "fair") return "fair";

  // 兼容各种写法
  if (v === "need_repair" || v === "need repair" || v === "needrepair") {
    return "needRepair";
  }

  // 兜底：别默认 GOOD（否则你永远看不到错误）
  // 建议直接 throw，让你马上发现哪一步传错值
  throw new Error(`Invalid roadCondition: ${input}`);
}