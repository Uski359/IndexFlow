import createHttpError from 'http-errors';

import {
  AdminSettings
} from '../types/protocol.js';
import {
  UpdateParametersInput,
  getAdminSettings,
  updateOracleEndpoint,
  updateProtocolParameters
} from '../repositories/settingsRepository.js';

export async function fetchAdminSettings(): Promise<AdminSettings> {
  return getAdminSettings();
}

export async function updateAdminParameters(input: UpdateParametersInput): Promise<AdminSettings> {
  if (input.baseReward <= 0) {
    throw createHttpError(400, 'Base reward must be greater than zero');
  }
  if (input.challengeBond < 0) {
    throw createHttpError(400, 'Challenge bond cannot be negative');
  }
  if (input.validatorQuorum < 0 || input.validatorQuorum > 1) {
    throw createHttpError(400, 'Validator quorum must be between 0 and 1');
  }
  if (input.slashPercentage < 0 || input.slashPercentage > 1) {
    throw createHttpError(400, 'Slash percentage must be between 0 and 1');
  }

  return updateProtocolParameters(input);
}

export async function updateAdminOracle(url: string): Promise<AdminSettings> {
  if (!/^https?:\/\//i.test(url)) {
    throw createHttpError(400, 'Oracle endpoint must be a valid URL');
  }
  return updateOracleEndpoint(url);
}
