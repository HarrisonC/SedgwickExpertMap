import { validateProfiles } from "./experts";
const profiles = import.meta.glob("../data/experts/*.json", { eager: true, import: "default" });
export const experts = validateProfiles(profiles);
