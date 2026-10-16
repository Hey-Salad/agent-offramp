"""Deploy agent-offramp to Modal (test mode only).

  modal deploy modal_app.py   # REF env selects git commit/branch (default master)
Secrets: 'offramp-env' (STRIPE_SECRET_KEY sk_test_ only, OPENAI_API_KEY, PUBLIC_URL), 'offramp-live' (SALLY_LIVE_VIEW_URL),
'offramp-cognee' (COGNEE_API_KEY, COGNEE_BASE_URL), 'offramp-issuing' (STRIPE_ISSUING_KEY, sk_test_ only).
"""
import os, re, subprocess, modal

REF = os.environ.get("REF", "master")
if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_./-]*", REF):
    raise ValueError("Invalid git ref")
PORT = 3000

image = (
    modal.Image.debian_slim()
    .apt_install("git", "curl", "ca-certificates")
    .env({"AGENT9_BUILD_SHA": REF})
    .run_commands(
        "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
        "apt-get install -y nodejs",
        f"git clone https://github.com/Hey-Salad/agent-offramp.git /app && cd /app && git checkout {REF} && npm ci",
        "cp -r /app/data /app/data-seed",
        force_build=False,
    )
)
vol = modal.Volume.from_name("offramp-data", create_if_missing=True)
app = modal.App("agent-offramp", image=image)


@app.function(secrets=[modal.Secret.from_name("offramp-env"), modal.Secret.from_name("offramp-live"), modal.Secret.from_name("offramp-cognee"), modal.Secret.from_name("offramp-issuing")], volumes={"/vol": vol},
              min_containers=1, max_containers=1, timeout=86400)
@modal.concurrent(max_inputs=100)
@modal.web_server(PORT, startup_timeout=120)
def web():
    key = os.environ.get("STRIPE_SECRET_KEY", "")
    if not key.startswith("sk_test_"):
        raise RuntimeError("Refusing to start: STRIPE_SECRET_KEY must be a Stripe TEST key")
    ik = os.environ.get("STRIPE_ISSUING_KEY", "")
    if ik and not ik.startswith("sk_test_"):
        raise RuntimeError("Refusing to start: STRIPE_ISSUING_KEY must be a Stripe TEST key")
    # Persist data/ on the volume; seed catalog etc. from the repo, never overwrite records.
    os.makedirs("/vol/data", exist_ok=True)
    for f in os.listdir("/app/data-seed"):
        dst = f"/vol/data/{f}"
        if not os.path.exists(dst) or f == "catalog.json":
            subprocess.run(["cp", f"/app/data-seed/{f}", dst], check=True)
    subprocess.run("rm -rf /app/data && ln -s /vol/data /app/data", shell=True, check=True)
    # Periodically commit volume so records.json survives restarts.
    subprocess.Popen(["bash", "-c", "while sleep 30; do sync; done"])
    subprocess.Popen(["npx", "tsx", "src/server.ts"], cwd="/app",
                     env={**os.environ, "PORT": str(PORT)})
