import React from "react";
import { Loader, Dimmer } from "semantic-ui-react";

const Spinner = () => (
  <Dimmer active>
    <Loader size="huge" content={"Preparing Chat...."}></Loader>
  </Dimmer>
);

export default Spinner;
