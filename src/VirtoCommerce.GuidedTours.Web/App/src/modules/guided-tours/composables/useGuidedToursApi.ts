import { createGuidedToursApi, type GuidedToursApi } from "../api/client";

let api: GuidedToursApi | undefined;

export function useGuidedToursApi(): GuidedToursApi {
  api ??= createGuidedToursApi();
  return api;
}
