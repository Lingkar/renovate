import got from 'got';
import { DefaultAzureCredential } from '@azure/identity';

import { logger } from '../../../logger';
import { regEx } from '../../../util/regex';

export const acrRegex = regEx(/^(?:https?:\/\/)?([a-zA-Z0-9-]+)\.azurecr\.io/);

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
  scope: string | string[],
): Promise<string | null> {
  logger.info(`CHECK0`);
  const credentials: DefaultAzureCredential = new DefaultAzureCredential();

  logger.info(`CHECKA`);
  try {
    const accessToken = await credentials.getToken(
      'https://containerregistry.azure.net//.default',
    );

    logger.info(
      `CHECKB: access_token ${accessToken.token} \nregistry: ${registry}`,
    );
    const dataACRRefreshToken = await got
      .post(`${registry}/oauth2/exchange`, {
        form: {
          grant_type: 'access_token',
          service: 'jbuicommonregistrydkro.azurecr.io',
          tenant: tenantId,
          access_token: accessToken.token,
        },
      })
      .json<ACRRefreshTokenResponse>();

    logger.info(`CHECKC: refresh_token ${dataACRRefreshToken.refresh_token}`);
    const ACRRefreshToken = dataACRRefreshToken.refresh_token;

    const scopes = Array.isArray(scope) ? scope.join(' ') : scope;

    logger.info(`CHECKKK scopes format: ${scopes}`);

    const dataACRAccessToken = await got
      .post(`${registry}/oauth2/token`, {
        form: {
          grant_type: 'refresh_token',
          service: 'jbuicommonregistrydkro.azurecr.io',
          tenant: tenantId,
          refresh_token: ACRRefreshToken,
          scope: scopes,
        },
      })
      .json<ACRAccessTokenResponse>();

    logger.info(`CHECKD: access_token ${dataACRAccessToken.access_token}`);

    const ACRAccessToken = dataACRAccessToken.access_token;
    return ACRAccessToken;
  } catch (err) {
    logger.trace({ err }, 'err');
    logger.warn('ACR getACRAccessToken error');
  }
  return null;
}
