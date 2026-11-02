import { TerasLoadingState } from "../teras";

export default function ConsoleLoading() {
  return <main aria-label="Console startup"><TerasLoadingState label="Opening Console…" detail="Preparing your workspace." /></main>;
}
