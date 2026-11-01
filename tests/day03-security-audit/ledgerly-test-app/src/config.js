module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: 'ledgerly-dev-secret-2024',
  dbFile: process.env.DB_FILE || 'ledgerly.db',
  uploadDir: require('path').join(__dirname, '..', 'uploads'),
  exportDir: require('path').join(__dirname, '..', 'exports'),
  statusPageUrl: 'https://status.ledgerly.example/api/v2/status.json',
};
