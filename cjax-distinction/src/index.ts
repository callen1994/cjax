// Either an empty object or it's neither
export type CjaxDistincterFig = {
  comparator: <T>(a: T, b: T) => boolean;
  copy: <T>(val: T) => T;
  slowWarnThreshold?: number;
} | null;

export var CJAX_DEFAULT_DISTINCT_FIG: CjaxDistincterFig = null;

export function SET_CJAX_DISTINCTION_FIG(fig: CjaxDistincterFig) {
  CJAX_DEFAULT_DISTINCT_FIG = fig;
}
