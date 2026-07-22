import { defineHandler } from "nitro";
import { loadKitchenRules } from "../../utils/kitchen-rules";

export default defineHandler(async () => loadKitchenRules());
