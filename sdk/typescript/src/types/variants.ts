/**
 * Typed variant objects — discriminated union types for all variant data.
 *
 * Each variant type has a unique `type` discriminant. Use TypeScript's narrowing
 * to access type-specific properties:
 *
 * ```ts
 * const variant = await roset.files.getVariant(fileId, variantId);
 * if (variant.type === 'markdown') {
 *   console.log(variant.content); // string
 * }
 * ```
 *
 * @module types/variants
 */

/** Language detection result from metadata extraction. */
export interface LanguageInfo {
  /** ISO 639-1 language code (e.g. `"en"`, `"ar"`, `"zh"`). */
  code: string;
  /** Human-readable language name. */
  name: string;
  /** Detection confidence (0.0–1.0). */
  confidence: number;
}

/** Markdown variant — clean readable text extracted from the document. */
export interface MarkdownVariant {
  type: 'markdown';
  /** Extracted markdown content. */
  content: string;
  /** Number of pages in the source document. */
  pageCount: number;
  /** Character count of the extracted text. */
  characterCount: number;
  /** Word count of the extracted text. */
  wordCount: number;
}

/** A single embedding chunk with its vector and source text. */
export interface EmbeddingChunk {
  /** Source text for this chunk. */
  text: string;
  /** Vector embedding as an array of floats. */
  embedding: number[];
  /** Token count for this chunk. */
  tokenCount: number;
  /** Start page of the source text (1-indexed). */
  startPage: number;
  /** End page of the source text (1-indexed). */
  endPage: number;
}

/** Embeddings variant — vector representations for semantic search. */
export interface EmbeddingsVariant {
  type: 'embeddings';
  /** Array of embedding chunks. */
  chunks: EmbeddingChunk[];
  /** Embedding model used (e.g. `"text-embedding-3-small"`). */
  model: string;
  /** Dimensionality of the embedding vectors. */
  dimensions: number;
  /** Total number of chunks. */
  totalChunks: number;
}

/** Metadata variant — structured fields extracted from the document. */
export interface MetadataVariant {
  type: 'metadata';
  /** Number of pages in the source document. */
  pageCount: number;
  /** File size in bytes. */
  fileSize: number;
  /** MIME content type of the source file. */
  contentType: string;
  /** Detected language information. */
  language: LanguageInfo;
  /**
   * Heuristic confidence score (0.0–1.0) for the extraction quality.
   * Higher values indicate cleaner extraction. Below 0.7 suggests potential issues.
   */
  extractionConfidence: number;
  /**
   * Quality warnings detected in the extracted content.
   * Possible values: `"mixed_rtl_ltr"`, `"sparse_text_for_page_count"`,
   * `"table_structure_low_confidence"`, `"unicode_replacement_chars"`,
   * `"possible_garbled_text"`.
   */
  qualityWarnings: string[];
  /** Word count of the extracted text. */
  wordCount: number;
  /** Character count of the extracted text. */
  characterCount: number;
  /** Raw provider-specific metadata. */
  providerRaw: Record<string, unknown>;
}

/** Thumbnail variant — visual preview image for the file. */
export interface ThumbnailVariant {
  type: 'thumbnail';
  /** Signed URL to the thumbnail image. */
  url: string;
  /** Thumbnail width in pixels. */
  width: number;
  /** Thumbnail height in pixels. */
  height: number;
  /** Image format (e.g. `"png"`, `"webp"`). */
  format: string;
}

/** Searchable index variant — full-text search index entry. */
export interface SearchableIndexVariant {
  type: 'searchable-index';
  /** ISO 8601 timestamp of when the index was built. */
  indexedAt: string;
  /** Number of unique terms in the index. */
  termCount: number;
  /** Number of indexed segments/pages. */
  segmentCount: number;
}

/**
 * Discriminated union of all variant types.
 *
 * Use the `type` field to narrow:
 * ```ts
 * switch (variant.type) {
 *   case 'markdown': variant.content; break;
 *   case 'embeddings': variant.chunks; break;
 *   case 'metadata': variant.extractionConfidence; break;
 *   case 'thumbnail': variant.url; break;
 *   case 'searchable-index': variant.termCount; break;
 * }
 * ```
 */
export type TypedVariant =
  | MarkdownVariant
  | EmbeddingsVariant
  | MetadataVariant
  | ThumbnailVariant
  | SearchableIndexVariant;

/** All possible variant type strings. */
export type VariantType = TypedVariant['type'];
