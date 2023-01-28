import axios from 'axios';
import { getPlayerIdByName } from './players';
import * as fs from 'fs';
import { getOpenProps } from './fanduel';

const statUrl = `https://stats.nba.com/stats/playergamelogs?DateFrom=&DateTo=&GameSegment=&LastNGames=0&LeagueID=00&Location=&MeasureType=Base&Month=0&OppTeamID=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=Totals&Period=0&PlayerID=%playerId%&PlusMinus=N&Rank=N&Season=2022-23&SeasonSegment=&SeasonType=Regular%20Season&ShotClockRange=&TeamID=&VsConference=&VsDivision=`;

interface StatsResponse {
    playerId: string;
    cachedAt: Date;
    response: any;
}

const cachedResponses: StatsResponse[] = [];
let lastRequestTime = new Date();

const getStats = async (playerId: string) => {
    const cachedStat = cachedResponses.find(stat => stat.playerId === playerId);
    if (cachedStat) {
        const now = new Date();
        const diff = now.getTime() - cachedStat.cachedAt.getTime();
        // 1 hour
        if (diff < 3600000) {
            return cachedStat.response;
        } else {
            cachedResponses.splice(cachedResponses.indexOf(cachedStat), 1);
        }
    }

    // 1 request per 2 seconds
    const now = new Date();
    const delay = now.getTime() - lastRequestTime.getTime();
    const waitTime = 2000;
    if (delay < waitTime) {
        const secondsWait = Math.round((waitTime - delay) / 1000);
        console.log(`Waiting ${secondsWait} seconds before making request to stats.nba.com`);
        await new Promise(resolve => setTimeout(resolve, waitTime - delay));
    }
    lastRequestTime = new Date();


    console.log('Making request to stats.nba.com for player', playerId);
    const startTime = new Date();
    const url = statUrl.replace('%playerId%', playerId);
    let response;

    try {
        response = await axios.get(url, {
            headers: {
                'Referer': 'https://stats.nba.com/',
                'x-nba-stats-origin': 'stats',
                'x-nba-stats-token': 'true'
            }
        });
    } catch (e) {
        console.log('Error making request to stats.nba.com', e);
        // we should retry this request in 30 seconds
        await new Promise(resolve => setTimeout(resolve, 30000));
        return getStats(playerId);
    }

    const endTime = new Date();
    const diff = endTime.getTime() - startTime.getTime();
    console.log('Request to stats.nba.com took', diff, 'ms');
    const { data } = response;
    cachedResponses.push({
        playerId,
        cachedAt: new Date(),
        response: data
    });
    return data;
}

const getStatsForPlayer = async (playerId: string, stat: string) => {
    const cachedResponse = await getStats(playerId);
    const { resultSets } = cachedResponse;
    const { headers, rowSet } = resultSets[0];
    const indexOfHeader = headers.findIndex(header => header === stat);

    const stats: any[] = [];
    for (let i = 0; i < rowSet.length; i++) {
        const row = rowSet[i];
        const value = row[indexOfHeader];
        stats.push(value);
    }
    return stats;
}

const getTimesHitStat = async (playerId: string, statName: string, targetValue: number, numberOfGames: number) => {
    const stat = await getStatsForPlayer(playerId, statName);

    let timesHit = 0;
    let timesMissed = 0;
    for (let i = 0; i < stat.length && i < numberOfGames; i++) {
        const value = stat[i];
        if (value >= targetValue) {
            timesHit++;
        } else {
            timesMissed++;
        }
    }

    return { timesHit, timesMissed, total: timesHit + timesMissed };
}

const getPropHelperData = async (playerId: string, opponentId: string, stat: string, targetValue: number, numberOfGames: number) => {
    const timesHitStat = await getTimesHitStat(playerId, stat, targetValue, numberOfGames);
    return { timesHitStat };
}

interface Stats {
    name: string;
    targets: number[];
}

// shit code below
const getPropHelperDataMany = async (eventId: string, stats: any) => {
    const propsData = await getOpenProps(eventId);
    if (!propsData) {
        console.log('No props data found for', eventId);
        return;
    }
    const { eventName, markets } = propsData;

    const namesAndIds = [];
    for (let i = 0; i < markets.length; i++) {
        const playerName = markets[i];
        try {
            const id = getPlayerIdByName(playerName);
            namesAndIds.push({ playerName, id });
        } catch (error) {
            console.log('error getting id for', playerName);
        }
    }

    for (let numberOfGames = 15; numberOfGames <= 15; numberOfGames += 5) {
        for (let i = 0; i < stats.length; i++) {
            const stat = stats[i];
            const { name, targets } = stat;
            for (let j = 0; j < targets.length; j++) {
                const target = targets[j];
                for (let k = 0; k < namesAndIds.length; k++) {
                    const nameAndId = namesAndIds[k];
                    const { playerName, id } = nameAndId;
                    const timesHitStat = await getTimesHitStat(id, name, target, numberOfGames);
                    if (!nameAndId.stats) {
                        nameAndId.stats = {};
                    }
                    if (!nameAndId.stats[name]) {
                        nameAndId.stats[name] = [];
                    };
                    const numOfHits = timesHitStat.timesHit;
                    const percent = numOfHits / (numberOfGames + 0.0);
                    if (percent > 0.70) {
                        nameAndId.stats[name].push({ target, timesHitStat });
                    }
                }
            }
        }
    }

    const location = "C:/Users/zharv/iCloudDrive/NBA";
    const dateString = new Date().toLocaleDateString().replace(/\//g, '-');

    // create directory if it doesn't exist
    if (!fs.existsSync(location)) {
        fs.mkdirSync(location);
    }

    if (!fs.existsSync(location + '/' + dateString)) {
        fs.mkdirSync(location + '/' + dateString);
    }

    if (namesAndIds.length === 0) {
        console.log('No names and ids found for', eventId);
        return;
    }

    const fileName = `${location}/${dateString}/${eventName}-${dateString}.txt`;
    const file = fs.createWriteStream(fileName);
    file.write(`${eventName} - ${dateString}\n\n`)

    const data = {}; // player: { targets: [ { target, timesHitStat } ]
    for (let i = 0; i < namesAndIds.length; i++) {
        const player = namesAndIds[i];
        const { playerName, stats } = player;

        // make sure an array of each stat exists
        const keys = Object.keys(stats);
        for (let j = 0; j < keys.length; j++) {
            const key = keys[j];
            if (!data[playerName]) { // make sure player is in the data object
                data[playerName] = {};
            }

            if (!data[playerName][key]) { // make sure the stat is in the player object
                data[playerName][key] = [];
            }

            const statData = stats[key];
            for (let k = 0; k < statData.length; k++) {
                const stat = statData[k];
                data[playerName][key].push(stat);
            }
        }
    }


    const keys = Object.keys(data);
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        file.write(`${key}\n`);
        const playerData = data[key];
        const statKeys = Object.keys(playerData);
        for (let j = 0; j < statKeys.length; j++) {
            const statKey = statKeys[j];
            const statData = playerData[statKey];
            let average = 0;
            let countedStats = 0;
            for (let k = 0; k < statData.length; k++) {
                const stat = statData[k];
                const { target, timesHitStat } = stat;
                const { timesHit, timesMissed, total } = timesHitStat;
                if (timesHit === 0 || timesMissed === 0) {
                    continue;
                }
                const percent = (timesHit / (total + 0.0));
                const percentString = (percent * 100.0).toFixed(2);
                average += percent;
                countedStats++;
                file.write(`    ${statKey} >= ${target} in ${total} games: ${timesHit} / ${total} = ${percentString}%\n`);
            }
            if (average === 0) {
                continue;
            }
            average /= countedStats;
            const averageString = (average * 100.0).toFixed(2);
            console.log(`    Average: ${averageString}%`);
            file.write(`    Average: ${averageString}%\n`);
            file.write('\n');
        }
        file.write('\n');
    }

    file.end();

    return namesAndIds;
}

export { getPropHelperData, getPropHelperDataMany };
