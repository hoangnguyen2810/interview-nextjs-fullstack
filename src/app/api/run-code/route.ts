import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  const { code, language } = await req.json();

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "code-"));
  const filePath = path.join(tempDir, getFileName(language));

  try {
    await fs.writeFile(filePath, code);

    const cmd = getRunCommand(language, filePath);
    if (!cmd)
      return NextResponse.json(
        { error: "Unsupported language" },
        { status: 400 }
      );

    const { stdout, stderr } = await execAsync(cmd, { timeout: 5000 });

    return NextResponse.json({ output: stdout || stderr });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  } finally {
    // Clean up temp file
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

function getFileName(language: string) {
  switch (language) {
    case "javascript":
      return "main.js";
    case "python":
      return "main.py";
    case "java":
      return "Main.java";
    default:
      return "code.txt";
  }
}

function getRunCommand(language: string, filePath: string) {
  switch (language) {
    case "javascript":
      return `node "${filePath}"`;
    case "python":
      return `python "${filePath}"`;
    case "java": {
      const dir = path.dirname(filePath);
      return `javac "${filePath}" && java -cp "${dir}" Main`;
    }
    default:
      return "";
  }
}
