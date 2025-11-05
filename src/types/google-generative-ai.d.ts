declare module '@google/generative-ai' {
  export interface GenerateContentStreamResult {
    stream: AsyncIterable<{ text(): string }>;
  }

  export interface GenerativeModel {
    generateContentStream(prompt: string): Promise<GenerateContentStreamResult>;
  }

  export class GoogleGenerativeAI {
    constructor(apiKey: string);
    getGenerativeModel(options: { model: string }): GenerativeModel;
  }
}

