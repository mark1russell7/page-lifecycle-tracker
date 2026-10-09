import type { BundledLanguage } from "shiki";

/** The themes of the code on the site: one for the light theme and one for the dark theme. */
export const CODE_THEMES = { light: "github-light-default", dark: "github-dark-default" } as const;

/** The languages that the code blocks of the site use. */
export const CODE_LANGUAGES: BundledLanguage[] = ["javascript", "typescript", "jsx", "tsx", "json", "bash", "shellscript", "html", "css", "diff"];
