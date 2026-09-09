import { handleBookMetadata } from '../server/yes24.mjs';

export default function handler(req, res) {
  return handleBookMetadata(req, res);
}
