import "dotenv/config";
import express from "express";
import { VKConnector } from "./vk/VKConnector";
import { VKCollector } from "./vk/VKCollector";
import { runPipeline } from "./dataset/pipeline";
import { writeCsv } from "./dataset/csv";
import { loadConfig, parseGroupOwners } from "./config/env";

const config = loadConfig();
const app = express();

app.use(express.json());

app.post("/collect", async (req, res) => {
  try {
    if (!config.vk.accessToken) {
      return res.status(503).json({ error: "VK_ACCESS_TOKEN is not configured" });
    }

    const body = req.body as { ownerIds?: unknown; target?: unknown };
    const ownerIds = body.ownerIds === undefined
      ? config.vk.groupOwners
      : parseRequestOwnerIds(body.ownerIds);
    const target = body.target === undefined
      ? config.vk.targetRawCount
      : parseTarget(body.target);

    if (ownerIds.length === 0) {
      return res.status(400).json({
        error: "Set VK_GROUP_IDS in .env or pass ownerIds in the request body",
      });
    }

    const connector = new VKConnector(
      config.vk.accessToken,
      config.vk.apiVersion,
    );
    const collector = new VKCollector(connector, {
      includeComments: config.vk.includeComments,
      maxCommentsPerPost: config.vk.maxCommentsPerPost,
      maxRepliesPerComment: config.vk.maxRepliesPerComment,
    });
    const raw = await collector.collect(ownerIds, target);

    await writeCsv("data/raw/vk_raw.csv", raw);
    const result = await runPipeline(
      raw,
      "keywords/03_keywords_approved.csv",
      "data/candidates",
    );

    return res.json({ raw: raw.length, ...result });
  } catch (error) {
    const status = error instanceof RequestValidationError ? 400 : 500;
    return res.status(status).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.get("/", (req, res) => {
  res.send("Working!");
});

app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});

function parseRequestOwnerIds(value: unknown): number[] {
  if (!Array.isArray(value)) {
    throw new RequestValidationError(
      "ownerIds must be an array of numeric VK group IDs",
    );
  }
  try {
    return parseGroupOwners(value.map(String).join(","));
  } catch (error) {
    throw new RequestValidationError(
      error instanceof Error ? error.message : "Invalid ownerIds",
    );
  }
}

function parseTarget(value: unknown): number {
  const target = Number(value);
  if (!Number.isInteger(target) || target < 1 || target > 100_000) {
    throw new RequestValidationError(
      "target must be an integer from 1 to 100000",
    );
  }
  return target;
}

class RequestValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "RequestValidationError";
  }
}
