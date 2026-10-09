import { useEffect, useState } from "react";
import styles from "./Home.module.css";

const COMMANDS = {
  npm: "npm install page-lifecycle-tracker",
  pnpm: "pnpm add page-lifecycle-tracker",
} as const;

type Manager = keyof typeof COMMANDS;

/** The install command for npm or pnpm, with a button that copies it. */
export function InstallCommand() {
  const [manager, setManager] = useState<Manager>("npm");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);
  const command = COMMANDS[manager];
  return (
    <div className={styles.install}>
      <div className={styles.managers} role="group" aria-label="Package manager">
        {(Object.keys(COMMANDS) as Manager[]).map((name) => (
          <button key={name} type="button" className={styles.manager} aria-pressed={manager === name} onClick={() => setManager(name)}>
            {name}
          </button>
        ))}
      </div>
      <div className={styles.command}>
        <span className={styles.prompt} aria-hidden="true">
          $
        </span>
        <code>{command}</code>
        <button
          type="button"
          className={styles.copy}
          onClick={() => {
            navigator.clipboard?.writeText(command).then(
              () => setCopied(true),
              () => undefined,
            );
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <span className="visually-hidden" aria-live="polite">
          {copied ? "The command is on the clipboard." : ""}
        </span>
      </div>
    </div>
  );
}
