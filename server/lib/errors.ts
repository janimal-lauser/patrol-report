// Einheitliche Fehlerklassen fuer alle API-Endpunkte

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Nicht authentifiziert") {
    super(401, "UNAUTHORIZED", message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Keine Berechtigung") {
    super(403, "FORBIDDEN", message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Nicht gefunden") {
    super(404, "NOT_FOUND", message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(message = "Ungueltige Eingabe") {
    super(400, "VALIDATION_ERROR", message);
    this.name = "ValidationError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "Konflikt") {
    super(409, "CONFLICT", message);
    this.name = "ConflictError";
  }
}
