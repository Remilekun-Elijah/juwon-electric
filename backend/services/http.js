export const ok = (res, message, data = null, statusCode = 200) =>
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });

export const created = (res, message, data = null) =>
  ok(res, message, data, 201);
