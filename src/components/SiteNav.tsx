import Link from "next/link";
import styles from "./SiteNav.module.css";

// Links between the app's pages, shown at the top of each one.
export function SiteNav() {
  return (
    <nav className={styles.nav}>
      <Link href="/">Log</Link>
      <Link href="/progress">Progress</Link>
    </nav>
  );
}
