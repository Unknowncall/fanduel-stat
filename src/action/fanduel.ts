
import axios from "axios"

export const getAllEventIds = async () => {
    const url = `https://ips.sportsbook.fanduel.com/stats/eventIds`;
    const response = await axios.get(url);
    const { data } = response;
    console.log('data', data)
    return data;
}

export const getOpenProps = async (eventId: string) => {
    const fanDuelURL = `https://sbapi.il.sportsbook.fanduel.com/api/event-page?betexRegion=GBR&capiJurisdiction=intl&currencyCode=USD&exchangeLocale=en_US&includePrices=true&language=en&priceHistory=1&regionCode=NAMERICA&_ak=FhMFpcPWXMeyZxOx&eventId=%event_id%&tab=player-points`;
    const url = fanDuelURL.replace('%event_id%', eventId);
    const response = await axios.get(url);
    const { data } = response;

    if (!data.attachments) {
        return null;
    }

    if (!data.attachments.events) {
        return null;
    }

    if (!data.attachments.events[eventId]) {
        return null;
    }

    const { name } = data.attachments.events[eventId];
    const { markets } = data.attachments;
    const keys = Object.keys(markets);

    // Santi Aldama - Points, we need to split on the dash and take the first part than trim
    const marketNames = keys.map(key => {
        const market = markets[key];
        const { marketName } = market;
        const split = marketName.split('-');
        return split[0].trim();
    });

    // ensure distinct, remove duplicates
    const distinct = marketNames.filter((value, index, self) => {
        return self.indexOf(value) === index;
    });

    return { eventName: name, markets: distinct };
}