const refreshTokens = new Map();

export function saveRefreshToken(token, user) {
  refreshTokens.set(token, {
    email: user.email,
    role: user.role,
    createdAt: Date.now(),
  });
}

export function consumeRefreshToken(token) {
  const record = refreshTokens.get(token);
  refreshTokens.delete(token);
  return record || null;
}

export function revokeRefreshToken(token) {
  refreshTokens.delete(token);
}

export function revokeUserRefreshTokens(email) {
  for (const [token, record] of refreshTokens.entries()) {
    if (record.email === email) refreshTokens.delete(token);
  }
}
