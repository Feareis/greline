"use client";

import { fr } from "@greline/i18n";
import { useEffect } from "react";
import { LINKS } from "./about-dialog";

const TITLE_STYLE = "font-size: 14px; font-weight: bold;";

// Strict Mode runs effects twice in development: greet once per page load.
let greeted = false;

/** Easter egg for the curious who open the browser console. */
export function ConsoleGreeting() {
  useEffect(() => {
    if (greeted) return;
    greeted = true;
    console.log(`%c${fr.consoleGreeting.title}`, TITLE_STYLE);
    console.log(fr.consoleGreeting.lines(LINKS.transit, LINKS.developer).join("\n\n"));
  }, []);
  return null;
}
