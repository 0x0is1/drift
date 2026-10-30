import { Redirect } from "expo-router";
import { routes } from "@constants/routes";

/**
 * Catches unresolved deep links — notably the Android media notification's
 * tap intent, which lands on a bare "drift://" with no path and doesn't
 * match any route. Since that notification only exists while a track is
 * loaded, send it straight to the player instead of showing a dead end.
 */
export default function NotFoundScreen() {
  return <Redirect href={routes.player} />;
}
