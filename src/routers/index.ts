// express rotuer
import * as express from 'express';
import { getAllEventIds, getOpenProps } from '../action/fanduel';
import { getPropHelperData, getPropHelperDataMany } from '../action/historical';

const defaultNBAStats = [
    {
        "name": "PTS",
        "targets": [
            10,
            15,
            20,
            25,
            30,
            35,
            40
        ]
    },
    {
        "name": "REB",
        "targets": [
            4,
            6,
            8,
            10,
            12
        ]
    },
    {
        "name": "AST",
        "targets": [
            2,
            4,
            6,
            8,
            10,
            12
        ]
    },
    {
        "name": "FG3M",
        "targets": [
            1,
            2,
            3,
            4,
            5,
            6
        ]
    }
];

const router = express.Router();

router.post('/historical/:playerId', async (req, res) => {
    const { playerId } = req.params;
    const { stat, value, opponentId, numberOfGames } = req.body;
    const data = await getPropHelperData(playerId, opponentId, stat, value, numberOfGames);
    res.json(
        data
    );
});

interface PlayerStatMany {
    eventIds: string[];
    stats: any;
}

router.get('/runForAllEvents', async (req, res) => {
    await runForAllEvents();
    res.status(200).json({
        status: 'OK',
        message: 'Written results to files.'
    })
});

export const runForAllEvents = async () => {
    const eventIds = await getAllEventIds();
    for (let i = 0; i < eventIds.length; i++) {
        const eventId = eventIds[i];
        await getPropHelperDataMany(eventId, defaultNBAStats);
    }
}

router.post('/runForSpecificEvent', async (req, res) => {
    const { eventIds, stats } = req.body as PlayerStatMany;

    for (let i = 0; i < eventIds.length; i++) {
        const eventId = eventIds[i];
        await getPropHelperDataMany(eventId, stats);
    }

    res.status(200).json({
        status: 'OK',
        message: 'Written results to files.'
    })
});

export default router;