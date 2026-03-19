const cron = require('node-cron');
const { triggerPost } = require('../controllers/postController');

// Schedule for 09:00, 14:00, and 19:00 daily (server local time)
// Cron format: 'second(optional) minute hour day-of-month month day-of-week'
cron.schedule('0 9 * * *', () => {
  console.log('Running scheduled Instagram post (09:00)...');
  triggerPost();
});

cron.schedule('0 14 * * *', () => {
  console.log('Running scheduled Instagram post (14:00)...');
  triggerPost();
});

cron.schedule('0 19 * * *', () => {
  console.log('Running scheduled Instagram post (19:00)...');
  triggerPost();
});

console.log('Cron scheduler initialized for 09:00, 14:00, and 19:00');
