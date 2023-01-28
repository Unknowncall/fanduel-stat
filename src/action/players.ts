import players from '../static/players';

export const getPlayerIdByName = (name: string) => {
    // find where name is like or equal to name is in 3rd index
    const player = players.find(player => {
        const playerName = player[3] as string;
        return playerName.toLowerCase() === name.toLowerCase();
    });
    if (!player) {
        throw new Error(`Player not found: ${name}`);
    }
    // the id is in the 0th index
    return player[0];
}