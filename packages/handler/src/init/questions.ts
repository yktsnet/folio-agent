import * as clack from "@clack/prompts";
import { DEFAULT_LANGUAGE } from "../chat/types.js";
import type { Language } from "../chat/types.js";
import type { ThemeColors, ZennIngestConfig } from "../ingest/types.js";

export interface WizardAnswers {
  language: Language;
  distDir: string;
  include: string[];
  zenn?: ZennIngestConfig;
  contactUrl?: string;
  theme: ThemeColors;
  /** Non-empty only when the visitor typed a new key this run; blank means "leave .dev.vars untouched". */
  geminiApiKey?: string;
  /** `undefined` means "don't generate the API route scaffold" (site already wires the handler elsewhere). */
  apiRoutePath?: string;
}

const DEFAULT_API_ROUTE_PATH = "functions/api/chat.ts";

export const DEFAULT_WIZARD_ANSWERS: WizardAnswers = {
  language: DEFAULT_LANGUAGE,
  distDir: "dist",
  include: ["/**"],
  theme: { accent: "#2563eb", surface: "#ffffff", text: "#111827" },
  apiRoutePath: DEFAULT_API_ROUTE_PATH,
};

const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Pure hex color validation used both as a `clack.text` validator and in tests. */
export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value.trim());
}

/** Splits a comma-separated glob list into a trimmed, non-empty array. */
export function parseIncludeList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * Normalizes a Zenn `baseUrl` answer. A bare username (no `http(s)://` prefix) is expanded to the
 * canonical Zenn articles URL; an already-fully-qualified URL passes through unchanged.
 */
export function normalizeZennBaseUrl(input: string): string {
  const trimmed = input.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://zenn.dev/${trimmed}/articles`;
}

/**
 * Default answer for the "API route scaffold output path" question: the scaffold path for a
 * fresh setup (no previous config), or `undefined` ("don't generate") when re-running against an
 * existing config, since the site likely already wires the handler up some other way.
 */
export function defaultApiRoutePath(hasPreviousConfig: boolean): string | undefined {
  return hasPreviousConfig ? undefined : DEFAULT_API_ROUTE_PATH;
}

interface WizardText {
  distDirMessage: string;
  includeMessage: string;
  includePlaceholder: string;
  zennConfirmMessage: string;
  zennArticlesDirMessage: string;
  zennBaseUrlMessage: string;
  zennBaseUrlNormalizedNote: (baseUrl: string) => string;
  contactUrlMessage: string;
  contactUrlPlaceholder: string;
  accentMessage: string;
  surfaceMessage: string;
  textColorMessage: string;
  colorValidationError: string;
  geminiApiKeyMessage: string;
  geminiApiKeySkipNote: string;
  apiRoutePathMessage: string;
  apiRoutePathPlaceholder: string;
  cancelledMessage: string;
}

const WIZARD_TEXT: Record<Language, WizardText> = {
  ja: {
    distDirMessage: "ビルド成果物のディレクトリ（distDir）",
    includeMessage: "知識に含める URL パスのグロブ（カンマ区切りで複数可）",
    includePlaceholder: "/**",
    zennConfirmMessage: "Zenn 記事も知識に含めますか？",
    zennArticlesDirMessage: "Zenn CLI の articles/ ディレクトリへのパス",
    zennBaseUrlMessage: "記事の公開 URL のベース（例: https://zenn.dev/<username>/articles、またはユーザー名のみでも可）",
    zennBaseUrlNormalizedNote: (baseUrl) => `✅ ${baseUrl} として登録します。`,
    contactUrlMessage: "Contact ページの URL（任意。空 Enter でスキップ）",
    contactUrlPlaceholder: "https://example.com/contact",
    accentMessage: "テーマカラー: accent（#付き hex）",
    surfaceMessage: "テーマカラー: surface（#付き hex）",
    textColorMessage: "テーマカラー: text（#付き hex）",
    colorValidationError: "#fff や #ffffff のような hex カラーコードで入力してください。",
    geminiApiKeyMessage: "Gemini API キー（任意。空 Enter でスキップ）",
    geminiApiKeySkipNote: "スキップしました。キーは https://aistudio.google.com/apikey から取得できます。",
    apiRoutePathMessage: "API ルート雛形の出力先（空 Enter で生成しない。既に別の経路で配線済みのサイト向け）",
    apiRoutePathPlaceholder: "functions/api/chat.ts",
    cancelledMessage: "セットアップを中止しました。",
  },
  en: {
    distDirMessage: "Build output directory (distDir)",
    includeMessage: "URL path globs to include in the knowledge (comma-separated for multiple)",
    includePlaceholder: "/**",
    zennConfirmMessage: "Include Zenn articles in the knowledge too?",
    zennArticlesDirMessage: "Path to the Zenn CLI articles/ directory",
    zennBaseUrlMessage: "Base URL for published articles (e.g. https://zenn.dev/<username>/articles, or just your username)",
    zennBaseUrlNormalizedNote: (baseUrl) => `✅ Registering as ${baseUrl}.`,
    contactUrlMessage: "Contact page URL (optional, press Enter to skip)",
    contactUrlPlaceholder: "https://example.com/contact",
    accentMessage: "Theme color: accent (hex with #)",
    surfaceMessage: "Theme color: surface (hex with #)",
    textColorMessage: "Theme color: text (hex with #)",
    colorValidationError: "Enter a hex color code like #fff or #ffffff.",
    geminiApiKeyMessage: "Gemini API key (optional, press Enter to skip)",
    geminiApiKeySkipNote: "Skipped. Get a key at https://aistudio.google.com/apikey",
    apiRoutePathMessage: "Output path for the API route scaffold (blank to skip generating it, e.g. if already wired up elsewhere)",
    apiRoutePathPlaceholder: "functions/api/chat.ts",
    cancelledMessage: "Setup cancelled.",
  },
};

function unwrap<T>(value: T | symbol, cancelledMessage: string): T {
  if (clack.isCancel(value)) {
    clack.cancel(cancelledMessage);
    process.exit(0);
  }
  return value;
}

/** Runs the interactive wizard (all-defaults-Enter-to-quick-mode) and returns the collected answers. */
export async function runWizard(defaults: WizardAnswers): Promise<WizardAnswers> {
  clack.intro("folio-agent-init");

  const language = unwrap(
    await clack.select({
      message: "Language / 言語",
      options: [
        { value: "ja" as const, label: "日本語" },
        { value: "en" as const, label: "English" },
      ],
      initialValue: defaults.language,
    }),
    WIZARD_TEXT[defaults.language].cancelledMessage,
  );
  const text = WIZARD_TEXT[language];

  const distDir = unwrap(
    await clack.text({ message: text.distDirMessage, initialValue: defaults.distDir }),
    text.cancelledMessage,
  );

  const includeInput = unwrap(
    await clack.text({
      message: text.includeMessage,
      placeholder: text.includePlaceholder,
      initialValue: defaults.include.join(", "),
    }),
    text.cancelledMessage,
  );
  const include = parseIncludeList(includeInput);

  const wantsZenn = unwrap(
    await clack.confirm({ message: text.zennConfirmMessage, initialValue: Boolean(defaults.zenn) }),
    text.cancelledMessage,
  );

  let zenn: ZennIngestConfig | undefined;
  if (wantsZenn) {
    const articlesDir = unwrap(
      await clack.text({
        message: text.zennArticlesDirMessage,
        initialValue: defaults.zenn?.articlesDir ?? "../zenn-content/articles",
      }),
      text.cancelledMessage,
    );
    const baseUrlInput = unwrap(
      await clack.text({
        message: text.zennBaseUrlMessage,
        initialValue: defaults.zenn?.baseUrl ?? "",
      }),
      text.cancelledMessage,
    );
    const baseUrl = normalizeZennBaseUrl(baseUrlInput);
    if (baseUrl !== baseUrlInput.trim()) {
      clack.note(text.zennBaseUrlNormalizedNote(baseUrl));
    }
    zenn = { articlesDir, baseUrl };
  }

  const contactUrlInput = unwrap(
    await clack.text({
      message: text.contactUrlMessage,
      placeholder: text.contactUrlPlaceholder,
      initialValue: defaults.contactUrl ?? "",
    }),
    text.cancelledMessage,
  );
  const contactUrl = contactUrlInput.trim().length > 0 ? contactUrlInput.trim() : undefined;

  const colorValidate = (value: string | undefined): string | undefined =>
    isValidHexColor(value ?? "") ? undefined : text.colorValidationError;

  const accent = unwrap(
    await clack.text({ message: text.accentMessage, initialValue: defaults.theme.accent, validate: colorValidate }),
    text.cancelledMessage,
  );
  const surface = unwrap(
    await clack.text({ message: text.surfaceMessage, initialValue: defaults.theme.surface, validate: colorValidate }),
    text.cancelledMessage,
  );
  const textColor = unwrap(
    await clack.text({ message: text.textColorMessage, initialValue: defaults.theme.text, validate: colorValidate }),
    text.cancelledMessage,
  );

  const geminiApiKeyInput = unwrap(
    await clack.password({ message: text.geminiApiKeyMessage }),
    text.cancelledMessage,
  );
  const geminiApiKey = geminiApiKeyInput.trim().length > 0 ? geminiApiKeyInput.trim() : undefined;
  if (!geminiApiKey) {
    clack.note(text.geminiApiKeySkipNote);
  }

  const apiRoutePathInput = unwrap(
    await clack.text({
      message: text.apiRoutePathMessage,
      placeholder: text.apiRoutePathPlaceholder,
      initialValue: defaults.apiRoutePath ?? "",
    }),
    text.cancelledMessage,
  );
  const apiRoutePath = apiRoutePathInput.trim().length > 0 ? apiRoutePathInput.trim() : undefined;

  return {
    language,
    distDir,
    include,
    zenn,
    contactUrl,
    theme: { accent, surface, text: textColor },
    geminiApiKey,
    apiRoutePath,
  };
}
