"use client";

import * as React from "react";

const TABLET_BREAKPOINT = 1024;

export function useIsMobileOrTablet() {
  const [isMobileOrTablet, setIsMobileOrTablet] = React.useState(false);

  React.useEffect(() => {
    const check = () => {
      setIsMobileOrTablet(window.innerWidth < TABLET_BREAKPOINT);
    };

    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobileOrTablet;
}
