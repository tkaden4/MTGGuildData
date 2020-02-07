import { tuple } from "fp-ts/lib/function";
import _ from "lodash";
import * as React from "react";
import Plot from "react-plotly.js";
import { Card, Header, Table, Segment } from "semantic-ui-react";
import { deckStatistics, MagicData, summary, countPlacements, normalizeToPoints } from "../analysis";

export const trunc = (n: number, to: number): string => (Math.round(n * 10 ** to) / 10 ** to).toFixed(to);

const colors = {
  green: "limegreen",
  white: "cornsilk",
  blue: "darkblue",
  red: "firebrick",
  black: "#0a0a0c"
};

export const decks = {
  azorius: { colors: [colors.blue, colors.white], path: require("../../guilds/azorius.jpg") },
  dimir: { colors: [colors.blue, colors.black], path: require("../../guilds/dimir.jpg") },
  simic: { colors: [colors.blue, colors.green], path: require("../../guilds/simic.jpg") },
  izzet: { colors: [colors.blue, colors.red], path: require("../../guilds/izzet.jpg") },
  eggs: { colors: [colors.red, colors.white], path: require("../../guilds/boros.jpg") },
  gruul: { colors: [colors.red, colors.green], path: require("../../guilds/gruul.jpg") },
  rakdos: { colors: [colors.red, colors.black], path: require("../../guilds/rakdos.jpg") },
  golgari: { colors: [colors.black, colors.green], path: require("../../guilds/golgari.jpg") },
  orzhov: { colors: [colors.black, colors.white], path: require("../../guilds/orzhov.jpg") },
  selesnya: { colors: [colors.green, colors.white], path: require("../../guilds/selesnya.jpg") }
} as const;

export const Overflow = ({ children }) => {
  return <div style={{ overflowX: "auto", width: "100%" }}>{children}</div>;
};

export const PlacementStatistics = ({
  stats,
  decks
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
}) => {
  return (
    <Table celled compact inverted striped textAlign="center" unstackable>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Group</Table.HeaderCell>
          <Table.HeaderCell></Table.HeaderCell>
          <Table.HeaderCell>Overall</Table.HeaderCell>
          {decks.map((deck, i) => (
            <Table.HeaderCell key={i}>{deck}</Table.HeaderCell>
          ))}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {stats.map(([person, { stats: stat, overallDeviation, overallMean }], i) => {
          const ordered = decks.map(deck => stat.find(x => x.deck === deck));
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
  deckSummary
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
  return (
    <React.Fragment>
      <Card.Group centered doubling itemsPerRow={5}>
        {deckSummary.map((deck, i) => {
          const [fst, snd] = decks[deck.deck.trim().toLowerCase() as keyof typeof decks].colors;
          return (
            <Card key={i} color="black">
              <div
                style={{
                  background: `linear-gradient(to right, ${fst} 0%, ${fst} 50%, ${snd} 50%, ${snd} 100%)`,
                  height: "10px"
                }}
              ></div>
              <Card.Content>
                <Card.Header>{deck.deck === "Eggs" ? "🥚🥚🥚" : deck.deck}</Card.Header>
                <Card.Meta>Played {deck.timesPlayed} times</Card.Meta>
                <Card.Description>
                  Has not been played by:{" "}
                  {magicData.players
                    .filter(player => !deck.playedBy.map(x => x.player).includes(player))
                    .reduce(
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
                </Card.Description>
              </Card.Content>
            </Card>
          );
        })}
      </Card.Group>
      {/* FIXME */}
      <Segment textAlign="center">
        <div style={{ overflowX: "scroll", position: "relative", width: "100%" }}>
          <Plot
            data={[{ type: "bar", x: deckSummary.map(x => x.deck), y: deckSummary.map(y => y.timesPlayed) }]}
            layout={{ title: "Usage per deck" }}
            config={{ responsive: false }}
          />
        </div>
      </Segment>
    </React.Fragment>
  );
};

export const WinRates: React.FunctionComponent<{ magicData: MagicData; unweighted?: boolean }> = ({
  magicData,
  unweighted = false
}) => {
  const { players, decks } = magicData;

  const results = players.map(player => {
    const overallGames = countPlacements(magicData, [player], decks, [
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
      [5, 1]
    ]);
    const overallWins = countPlacements(
      magicData,
      [player],
      decks,
      unweighted
        ? [[1, 1]]
        : [
            [1, 0.6],
            [2, 0.3],
            [3, 0.1]
          ]
    );
    const overallLosses = overallGames - overallWins;
    return decks.map(deck => {
      const playerTotal = countPlacements(
        magicData,
        [player],
        [deck],
        [
          [1, 1],
          [2, 1],
          [3, 1],
          [4, 1],
          [5, 1]
        ]
      );
      const wins = countPlacements(
        magicData,
        [player],
        [deck],
        unweighted
          ? [[1, 1]]
          : [
              [1, 1],
              [2, 0.25],
              [3, 0.12]
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
        lossRate: losses / (playerTotal || 1)
      };
    });
  });

  return (
    <Table celled compact inverted striped unstackable textAlign="center">
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Player</Table.HeaderCell>
          <Table.HeaderCell></Table.HeaderCell>
          <Table.HeaderCell>Overall</Table.HeaderCell>
          {decks.map((deck, i) => (
            <Table.HeaderCell key={i}>{deck}</Table.HeaderCell>
          ))}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {results.map((personalStats, i) => {
          const person = personalStats[0]?.player ?? "—";
          const ordered = decks.map(deck => personalStats.find(x => x.deck === deck));
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
                    {deckRate === undefined ? "—" : trunc(deckRate.winRate, 2)}
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
                    {deckRate === undefined ? "—" : trunc(deckRate.lossRate, 2)}
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
  const top = deckStatistics(magicData, magicData.df.getSeries<string>("player").toArray());
  const playerDeckStats = magicData.players.map(player => tuple(player, deckStatistics(magicData, [player])));
  const deckSummary = summary(magicData);
  const normalized = normalizeToPoints(magicData);
  return (
    <>
      <Header size="large">Deck Usage</Header>
      <DeckSummary magicData={magicData} deckSummary={deckSummary} />
      <Header size="large">Deck Placement Statistics</Header>
      <Overflow>
        <PlacementStatistics stats={[["Overall", top], ...playerDeckStats]} decks={magicData.decks} />
      </Overflow>
      <Header size="large">
        Player Win Rates
        <Header.Subheader>Unweighted</Header.Subheader>
      </Header>
      <Overflow>
        <WinRates magicData={magicData} unweighted />
      </Overflow>
      <Header size="large">
        <Header.Subheader>Weighted</Header.Subheader>
      </Header>
      <Overflow>
        <WinRates magicData={magicData} />
      </Overflow>
    </>
  );
};
