import got from 'got';
import { ClientSecretCredential } from '@azure/identity';

import { logger } from '../../../logger';
import { regEx } from '../../../util/regex';

export const acrRegex = regEx(/^([a-zA-Z0-9]+)\.azurecr\.io$/);

// Define the response type
interface ACRRefreshTokenResponse {
  refresh_token: string;
}
interface ACRAccessTokenResponse {
  access_token: string;
}

// TODO:: Make these inputs compatible with Renovate configs form common.ts
export async function getACRAuthToken(
  tenantId: string,
  registry: string,
  clientId: string,
  clientSecret: string,
): Promise<string | null> {
  const credentials: ClientSecretCredential = new ClientSecretCredential(
    tenantId,
    clientId,
    clientSecret,
  );

  try {
    const accessToken = await credentials.getToken(
      'https://containerregistry.azure.net//.default',
    );
    const dataACRRefreshToken = await got
      .post(`https://${registry}/oauth2/exchange`, {
        form: {
          grant_type: 'access_token',
          service: registry,
          tenant: tenantId,
          access_token: accessToken.token,
        },
      })
      .json<ACRRefreshTokenResponse>();

    const ACRRefreshToken = dataACRRefreshToken.refresh_token;

    // TODO:: We need to define the correct scope which is needed by renovate
    // https://github.com/Azure/acr/blob/main/docs/AAD-OAuth.md#calling-post-oauth2token-to-get-an-acr-access-token
    const dataACRAccessToken = await got
      .post(`https://${registry}/oauth2/token`, {
        form: {
          grant_type: 'refresh_token',
          service: registry,
          tenant: tenantId,
          refresh_token: ACRRefreshToken,
          scope: 'registry:catalog:*',
        },
      })
      .json<ACRAccessTokenResponse>();

    const ACRAccessToken = dataACRAccessToken.access_token;
    return ACRAccessToken;
  } catch (err) {
    logger.trace({ err }, 'err');
    logger.warn('ACR getACRAccessToken error');
  }
  return null;
}
