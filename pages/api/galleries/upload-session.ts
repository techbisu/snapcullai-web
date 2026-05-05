import type { NextApiRequest, NextApiResponse } from "next";
import { createUploadSession } from "@/lib/gallery-upload";

type UploadPhotoDescriptor = {
  photoId: string;
  fileName: string;
  contentType: string;
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

type CreateGalleryUploadSessionRequest = {
  eventId?: string;
  eventName?: string;
  photoCount?: number;
  photos?: UploadPhotoDescriptor[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body as CreateGalleryUploadSessionRequest;
    if (!body?.eventId || !Array.isArray(body.photos) || body.photos.length === 0) {
      return res.status(400).json({ error: "eventId and photos are required" });
    }

    const response = await createUploadSession({
      eventId: body.eventId,
      eventName: body.eventName || body.eventId,
      photos: body.photos
    });

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(response);
  } catch (error) {
    console.error("upload-session api failed", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unable to create upload session"
    });
  }
}
