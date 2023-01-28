import json
# import the data.py file
import data

# convert to json
players_json = json.dumps(data.players)
teams_json = json.dumps(data.teams)

print('JSONs have been dumped!')

# write to file
with open('players.json', 'w') as f:
    f.write(players_json)

with open('teams.json', 'w') as f:
    f.write(teams_json)

print('JSONs have been written to file!')

# https://github.com/swar/nba_api/blob/8ffc707b624fc384f5fef73025999987126c876b/src/nba_api/stats/library/data.py#L9