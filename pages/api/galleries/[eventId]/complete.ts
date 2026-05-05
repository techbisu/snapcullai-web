import type { NextApiRequest, NextApiResponse } from "next";
import { completeUpload } from "@/lib/gallery-upload";

type UploadedPhotoPayload = {
  photoId: string;
  objectKey: string;
  imageUrl: string;
  label: string;
  capturedAt: number;
  faceCount: number;
  hasFace: boolean;
  selfieCandidate: boolean;
  smileDetected: boolean;
  eyesOpen: boolean;
  overallScore: number;
  isDuplicate: boolean;
};

type CompleteGalleryUploadRequest = {
  uploadBatchId?: string;
  uploadedPhotos?: UploadedPhotoPayload[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const eventId = stringParam(req.query.eventId);
    const body = req.body as CompleteGalleryUploadRequest;

    if (!eventId) {
      return res.status(400).json({ error: "eventId is required" });
    }

    if (!Array.isArray(body?.uploadedPhotos) || body.uploadedPhotos.length === 0) {
      return res.status(400).json({ error: "uploadedPhotos are required" });
    }

    if (!body.uploadBatchId) {
      return res.status(400).json({ error: "uploadBatchId is required" });
    }

    const response = await completeUpload(eventId, body.uploadBatchId, body.uploadedPhotos);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(response);
  } catch (error) {
    console.error("complete upload api failed", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unable to finalize upload"
    });
  }
}

function stringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
