// Vercel serverless entrypoint — imports the Express app from server.js
// without triggering app.listen() (guarded by require.main === module there).
module.exports = require('../server');
