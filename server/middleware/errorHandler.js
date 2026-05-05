export function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;
  const publicMessage = statusCode === 500 ? "Something went wrong. Please try again later." : error.message;

  if (statusCode >= 500) {
    console.error("Server error:", error);
  }

  res.status(statusCode).json({
    message: publicMessage,
    details: statusCode >= 500 ? undefined : error.details,
  });
}
