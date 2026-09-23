import React from "react";

/**
 * 목록 끝에 둔 감지용 요소(sentinel)가 화면에 보이면 onLoadMore를 호출한다.
 * 스크롤을 내리면 다음 페이지를 자동으로 이어 불러오는 목록에 사용한다.
 * enabled가 false면(다음 페이지 없음, 이미 불러오는 중 등) 감지하지 않는다.
 */
export function useInfiniteScrollTrigger<T extends Element>(
  enabled: boolean,
  onLoadMore: () => void,
  rootMargin = "200px"
): React.RefObject<T> {
  const ref = React.useRef<T>(null);
  const onLoadMoreRef = React.useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  React.useEffect(() => {
    const target = ref.current;
    if (!enabled || !target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMoreRef.current();
      },
      { rootMargin }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [enabled, rootMargin]);

  return ref;
}
