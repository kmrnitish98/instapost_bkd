const cron = require('node-cron');
const { triggerPost } = require('../controllers/postController');

// ============================================================
// 🧪 TESTING MODE — runs every 5 minutes
// TODO: Remove this block and uncomment the PRODUCTION block below when done testing
// ============================================================
cron.schedule('*/5 * * * *', () => {
  console.log('🧪 [TEST] Running scheduled Instagram post (every 5 min)...');
  triggerPost();
});

console.log('🧪 [TEST] Cron scheduler initialized — firing every 5 minutes');

// ============================================================
// 🚀 PRODUCTION — uncomment this block and remove the TEST block above when done
// ============================================================
// cron.schedule('0 9 * * *', () => {
//   console.log('Running scheduled Instagram post (09:00)...');
//   triggerPost();
// });

// cron.schedule('0 14 * * *', () => {
//   console.log('Running scheduled Instagram post (14:00)...');
//   triggerPost();
// });

// cron.schedule('0 19 * * *', () => {
//   console.log('Running scheduled Instagram post (19:00)...');
//   triggerPost();
// });

// console.log('Cron scheduler initialized for 09:00, 14:00, and 19:00');
