/**
 * Q&A resource for asking questions about your files with RAG-powered answers.
 *
 * @example
 * ```typescript
 * const { answer, sources } = await client.qa.ask({ question: "What are the payment terms?" });
 * ```
 *
 * @module resources/qa
 */

import type { HttpClient } from "../client.js";

/** A source document cited in the Q&A answer. */
export interface QASource {
  /** The ID of the source file. */
  fileId: string;
  /** The filename of the source file. */
  filename?: string;
  /** A snippet from the source document. */
  snippet: string;
  /** Relevance score of this source. */
  score: number;
}

/** Response from the Q&A endpoint (non-streaming). */
export interface QAResponse {
  /** The generated answer. */
  answer: string;
  /** Source documents cited in the answer. */
  sources: QASource[];
  /** The original question. */
  question: string;
}

/** Parameters for a Q&A query. */
export interface QAParams {
  /** The question to ask. */
  question: string;
  /** Optional space to scope the Q&A to. */
  space?: string;
  /** Number of context documents to retrieve (default 5, max 10). */
  topK?: number;
  /** Whether to stream the response via SSE. */
  stream?: boolean;
}

/**
 * Ask questions about your files and get answers with citations.
 */
export class QAResource {
  constructor(private http: HttpClient) {}

  /**
   * Ask a question about your files.
   *
   * Uses RAG (Retrieval Augmented Generation) to find relevant documents
   * via vector search, then generates an answer using OpenAI with citations.
   *
   * @param params - Q&A parameters including the question and optional filters.
   * @returns The answer with source citations.
   *
   * @example
   * ```typescript
   * const { answer, sources } = await client.qa.ask({
   *   question: "What are the payment terms in the contract?",
   *   space: "contracts",
   * });
   *
   * console.log(answer);
   * for (const source of sources) {
   *   console.log(`  - ${source.filename} (score: ${source.score})`);
   * }
   * ```
   */
  async ask(params: QAParams): Promise<QAResponse> {
    return this.http.post<QAResponse>("/v1/qa", {
      question: params.question,
      space: params.space,
      topK: params.topK,
      stream: false,
    });
  }
}
