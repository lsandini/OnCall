import { Router, Request, Response } from 'express';
import { randomUUID, randomBytes, createHash } from 'crypto';
import * as msal from '@azure/msal-node';

declare module 'express-session' {
  interface SessionData {
    user: { name: string; email: string; oid: string };
    csrfToken: string;
    pkceVerifier: string;
  }
}

function generatePkceCodes() {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export function createAuthRouter() {
  const router = Router();

  const clientId = process.env.AZURE_CLIENT_ID || '';
  const clientSecret = process.env.AZURE_CLIENT_SECRET || '';
  const redirectUri = process.env.REDIRECT_URI || 'http://localhost:3001/api/auth/callback';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  // Use 'common' to accept any Microsoft account (personal + organizational)
  // Use 'organizations' for org accounts only, or a specific tenant ID for a single org
  const tenantId = process.env.AZURE_TENANT_ID || 'common';

  const msalConfig: msal.Configuration = {
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      clientSecret,
    },
  };

  const cca = new msal.ConfidentialClientApplication(msalConfig);

  // GET /login — generate CSRF token + PKCE codes, redirect to Microsoft login
  router.get('/login', async (req: Request, res: Response) => {
    try {
      const csrfToken = randomUUID();
      const { verifier, challenge } = generatePkceCodes();

      req.session.csrfToken = csrfToken;
      req.session.pkceVerifier = verifier;

      const state = Buffer.from(JSON.stringify({ csrfToken })).toString('base64url');

      const authUrl = await cca.getAuthCodeUrl({
        scopes: ['user.read'],
        redirectUri,
        state,
        codeChallenge: challenge,
        codeChallengeMethod: 'S256',
        prompt: 'select_account',
      });
      res.redirect(authUrl);
    } catch (err) {
      console.error('MSAL getAuthCodeUrl error:', err);
      res.redirect(`${frontendUrl}/welcome?error=login_failed`);
    }
  });

  // GET /callback — validate state, exchange code for tokens with PKCE verifier
  router.get('/callback', async (req: Request, res: Response) => {
    // Check for Azure AD error response
    if (req.query.error) {
      console.error('Azure AD error:', req.query.error, req.query.error_description);
      return res.redirect(`${frontendUrl}/welcome?error=auth_failed`);
    }

    const code = req.query.code as string | undefined;
    if (!code) {
      return res.redirect(`${frontendUrl}/welcome`);
    }

    // Validate CSRF state
    const stateParam = req.query.state as string | undefined;
    if (!stateParam || !req.session.csrfToken) {
      return res.redirect(`${frontendUrl}/welcome?error=auth_failed`);
    }

    try {
      const state = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
      if (state.csrfToken !== req.session.csrfToken) {
        console.error('CSRF token mismatch');
        return res.redirect(`${frontendUrl}/welcome?error=auth_failed`);
      }
    } catch {
      console.error('Failed to parse state parameter');
      return res.redirect(`${frontendUrl}/welcome?error=auth_failed`);
    }

    const pkceVerifier = req.session.pkceVerifier;

    try {
      const result = await cca.acquireTokenByCode({
        code,
        scopes: ['user.read'],
        redirectUri,
        codeVerifier: pkceVerifier,
      });

      const claims = result.idTokenClaims as Record<string, unknown>;

      // Clean up auth artifacts, store only user info
      delete req.session.csrfToken;
      delete req.session.pkceVerifier;

      req.session.user = {
        name: (claims.name as string) || 'Unknown',
        email: (claims.preferred_username as string) || (claims.email as string) || '',
        oid: (claims.oid as string) || '',
      };

      res.redirect(`${frontendUrl}/auth/success`);
    } catch (err) {
      console.error('MSAL acquireTokenByCode error:', err);
      res.redirect(`${frontendUrl}/welcome?error=auth_failed`);
    }
  });

  // GET /status — return session info
  router.get('/status', (req: Request, res: Response) => {
    if (req.session.user) {
      res.json({ authenticated: true, user: req.session.user });
    } else {
      res.json({ authenticated: false, user: null });
    }
  });

  // GET /logout — destroy session and redirect to welcome
  router.get('/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
      }
      res.redirect(`${frontendUrl}/welcome`);
    });
  });

  return router;
}
