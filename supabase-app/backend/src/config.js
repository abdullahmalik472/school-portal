module.exports = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET,
  adminCodes: (process.env.ADMIN_CODES || '').split(',').filter(Boolean),
}
