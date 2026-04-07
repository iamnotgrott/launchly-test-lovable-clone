import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";

export async function POST(request: NextRequest) {
  const { command, cwd } = await request.json();

  if (!command || !cwd) {
    return NextResponse.json({ error: "command and cwd are required" }, { status: 400 });
  }

  const [cmd, ...args] = command.split(" ");

  return new Promise<Response>((resolve) => {
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    const writeSSE = async (data: Record<string, unknown>) => {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    };

    const proc = spawn(cmd, args, { cwd, shell: true });

    proc.stdout.on("data", async (data) => {
      await writeSSE({ type: "stdout", data: data.toString() });
    });

    proc.stderr.on("data", async (data) => {
      await writeSSE({ type: "stderr", data: data.toString() });
    });

    proc.on("close", async (code) => {
      await writeSSE({ type: "exit", code });
      try { await writer.close(); } catch {}
    });

    proc.on("error", async (err) => {
      await writeSSE({ type: "error", message: err.message });
      try { await writer.close(); } catch {}
    });

    resolve(new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    }));
  });
}
