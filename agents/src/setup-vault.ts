/**
 * VAULT SETUP — Create a vault with GitHub MCP OAuth credentials
 *
 * This enables the Code Assistant agent to create PRs via GitHub MCP.
 * Run once after the initial setup.
 *
 * Prerequisites:
 *   - GitHub OAuth App credentials (client_id, client_secret)
 *   - An OAuth access_token + refresh_token for your GitHub account
 *
 * Usage: npx tsx src/setup-vault.ts
 *
 * For GitHub MCP OAuth tokens, you'll need to:
 *   1. Create a GitHub OAuth App at https://github.com/settings/developers
 *   2. Use the OAuth flow to get access_token + refresh_token
 *   3. Pass them to this script via environment variables
 */

import { getClient } from "./client.js";
import { loadEnv, saveToEnv } from "./config.js";

loadEnv();
const client = getClient();

async function main() {
  console.log("=== H-4 Vault Setup — GitHub MCP Credentials ===\n");

  const githubAccessToken = process.env.GITHUB_MCP_ACCESS_TOKEN;
  const githubRefreshToken = process.env.GITHUB_MCP_REFRESH_TOKEN;
  const githubClientId = process.env.GITHUB_MCP_CLIENT_ID;
  const githubClientSecret = process.env.GITHUB_MCP_CLIENT_SECRET;

  if (!githubAccessToken || !githubClientId) {
    console.log("To set up GitHub MCP vault credentials, add these to your .env:\n");
    console.log("  GITHUB_MCP_ACCESS_TOKEN=gho_...");
    console.log("  GITHUB_MCP_REFRESH_TOKEN=ghr_...");
    console.log("  GITHUB_MCP_CLIENT_ID=your-oauth-app-client-id");
    console.log("  GITHUB_MCP_CLIENT_SECRET=your-oauth-app-client-secret\n");
    console.log("Then re-run: npx tsx src/setup-vault.ts");
    console.log("\nSee: https://platform.claude.com/docs/en/managed-agents/vaults");
    process.exit(1);
  }

  // 1. Create the vault
  console.log("1. Creating vault...");
  const vault = await client.beta.vaults.create({
    name: "h4-github-mcp",
  });
  saveToEnv("VAULT_ID_GITHUB", vault.id);
  console.log(`   Vault created: ${vault.id}\n`);

  // 2. Add GitHub MCP OAuth credential
  console.log("2. Adding GitHub MCP credential...");

  const credentialAuth: Record<string, unknown> = {
    type: "mcp_oauth",
    mcp_server_url: "https://api.githubcopilot.com/mcp/",
    access_token: githubAccessToken,
  };

  // Add refresh config if refresh token is available
  if (githubRefreshToken) {
    credentialAuth.refresh = {
      refresh_token: githubRefreshToken,
      client_id: githubClientId,
      token_endpoint: "https://github.com/login/oauth/access_token",
      token_endpoint_auth: githubClientSecret
        ? { type: "client_secret_post", client_secret: githubClientSecret }
        : { type: "none" },
    };
  }

  await client.beta.vaults.credentials.create(vault.id, {
    display_name: "GitHub MCP (H-4 Strategic Solutions)",
    auth: credentialAuth as any,
  });
  console.log("   Credential added.\n");

  console.log("=== Vault Setup Complete ===");
  console.log(`\nVault ID saved to .env: ${vault.id}`);
  console.log("\nThe Code Assistant agent will now use this vault for GitHub MCP auth.");
  console.log("Update code-assistant.ts to pass vault_ids: [process.env.VAULT_ID_GITHUB]");
}

main().catch((err) => {
  console.error("Vault setup failed:", err.message);
  process.exit(1);
});
