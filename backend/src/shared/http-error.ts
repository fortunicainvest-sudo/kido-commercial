export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export const badRequest = (msg: string) => new HttpError(400, msg);
export const unauthorized = (msg = "Connecte-toi pour faire ça.") => new HttpError(401, msg);
export const forbidden = (msg = "Tu n'as pas le droit de faire ça.") => new HttpError(403, msg);
export const notFound = (msg = "Introuvable.") => new HttpError(404, msg);
