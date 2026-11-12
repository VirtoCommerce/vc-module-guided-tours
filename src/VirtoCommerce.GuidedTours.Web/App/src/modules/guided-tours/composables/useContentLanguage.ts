import { computed, ref } from "vue";
import { SettingClient, useApiClient, useLanguages } from "@vc-shell/framework";
import { pickLanguage } from "../logic/text";

export const LANGUAGES_SETTING = "VirtoCommerce.Core.General.Languages";

export interface LanguageOption {
  value: string;
  label: string;
  flag?: string;
}

const codes = ref<string[]>([]);
const options = ref<Record<string, LanguageOption>>({});
const picked = ref<string>();
let loaded: Promise<void> | undefined;

export function useContentLanguage() {
  const { currentLocale, getLocaleByTag, getFlag } = useLanguages();
  const { getApiClient } = useApiClient(SettingClient);

  async function describe(code: string) {
    if (options.value[code]) {
      return;
    }
    options.value[code] = { value: code, label: getLocaleByTag(code) || code };
    try {
      const flag = await getFlag(code);
      options.value[code] = { ...options.value[code], flag };
    } catch {
      // a language without a flag is shown by name only
    }
  }

  function add(more: readonly string[]) {
    const fresh = [...new Set(more)].filter((code) => code && !codes.value.includes(code));
    if (fresh.length > 0) {
      codes.value = [...codes.value, ...fresh];
      fresh.forEach(describe);
    }
  }

  async function fetchSetting(): Promise<string[]> {
    try {
      const client = await getApiClient();
      const setting = await client.getGlobalSetting(LANGUAGES_SETTING);
      return (setting?.allowedValues ?? []).filter((value): value is string => typeof value === "string");
    } catch {
      return [];
    }
  }

  function load(): Promise<void> {
    loaded ??= fetchSetting().then((fromSetting) => {
      add(fromSetting.length > 0 ? fromSetting : ["en-US"]);
    });
    return loaded;
  }

  const current = computed<string>({
    get: () => picked.value ?? pickLanguage(codes.value, currentLocale.value) ?? "en-US",
    set: (value) => {
      picked.value = value;
    },
  });

  return {
    languages: computed(() => codes.value.map((code) => options.value[code] ?? { value: code, label: code })),
    current,
    load,
    add,
  };
}
