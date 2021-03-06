import { array, flatten } from "fp-ts/lib/Array";
import { Eq, eqString } from "fp-ts/lib/Eq";
import { tuple } from "fp-ts/lib/function";
import { ordString } from "fp-ts/lib/Ord";
import * as fpSet from "fp-ts/lib/Set";
import { insert, remove, toArray } from "fp-ts/lib/Set";
import _ from "lodash";
import * as React from "react";
import Plot from "react-plotly.js";
import { Card, Divider, Form, Grid, Header, Segment, Table } from "semantic-ui-react";
import { countPlacements, deckStatistics } from "../analysis";
import { MagicData } from "../data";

export const trunc = (n: number, to: number): string => (Math.round(n * 10 ** to) / 10 ** to).toFixed(to);

export function subsets<T>(eq: Eq<T>, set: Set<T>, min: number = 1): Array<Set<T>> {
  if (set.size < min) {
    return [set];
  } else {
    const fst = set.values().next().value as T;
    const other = subsets(eq, remove(eq)(fst)(set));
    return array.chain(other, (set) => [insert(eq)(fst)(set), set]);
  }
}

const colors = {
  green: "limegreen",
  white: "cornsilk",
  blue: "darkblue",
  red: "firebrick",
  black: "#0a0a0c",
};

export const deckData = {
  azorius: { colors: [colors.blue, colors.white], path: require("../../guilds/azorius.jpg") },
  dimir: { colors: [colors.blue, colors.black], path: require("../../guilds/dimir.jpg") },
  simic: { colors: [colors.blue, colors.green], path: require("../../guilds/simic.jpg") },
  izzet: { colors: [colors.blue, colors.red], path: require("../../guilds/izzet.jpg") },
  eggs: { colors: [colors.red, colors.white], path: require("../../guilds/boros.jpg") },
  gruul: { colors: [colors.red, colors.green], path: require("../../guilds/gruul.jpg") },
  rakdos: { colors: [colors.red, colors.black], path: require("../../guilds/rakdos.jpg") },
  golgari: { colors: [colors.black, colors.green], path: require("../../guilds/golgari.jpg") },
  orzhov: { colors: [colors.black, colors.white], path: require("../../guilds/orzhov.jpg") },
  selesnya: { colors: [colors.green, colors.white], path: require("../../guilds/selesnya.jpg") },
} as const;

export const Overflow = ({ children }) => {
  return <div style={{ overflowX: "auto", width: "100%" }}>{children}</div>;
};

export const PlacementStatistics = ({
  stats,
  decks,
  players,
}: {
  stats: [
    string,
    {
      overallDeviation: number;
      overallMean: number;
      stats: { deck: string; averagePlacement: number; frequency: number; deviation: number }[];
    }
  ][];
  decks: string[];
  players: string[];
}) => {
  const ordered = players.map((x) => stats.find((y) => y[0] === x));
  return (
    <Table celled compact inverted striped textAlign="center" unstackable>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell width="1">Group</Table.HeaderCell>
          <Table.HeaderCell width="1"></Table.HeaderCell>
          <Table.HeaderCell width="1">Overall</Table.HeaderCell>
          {decks.map((deck, i) => (
            <Table.HeaderCell key={i}>{deck}</Table.HeaderCell>
          ))}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {ordered
          .filter((p) => players.includes(p[0]))
          .map(([person, { stats: stat, overallDeviation, overallMean }], i) => {
            const ordered = decks.map((deck) => stat.find((x) => x.deck === deck));
            return (
              <React.Fragment key={i}>
                <Table.Row>
                  <Table.Cell collapsing rowSpan={2}>
                    {_.capitalize(person).trim()}
                  </Table.Cell>
                  <Table.Cell collapsing>μ</Table.Cell>
                  <Table.Cell collapsing>{trunc(overallMean, 2)}</Table.Cell>
                  {ordered.map((topDeck, i) => (
                    <Table.Cell key={i}>{topDeck === undefined ? "—" : trunc(topDeck.averagePlacement, 2)}</Table.Cell>
                  ))}
                </Table.Row>
                <Table.Row>
                  <Table.Cell collapsing>s</Table.Cell>
                  <Table.Cell collapsing>{trunc(overallDeviation, 2)}</Table.Cell>
                  {ordered.map((topDeck, i) => (
                    <Table.Cell collapsing key={i}>
                      {topDeck === undefined ? "—" : trunc(topDeck.deviation, 1)}
                    </Table.Cell>
                  ))}
                </Table.Row>
              </React.Fragment>
            );
          })}
      </Table.Body>
    </Table>
  );
};

export const DeckSummary = ({
  magicData,
  deckSummary,
}: {
  magicData: MagicData;
  deckSummary: {
    deck: string;
    timesPlayed: number;
    playedBy: {
      player: string;
      count: number;
    }[];
  }[];
}) => {
  const playedSubsets = fpSet.fromArray(fpSet.getEq(eqString))(
    flatten(magicData.games.map((game) => subsets(eqString, new Set(_.keys(game.decks)), 3)))
  );

  const possibleSubsets = fpSet.fromArray(fpSet.getEq(eqString))(
    subsets(eqString, new Set(magicData.decks), 3).filter((x) => x.size <= 3)
  );

  const difference = fpSet.difference(fpSet.getEq(eqString))(possibleSubsets, playedSubsets);
  const unplayed = fpSet.filter((x: Set<string>) => x.size <= 5)(difference);

  const couples = Array.from(fpSet.filter((x: Set<string>) => x.size === 3)(unplayed));

  return (
    <React.Fragment>
      <Card.Group centered doubling itemsPerRow={5}>
        {deckSummary.map((deck, i) => {
          const [fst, snd] = deckData[deck.deck.trim().toLowerCase() as keyof typeof magicData.decks].colors;
          return (
            <Card key={i} color="black">
              <div
                style={{
                  background: `linear-gradient(to right, ${fst} 0%, ${fst} 50%, ${snd} 50%, ${snd} 100%)`,
                  height: "10px",
                }}
              ></div>
              <Card.Content>
                <Card.Header>{deck.deck.toLowerCase() === "eggs" ? "🥚🥚🥚" : deck.deck}</Card.Header>
                <Card.Meta>Played {deck.timesPlayed} times</Card.Meta>
                <Card.Description>
                  {(function () {
                    const unplayedBy = magicData.players.filter(
                      (player) => !deck.playedBy.map((x) => x.player).includes(player)
                    );
                    if (unplayedBy.length === 0) return "";
                    return (
                      <>
                        Has not been played by:{" "}
                        {unplayedBy.reduce(
                          (acc, x, i) => (
                            <span>
                              <strong>
                                <i>{_.capitalize(x)}</i>
                              </strong>
                              {i !== 0 ? ", " : ""} {acc}
                            </span>
                          ),
                          <span></span>
                        )}
                      </>
                    );
                  })()}
                </Card.Description>
              </Card.Content>
            </Card>
          );
        })}
      </Card.Group>
      <Segment textAlign="center">
        <Overflow>
          <Plot
            data={[{ type: "bar", x: deckSummary.map((x) => x.deck), y: deckSummary.map((y) => y.timesPlayed) }]}
            layout={{ title: "Usage per deck" }}
            config={{ responsive: false }}
          />
        </Overflow>
      </Segment>
      <Segment>
        <Header size="medium">Unplayed Combinations</Header>
        {couples.map((each, i) => (
          <div key={i}>{Array.from(each).join(", ")}</div>
        ))}
      </Segment>
    </React.Fragment>
  );
};

export const WinRates: React.FunctionComponent<{
  magicData: MagicData;
  unweighted?: boolean;
  decks: string[];
  players: string[];
}> = ({ magicData, unweighted = false, decks, players }) => {
  const pdata = players.map((x) => magicData.players.find((y) => y === x));
  const results = pdata.map((player) => {
    const overallGames = countPlacements(magicData, [player], magicData.decks, [
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
      [5, 1],
    ]);
    const overallWins = countPlacements(
      magicData,
      [player],
      magicData.decks,
      unweighted
        ? [[1, 1]]
        : [
            [1, 0.8],
            [2, 0.15],
            [3, 0.05],
          ]
    );
    const overallLosses = overallGames - overallWins;

    console.log(player, overallGames, overallWins, overallLosses);
    return decks.map((deck) => {
      const playerTotal = countPlacements(
        magicData,
        [player],
        [deck],
        [
          [1, 1],
          [2, 1],
          [3, 1],
          [4, 1],
          [5, 1],
        ]
      );
      const wins = countPlacements(
        magicData,
        [player],
        [deck],
        unweighted
          ? [[1, 1]]
          : [
              [1, 0.8],
              [2, 0.15],
              [3, 0.05],
            ]
      );
      const losses = playerTotal - wins;
      return {
        player,
        overallWinRate: overallWins / (overallGames || 1),
        overallLossRate: overallLosses / (overallGames || 1),
        deck,
        wins,
        losses,
        winRate: wins / (playerTotal || 1),
        lossRate: losses / (playerTotal || 1),
        noData: wins === losses && losses === 0,
      };
    });
  });

  return (
    <Table celled compact inverted striped unstackable textAlign="center">
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell width="1">Player</Table.HeaderCell>
          <Table.HeaderCell width="1"></Table.HeaderCell>
          <Table.HeaderCell width="1">Overall</Table.HeaderCell>
          {decks.map((deck, i) => (
            <Table.HeaderCell key={i}>{deck}</Table.HeaderCell>
          ))}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {results.map((personalStats, i) => {
          const person = personalStats[0]?.player ?? "—";
          const ordered = decks.map((deck) => personalStats.find((x) => x.deck === deck));
          return (
            <React.Fragment key={i}>
              <Table.Row>
                <Table.Cell collapsing rowSpan={2}>
                  {_.capitalize(person).trim()}
                </Table.Cell>
                <Table.Cell collapsing>Win %</Table.Cell>
                <Table.Cell collapsing>
                  {ordered[0]?.overallWinRate === undefined ? "—" : trunc(ordered[0]?.overallWinRate, 2)}
                </Table.Cell>
                {ordered.map((deckRate, i) => (
                  <Table.Cell collapsing key={i}>
                    {deckRate === undefined || deckRate.noData ? "—" : trunc(deckRate.winRate, 2)}
                  </Table.Cell>
                ))}
              </Table.Row>
              <Table.Row>
                <Table.Cell collapsing>Loss %</Table.Cell>
                <Table.Cell collapsing>
                  {ordered[0]?.overallLossRate === undefined ? "—" : trunc(ordered[0]?.overallLossRate, 2)}
                </Table.Cell>
                {ordered.map((deckRate, i) => (
                  <Table.Cell collapsing key={i}>
                    {deckRate === undefined || deckRate.noData ? "—" : trunc(deckRate.lossRate, 2)}
                  </Table.Cell>
                ))}
              </Table.Row>
            </React.Fragment>
          );
        })}
      </Table.Body>
    </Table>
  );
};

export const Analysis: React.FunctionComponent<{ magicData: MagicData }> = ({ magicData }) => {
  const top = deckStatistics(magicData, magicData.players);
  const playerDeckStats = magicData.players.map((player) => tuple(player, deckStatistics(magicData, [player])));

  const [parameters, setParameters] = React.useState({ players: new Set([]), decks: new Set([]) });
  React.useEffect(() => {
    setParameters({
      players: new Set(magicData.players),
      decks: new Set(magicData.decks),
    });
  }, [magicData]);

  const playerArr = toArray(ordString)(parameters.players);
  const deckArr = toArray(ordString)(parameters.decks);

  return (
    <>
      <Header size="huge">Statistics</Header>
      <Segment compact padded>
        <Header size="large">Select Parameters</Header>
        <Divider />
        <Divider hidden />
        <Grid>
          <Form.Group grouped>
            {magicData.players.map((player, i) => {
              return (
                <Form.Checkbox
                  key={i}
                  defaultChecked
                  onChange={(e, p) => {
                    setParameters({
                      ...parameters,
                      players: p.checked
                        ? insert(eqString)(player)(parameters.players)
                        : remove(eqString)(player)(parameters.players),
                    });
                  }}
                  type="checkbox"
                  label={player}
                ></Form.Checkbox>
              );
            })}
          </Form.Group>
          <Form.Group grouped>
            {magicData.decks.map((deck, i) => {
              return (
                <Form.Checkbox
                  key={i}
                  defaultChecked
                  type="checkbox"
                  onChange={(e, p) => {
                    setParameters({
                      ...parameters,
                      decks: p.checked
                        ? insert(eqString)(deck)(parameters.decks)
                        : remove(eqString)(deck)(parameters.decks),
                    });
                  }}
                  label={deck}
                ></Form.Checkbox>
              );
            })}
          </Form.Group>
        </Grid>
      </Segment>
      <Header size="large">Deck Placement Statistics</Header>
      <Overflow>
        <PlacementStatistics
          stats={[["Overall", top], ...playerDeckStats]}
          decks={deckArr}
          players={["Overall", ...playerArr]}
        />
      </Overflow>
      <Header size="large">
        Player Win Rates
        <Header.Subheader>Unweighted</Header.Subheader>
      </Header>
      <Overflow>
        <WinRates magicData={magicData} unweighted decks={deckArr} players={playerArr} />
      </Overflow>
      <Header size="large">
        <Header.Subheader>Weighted</Header.Subheader>
      </Header>
      <Overflow>
        <WinRates magicData={magicData} decks={deckArr} players={playerArr} />
      </Overflow>
    </>
  );
};
