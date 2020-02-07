import { Analysis } from "./Analysis";
import * as React from "react";
import { MagicData, getMagicData } from "../analysis";
import { taskEither } from "fp-ts/lib/TaskEither";
import { DataTable } from "./DataTable";
import { Divider, Container, Segment, Image, Header } from "semantic-ui-react";
import { DataFrame } from "data-forge";

export const Index = () => {
  const [tableData, setTableData] = React.useState<MagicData>({
    df: new DataFrame(),
    players: [],
    decks: [],
    games: []
  });

  React.useEffect(() => {
    taskEither.map(getMagicData, data => setTableData(data))();
  }, []);
  return (
    <div>
      <Container fluid>
        <Segment inverted basic>
          <Container>
            <Header inverted>Guild Deck Statistics</Header>
          </Container>
        </Segment>
      </Container>
      <Container>
        <Divider hidden />
        <Header size="large">Compiled Data</Header>
        <DataTable magicData={tableData} />
        <Analysis magicData={tableData} />
      </Container>
      <Divider hidden />
    </div>
  );
};
