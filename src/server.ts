import * as express from "express";
import router, { runForAllEvents } from './routers/index';
import * as cron from 'cron';

console.log('Starting server...')
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(router);

app.listen(3000, () => {
    console.log('Server started on port 3000');

    // every 2 hours, run the cron job
    const job = new cron.CronJob('0 */2 * * *', async () => {
        runForAllEvents();
    }, null, true, 'America/Chicago');
});
