import fs from "node:fs/promises";
import type { NextApiRequest, NextApiResponse } from "next";
import formidable, { type File, type Fields, type Files } from "formidable";
import { searchMatches } from "@/lib/face";
import { hasEvent } from "@/lib/r2";

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let uploadedFile: File | null = null;

  try {
    const { fields, files } = await parseMultipart(req);
    const eventId = fieldValue(fields.eventId);
    uploadedFile = fileValue(files.image);

    if (!eventId) {
      return res.status(400).json({ error: "eventId is required" });
    }

    if (!(await hasEvent(eventId))) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (!uploadedFile) {
      return res.status(400).json({ error: "image is required" });
    }

    const buffer = await fs.readFile(uploadedFile.filepath);
    const matches = await searchMatches(eventId, buffer);

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ matches });
  } catch (error) {
    console.error("search api failed", error);
    return res.status(500).json({ error: "Unable to search images" });
  } finally {
    if (uploadedFile?.filepath) {
      await fs.unlink(uploadedFile.filepath).catch(() => undefined);
    }
  }
}

function parseMultipart(req: NextApiRequest) {
  const form = formidable({
    multiples: false,
    maxFileSize: 8 * 1024 * 1024,
    keepExtensions: true,
    filter: (part) => part.mimetype?.startsWith("image/") ?? false
  });

  return new Promise<{ fields: Fields; files: Files }>((resolve, reject) => {
    form.parse(req, (error, fields, files) => {
      if (error) reject(error);
      else resolve({ fields, files });
    });
  });
}

function fieldValue(value: Fields[string]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function fileValue(value: Files[string]) {
  if (Array.isArray(value)) return value[0];
  return value || null;
}
