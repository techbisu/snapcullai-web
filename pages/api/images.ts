import type { NextApiRequest, NextApiResponse } from "next";
import { getImages } from "@/lib/r2";
import { normalizeFilter } from "@/lib/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const eventId = stringParam(req.query.eventId);
  if (!eventId) {
    return res.status(400).json({ error: "eventId is required" });
  }

  const limit = Number(stringParam(req.query.limit) || 24);
  const cursor = stringParam(req.query.cursor);
  const filter = normalizeFilter(req.query.filter);

  try {
    const page = await getImages({
      eventId,
      filter,
      cursor,
      limit: Number.isFinite(limit) ? limit : 24
    });

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json(page);
  } catch (error) {
    console.error("images api failed", error);
    return res.status(500).json({ error: "Unable to load images" });
  }
}

function stringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
