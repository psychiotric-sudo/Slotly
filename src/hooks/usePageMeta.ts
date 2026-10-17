import { useEffect } from "react";

/**
 * Sets document.title and the robots meta for the current route.
 * Both the landing and the planner set theirs on mount so back-and-forth
 * navigation always leaves the right tags in place.
 */
export function usePageMeta(title: string, robots: string) {
  useEffect(() => {
    document.title = title;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", robots);
  }, [title, robots]);
}
