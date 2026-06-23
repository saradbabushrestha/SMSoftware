// Scheduled job: mark abandoned PENDING gateway transactions as FAILED.
// Run on a timer, e.g. every 10 minutes via cron:
//   */10 * * * *  cd /path/to/app && node --env-file=.env --import tsx scripts/expire-transactions.ts
// Optional first arg = age threshold in minutes (default 30).
import { expireStalePaymentTransactions } from "../src/lib/payments/expire";

const minutes = Number(process.argv[2]) || 30;

expireStalePaymentTransactions(minutes)
  .then((n) => {
    console.log(`✓ Expired ${n} stale PENDING transaction(s) older than ${minutes}m.`);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
