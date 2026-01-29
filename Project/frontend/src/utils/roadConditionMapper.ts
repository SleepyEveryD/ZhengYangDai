import type { RoadCondition } from "../types/roadCondition";

/** 把 UI 的各种写法，统一转成 DB enum */
export function toDbRoadCondition(input: string): RoadCondition {
  const v = (input ?? "").trim().toLowerCase();

  if (v === "excellent") return "EXCELLENT";
  if (v === "good") return "GOOD";
  if (v === "fair") return "FAIR";

  // 兼容各种写法
  if (v === "need_repair" || v === "need repair" || v === "needrepair") {
    return "NEED_REPAIR";
  }

  // 兜底：别默认 GOOD（否则你永远看不到错误）
  // 建议直接 throw，让你马上发现哪一步传错值
  throw new Error(`Invalid roadCondition: ${input}`);
}
