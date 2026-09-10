import { NextRequest, NextResponse } from "next/server";
import { getJobStatus, QUEUE_NAMES, QueueName } from "@/lib/queue/queues";
import { isRedisConnected } from "@/lib/queue/redis";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const checkRedis = searchParams.get("checkRedis");

  if (checkRedis === "true") {
    const isAlive = await isRedisConnected();
    return NextResponse.json({
      redisAlive: isAlive,
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: process.env.REDIS_PORT || "6379",
    });
  }

  const queue = searchParams.get("queue") as QueueName;
  const jobId = searchParams.get("jobId");

  if (!queue || !jobId) {
    return NextResponse.json(
      { success: false, error: "Parameter 'queue' dan 'jobId' wajib diisi." },
      { status: 400 }
    );
  }

  const validQueues = Object.values(QUEUE_NAMES);
  if (!validQueues.includes(queue)) {
    return NextResponse.json(
      {
        success: false,
        error: `Queue '${queue}' tidak valid. Pilihan: ${validQueues.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const status = await getJobStatus(queue, jobId);
  return NextResponse.json({
    success: true,
    queue,
    jobId,
    ...status,
  });
}
