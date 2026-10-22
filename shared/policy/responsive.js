/** Pixel breakpoints shared by matchMedia and the Tailwind/CSS build. */
export const BREAKPOINTS = Object.freeze({ xs: 400, sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 });
export const DESKTOP_MEDIA_QUERY = `(min-width: ${BREAKPOINTS.lg}px)`;
export const TAILWIND_SCREENS = Object.fromEntries(
  Object.entries(BREAKPOINTS).map(([name, width]) => [name, `${width}px`])
);
