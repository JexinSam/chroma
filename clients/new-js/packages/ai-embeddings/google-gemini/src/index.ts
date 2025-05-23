import { EmbeddingFunction, registerEmbeddingFunction } from "chromadb";
import { validateConfigSchema } from "@chromadb/ai-embeddings-common";
import { GoogleGenAI } from "@google/genai";

const NAME = "google-generative-ai";

type StoredConfig = {
  api_key_env_var: string;
  model_name: string;
  task_type?: string;
};

export interface GoogleGeminiConfig {
  apiKey?: string;
  apiKeyEnvVar?: string;
  modelName?: string;
  taskType?: string;
}

export class GoogleGeminiEmbeddingFunction implements EmbeddingFunction {
  public readonly name = NAME;

  private readonly client: GoogleGenAI;
  private readonly apiKey: string;
  private readonly apiKeyEnvVar: string;
  private readonly modelName: string;
  private readonly taskType: string | undefined;

  constructor(args: Partial<GoogleGeminiConfig> = {}) {
    const {
      apiKeyEnvVar = "GEMINI_API_KEY",
      modelName = "text-embedding-004",
      taskType,
    } = args;

    const apiKey = args.apiKey || process.env[apiKeyEnvVar];

    if (!apiKey) {
      throw new Error(
        `Gemini API key is required. Please provide it in the constructor or set the environment variable ${apiKeyEnvVar}.`,
      );
    }

    this.modelName = modelName;
    this.apiKeyEnvVar = apiKeyEnvVar;
    this.apiKey = apiKey;
    this.taskType = taskType;
    this.client = new GoogleGenAI({ apiKey });
  }

  public async generate(texts: string[]): Promise<number[][]> {
    let result;
    try {
      result = await this.client.models.embedContent({
        model: this.modelName,
        contents: texts,
        config: this.taskType ? { taskType: this.taskType } : undefined,
      });
    } catch (e) {
      throw new Error(`Failed to generate Gemini embeddings: ${e}`);
    }

    if (
      !result.embeddings ||
      !result.embeddings.every((e) => e.values !== undefined)
    ) {
      throw new Error("Failed to generate Gemini embeddings");
    }

    return result.embeddings.map((e) => e.values as number[]);
  }

  public static buildFromConfig(
    config: StoredConfig,
  ): GoogleGeminiEmbeddingFunction {
    return new GoogleGeminiEmbeddingFunction({
      modelName: config.model_name,
      apiKeyEnvVar: config.api_key_env_var,
      taskType: config.task_type,
    });
  }

  getConfig(): StoredConfig {
    return {
      api_key_env_var: this.apiKeyEnvVar,
      model_name: this.modelName,
      task_type: this.taskType,
    };
  }

  public static validateConfig(config: StoredConfig): void {
    validateConfigSchema(config, NAME);
  }
}

registerEmbeddingFunction(NAME, GoogleGeminiEmbeddingFunction);
