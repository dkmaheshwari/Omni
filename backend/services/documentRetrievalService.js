const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const ThreadDocumentChunk = require("../models/ThreadDocumentChunk");

const SUPPORTED_MIME_TYPES = new Set([
  "text/plain",
  "text/csv",
  "application/pdf",
]);

class DocumentRetrievalService {
  constructor() {
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 900,
      chunkOverlap: 120,
    });
  }

  isSupportedAttachment(attachment) {
    return SUPPORTED_MIME_TYPES.has(attachment.fileType);
  }

  async extractText(attachment) {
    if (!attachment?.filePath) return "";

    const absolutePath = path.resolve(attachment.filePath);

    if (!fs.existsSync(absolutePath)) {
      return "";
    }

    if (attachment.fileType === "application/pdf") {
      const fileBuffer = fs.readFileSync(absolutePath);
      const parsed = await pdfParse(fileBuffer);
      return (parsed.text || "").trim();
    }

    if (
      attachment.fileType === "text/plain" ||
      attachment.fileType === "text/csv"
    ) {
      return fs.readFileSync(absolutePath, "utf8").trim();
    }

    return "";
  }

  async indexMessageAttachments({
    threadId,
    messageId,
    uploaderId,
    attachments = [],
  }) {
    const supported = attachments.filter((attachment) =>
      this.isSupportedAttachment(attachment),
    );

    if (supported.length === 0) {
      return { indexedFiles: 0, indexedChunks: 0 };
    }

    let indexedFiles = 0;
    let indexedChunks = 0;

    for (const attachment of supported) {
      try {
        const extractedText = await this.extractText(attachment);
        if (!extractedText || extractedText.length < 20) {
          continue;
        }

        const chunks = await this.splitter.splitText(extractedText);
        const normalizedChunks = chunks
          .map((chunk) => chunk.trim())
          .filter((chunk) => chunk.length > 30)
          .slice(0, 120);

        if (normalizedChunks.length === 0) {
          continue;
        }

        const docsToInsert = normalizedChunks.map((chunk, index) => ({
          threadId,
          sourceMessageId: messageId,
          uploaderId,
          fileName: attachment.fileName,
          originalName: attachment.originalName,
          chunkIndex: index,
          text: chunk,
          tokenEstimate: Math.ceil(chunk.length / 4),
        }));

        await ThreadDocumentChunk.insertMany(docsToInsert, { ordered: false });
        indexedFiles += 1;
        indexedChunks += docsToInsert.length;
      } catch (error) {
        console.error("Document indexing failed for attachment:", {
          fileName: attachment?.originalName,
          error: error.message,
        });
      }
    }

    return { indexedFiles, indexedChunks };
  }

  scoreChunk(chunkText, queryWords) {
    const lower = chunkText.toLowerCase();
    let score = 0;

    for (const word of queryWords) {
      if (word.length < 3) continue;
      if (lower.includes(word)) {
        score += 1;
      }
    }

    return score;
  }

  async getRelevantContext(threadId, query, maxChunks = 4) {
    if (!query || typeof query !== "string" || query.trim().length < 3) {
      return { snippets: [], contextText: "" };
    }

    const queryWords = query
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .slice(0, 20);

    if (queryWords.length === 0) {
      return { snippets: [], contextText: "" };
    }

    const recentChunks = await ThreadDocumentChunk.find({ threadId })
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();

    if (recentChunks.length === 0) {
      return { snippets: [], contextText: "" };
    }

    const scored = recentChunks
      .map((chunk) => ({
        ...chunk,
        score: this.scoreChunk(chunk.text, queryWords),
      }))
      .filter((chunk) => chunk.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxChunks);

    const snippets = scored.map((chunk) => ({
      fileName: chunk.originalName,
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
      score: chunk.score,
    }));

    const contextText = snippets
      .map(
        (snippet, index) =>
          `[Source ${index + 1}: ${snippet.fileName} | chunk ${snippet.chunkIndex}]\n${snippet.text}`,
      )
      .join("\n\n");

    return { snippets, contextText };
  }
}

module.exports = new DocumentRetrievalService();
