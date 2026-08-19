import { Sandbox } from "@vercel/sandbox";

const sandbox = await Sandbox.create({ runtime: "node24", timeout: 300_000 });
try {
  const install = await sandbox.runCommand("bash", ["-lc", [
    "set -euo pipefail",
    "sudo dnf install -y python3 python3-pip bubblewrap socat",
    "sudo python3 -m venv /opt/openharness",
    "sudo /opt/openharness/bin/pip install --no-cache-dir openharness-ai==0.1.9",
    "sudo mkdir -p /vercel/sandbox/workspace /vercel/sandbox/home",
    "sudo chown -R vercel-sandbox:vercel-sandbox /vercel/sandbox/workspace /vercel/sandbox/home",
    "/opt/openharness/bin/openharness --version",
  ].join(" && ")], { timeoutMs: 240_000 });
  if (install.exitCode !== 0) throw new Error("Falha ao instalar OpenHarness no Sandbox.");
  const snapshot = await sandbox.snapshot({ expiration: 0 });
  process.stdout.write(`${snapshot.snapshotId}\n`);
} catch (error) {
  await sandbox.stop().catch(() => undefined);
  throw error;
}
