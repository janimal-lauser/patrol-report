import type { Request, Response, NextFunction } from "express";

// Wrapper fuer async Route-Handler -- faengt Fehler ab und leitet sie an Express weiter
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
