import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type PromptTemplateName =
  | "theme-clustering"
  | "dual-reports"
  | "conflicting-viewpoints"
  | "equity-narrative"
  | "decision-impact";

const promptDirectory = join(process.cwd(), "prompts");

export function getPromptTemplatePath(
  templateName: PromptTemplateName,
): string {
  return join(promptDirectory, `${templateName}.txt`);
}

export function readPromptTemplate(templateName: PromptTemplateName): string {
  const filePath = getPromptTemplatePath(templateName);

  if (!existsSync(filePath)) {
    throw new Error(`Prompt template not found: ${filePath}`);
  }

  return readFileSync(filePath, "utf-8").trim();
}

export function listPromptTemplateNames(): PromptTemplateName[] {
  return [
    "theme-clustering",
    "dual-reports",
    "conflicting-viewpoints",
    "equity-narrative",
    "decision-impact",
  ];
}
