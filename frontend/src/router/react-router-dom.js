import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const RouterContext = createContext(null);
const ParamsContext = createContext({});
const OutletContext = createContext(null);

function normalizePathname(pathname) {
  if (!pathname) return "/";
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

function toLocation(input, basePath = "/") {
  const url = new URL(input, `${window.location.origin}${basePath}`);
  return {
    pathname: normalizePathname(url.pathname),
    search: url.search,
    hash: url.hash,
  };
}

function splitPath(pathname) {
  const normalized = normalizePathname(pathname).replace(/\/+$/u, "");
  if (normalized === "") return [];
  if (normalized === "/") return [];
  return normalized.slice(1).split("/").filter(Boolean);
}

function buildHref(to) {
  const url = new URL(to, window.location.origin);
  return `${url.pathname}${url.search}${url.hash}`;
}

function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("Router components must be rendered inside a router.");
  }
  return context;
}

function RouterProvider({ initialLocation, children, memory = false }) {
  const [location, setLocation] = useState(initialLocation);

  const navigate = useCallback(
    (to, { replace = false } = {}) => {
      const nextLocation = toLocation(to, location.pathname);

      if (!memory) {
        const nextHref = `${nextLocation.pathname}${nextLocation.search}${nextLocation.hash}`;
        if (replace) {
          window.history.replaceState({}, "", nextHref);
        } else {
          window.history.pushState({}, "", nextHref);
        }
      }

      setLocation(nextLocation);
    },
    [location.pathname, memory]
  );

  useEffect(() => {
    if (memory) return undefined;

    const handlePopState = () => {
      setLocation({
        pathname: normalizePathname(window.location.pathname),
        search: window.location.search,
        hash: window.location.hash,
      });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [memory]);

  const value = useMemo(
    () => ({
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      navigate,
    }),
    [location.hash, location.pathname, location.search, navigate]
  );

  return React.createElement(RouterContext.Provider, { value }, children);
}

function matchRouteNode(routeElement, segments, inheritedParams = {}) {
  if (!React.isValidElement(routeElement)) return null;

  const { path, index, element, children } = routeElement.props;
  const childNodes = React.Children.toArray(children).filter(Boolean);

  if (index) {
    if (segments.length > 0) return null;
    return {
      params: inheritedParams,
      rendered: wrapRenderedElement(element, null, inheritedParams),
    };
  }

  if (path == null) {
    const childMatch = matchRouteList(childNodes, segments, inheritedParams);
    if (childMatch) {
      return {
        params: inheritedParams,
        rendered: wrapRenderedElement(element, childMatch.rendered, inheritedParams),
      };
    }

    if (!element) return null;
    if (segments.length === 0) {
      return {
        params: inheritedParams,
        rendered: wrapRenderedElement(element, null, inheritedParams),
      };
    }

    return null;
  }

  const routeSegments = path === "*" ? ["*"] : splitPath(path);
  const params = { ...inheritedParams };

  let consumed = 0;
  for (const segment of routeSegments) {
    const current = segments[consumed];
    if (segment === "*") {
      consumed = segments.length;
      break;
    }
    if (current == null) return null;
    if (segment.startsWith(":")) {
      params[segment.slice(1)] = current;
    } else if (segment !== current) {
      return null;
    }
    consumed += 1;
  }

  const remainingSegments = segments.slice(consumed);
  const childMatch = matchRouteList(childNodes, remainingSegments, params);
  if (childMatch) {
    return {
      params,
      rendered: wrapRenderedElement(element, childMatch.rendered, params),
    };
  }

  if (remainingSegments.length === 0 || path === "*") {
    return {
      params,
      rendered: wrapRenderedElement(element, null, params),
    };
  }

  return null;
}

function matchRouteList(routeElements, segments, inheritedParams) {
  for (const routeElement of routeElements) {
    const match = matchRouteNode(routeElement, segments, inheritedParams);
    if (match) return match;
  }
  return null;
}

function wrapRenderedElement(element, outlet, params) {
  const content = element ?? outlet;
  if (content == null) return null;

  return React.createElement(
    ParamsContext.Provider,
    { value: params },
    React.createElement(OutletContext.Provider, { value: outlet }, content)
  );
}

export function BrowserRouter({ children }) {
  return React.createElement(
    RouterProvider,
    {
      initialLocation: {
        pathname: normalizePathname(window.location.pathname),
        search: window.location.search,
        hash: window.location.hash,
      },
    },
    children
  );
}

export function MemoryRouter({ children, initialEntries = ["/"], initialIndex = 0 }) {
  const [entries, setEntries] = useState(() =>
    initialEntries.map((entry) => {
      const url = new URL(entry, window.location.origin);
      return `${normalizePathname(url.pathname)}${url.search}${url.hash}`;
    })
  );

  const [currentIndex, setCurrentIndex] = useState(
    Math.min(Math.max(initialIndex, 0), entries.length - 1)
  );

  const current = entries[currentIndex] ?? "/";
  const currentLocation = toLocation(current);

  const navigate = useCallback(
    (to, { replace = false } = {}) => {
      const next = toLocation(to, currentLocation.pathname);
      const nextHref = `${next.pathname}${next.search}${next.hash}`;

      if (replace) {
        setEntries((currentEntries) => {
          const nextEntries = [...currentEntries];
          nextEntries[currentIndex] = nextHref;
          return nextEntries;
        });
      } else {
        setEntries((currentEntries) => [
          ...currentEntries.slice(0, currentIndex + 1),
          nextHref,
        ]);
        setCurrentIndex((index) => index + 1);
      }
    },
    [currentIndex, currentLocation.pathname]
  );

  const value = useMemo(
    () => ({
      pathname: currentLocation.pathname,
      search: currentLocation.search,
      hash: currentLocation.hash,
      navigate,
    }),
    [currentLocation.hash, currentLocation.pathname, currentLocation.search, navigate]
  );

  return React.createElement(RouterContext.Provider, { value }, children);
}

export function Routes({ children }) {
  const { pathname } = useRouter();
  const segments = splitPath(pathname);
  const match = matchRouteList(React.Children.toArray(children).filter(Boolean), segments, {});

  return match?.rendered ?? null;
}

export function Route() {
  return null;
}

export function Outlet() {
  return useContext(OutletContext);
}

export function useNavigate() {
  return useRouter().navigate;
}

export function useParams() {
  return useContext(ParamsContext);
}

export function Link({ to, onClick, children, ...props }) {
  const { navigate } = useRouter();
  const href = buildHref(to);

  function handleClick(event) {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return;
    }

    event.preventDefault();
    navigate(to);
  }

  return React.createElement("a", { href, onClick: handleClick, ...props }, children);
}

export function NavLink({ to, className, children, end, onClick, ...props }) {
  const { pathname } = useRouter();
  const targetPath = normalizePathname(new URL(to, window.location.origin).pathname);
  const isActive = end ? pathname === targetPath : pathname === targetPath || pathname.startsWith(`${targetPath}/`);

  const resolvedClassName =
    typeof className === "function"
      ? className({ isActive, isPending: false })
      : [className, isActive ? "active" : null].filter(Boolean).join(" ");

  return React.createElement(
    Link,
    {
      to,
      className: resolvedClassName || undefined,
      "aria-current": isActive ? "page" : undefined,
      onClick,
      ...props,
    },
    children
  );
}

export function Navigate({ to, replace = false }) {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(to, { replace });
  }, [navigate, replace, to]);

  return null;
}

export function useSearchParams() {
  const router = useRouter();
  const searchParams = useMemo(() => new URLSearchParams(router.search), [router.search]);

  const setSearchParams = useCallback((nextInit) => {
    let nextStr = "";
    if (typeof nextInit === "function") {
      nextStr = new URLSearchParams(nextInit(searchParams)).toString();
    } else {
      nextStr = new URLSearchParams(nextInit).toString();
    }
    router.navigate("?" + nextStr, { replace: true });
  }, [router, searchParams]);

  return [searchParams, setSearchParams];
}
