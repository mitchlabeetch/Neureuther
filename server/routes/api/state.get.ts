// GET /api/state — full snapshot of the app state.
// Triggers the daily checklist reset if `last_checklist_reset_date` is stale.
import { defineHandler } from "nitro";
import { loadAppState } from "../../utils/state";

export default defineHandler(async () => {
  return loadAppState(true);
});
