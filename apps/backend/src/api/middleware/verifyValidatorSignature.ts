import { NextFunction, Request, Response } from 'express';
import { verifyMessage } from 'ethers';
import createHttpError from 'http-errors';

export async function verifyValidatorSignature(req: Request, _res: Response, next: NextFunction) {
  const validatorAddress = (req.headers['x-validator-address'] as string | undefined)?.toLowerCase();
  const signature = req.headers['x-validator-signature'] as string | undefined;

  if (!validatorAddress || !signature) {
    return next(createHttpError(401, 'Validator signature is required.'));
  }

  try {
    const message = JSON.stringify(req.body ?? {});
    const recovered = verifyMessage(message, signature).toLowerCase();
    if (recovered !== validatorAddress) {
      return next(createHttpError(401, 'Invalid validator signature.'));
    }
    (req as Request & { validatorAddress: string }).validatorAddress = validatorAddress;
    return next();
  } catch (error) {
    return next(createHttpError(401, 'Unable to verify validator signature.'));
  }
}
