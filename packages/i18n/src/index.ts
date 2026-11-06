import { fr } from "./locales/fr";

export type Messages = typeof fr;
export const messages = { fr } as const;
export type Locale = keyof typeof messages;

export { fr };
