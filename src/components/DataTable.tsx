import * as React from "react";
import { Table } from "semantic-ui-react";
import { Game, MagicData } from "../analysis";
import _ from "lodash";
import { Overflow } from "./Analysis";

export interface Props {
  magicData: MagicData;
}

export const placementColor = (placement: number) => {
  return ["", "orangered", "skyblue", "khaki", "lightgreen", "pink"][placement];
};

export const DataTable: React.FunctionComponent<Props> = ({ magicData }) => {
  return (
    <Overflow>
      <Table
        textAlign="center"
        celled
        striped
        inverted
        compact
        unstackable
        headerRow={
          <Table.Row>
            <Table.HeaderCell sorted="ascending">Game</Table.HeaderCell>
            {magicData.decks.map((deck, i) => (
              <Table.HeaderCell key={i}>{deck}</Table.HeaderCell>
            ))}
          </Table.Row>
        }
        tableData={magicData.games}
        renderBodyRow={(game: Game, i) => (
          <Table.Row key={i}>
            <Table.Cell collapsing>{i + 1}</Table.Cell>
            {magicData.decks.map((deck, i) => (
              <Table.Cell collapsing key={i}>
                {game.decks[deck] === undefined ? (
                  <></>
                ) : (
                  <>
                    <span style={{ color: placementColor(Math.floor(game.decks[deck]?.placement ?? 0)) }}>
                      {game.decks[deck]?.placement ?? ""}
                    </span>
                    {/* ,
                  <span style={{ color: placementColor(Math.floor(game.decks[deck]?.relativePlacement ?? 0)) }}>
                    {game.decks[deck]?.relativePlacement ?? ""}
                  </span> */}
                  </>
                )}
                &nbsp;
                {game.decks[deck]?.player ?? "—"}
              </Table.Cell>
            ))}
          </Table.Row>
        )}
      ></Table>
    </Overflow>
  );
};
