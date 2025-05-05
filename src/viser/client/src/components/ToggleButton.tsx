import { GuiToggleButtonMessage } from "../WebsocketMessages";
import { GuiComponentContext } from "../ControlPanel/GuiComponentContext";
import { Box } from "@mantine/core";

import { Button } from "@mantine/core";
// import React from "react";
import React, { useState, useEffect } from 'react';  


// import { GuiButtonMessage } from "../WebsocketMessages";
// import { GuiComponentContext } from "../ControlPanel/GuiComponentContext";
// import { Box, Button } from "@mantine/core";
// import React, { useState } from 'react';
import { htmlIconWrapper } from "./ComponentStyles.css";

// Define the type for the second button's properties
// interface SecondButtonProps {
//   label: string;
//   color?: "dark" | "gray" | "red" | "pink" | "grape" | "violet" | "indigo" | "blue" | "cyan" | "green" | "lime" | "yellow" | "orange" | "teal" | null;
//   _icon_html?: string | null;
// }

// // Create a new interface that extends GuiButtonMessage
// interface ToggleButtonMessage extends GuiButtonMessage {
//   secondButtonProps?: SecondButtonProps;
// }

export default function ToggleButtonComponent({
  // type,
  uuid,
  // value,
  // container_uuid,
  props,
  secondButtonProps,
}: GuiToggleButtonMessage) {
  const { messageSender } = React.useContext(GuiComponentContext)!;
  const [showFirstButton, setShowFirstButton] = useState(true);

  if (!(props.visible ?? true)) return <></>;

  // If no secondButtonProps, render normal button
  if (!secondButtonProps) {
    return (
      <Box mx="xs" mb="0.5em" style={{ display: "inline-block", width: "auto" }}>
        <Button
          id={uuid}
          color={props.color ?? undefined}
          onClick={() => {
            messageSender({
              type: "GuiUpdateMessage",
              uuid: uuid,
              updates: { value: true },
            })
          }
          }
          style={{
            height: "3.125em",
            minWidth: "120px",
          }}
          disabled={props.disabled ?? false}
          size="compact-lg"
          leftSection={
            props._icon_html ? (
              <div
                className={htmlIconWrapper}
                dangerouslySetInnerHTML={{ __html: props._icon_html }}
              />
            ) : undefined
          }
        >
          {props.label}
        </Button>
      </Box>
    );
  }

  // Render toggle buttons
  return (
    <Box 
      mx="xs" 
      mb="0.5em" 
      style={{ 
        display: "inline-block", 
        width: "auto",
        position: "relative"
      }}
    >
      {/* First Button */}
      <div style={{
        position: 'absolute',
        opacity: showFirstButton ? 1 : 0,
        pointerEvents: showFirstButton ? 'auto' : 'none',
      }}>
        <Button
          id={uuid}
          color={props.color ?? undefined}
          onClick={() => {
            console.log("uuid:", uuid)

            messageSender({
              type: "GuiUpdateMessage",
              uuid: uuid,
              updates: { value: true },
            });
            setShowFirstButton(false);
          }}
          style={{
            height: "3.125em",
            minWidth: "120px",
          }}
          disabled={props.disabled ?? false}
          size="compact-lg"
          leftSection={
            props._icon_html ? (
              <div
                className={htmlIconWrapper}
                dangerouslySetInnerHTML={{ __html: props._icon_html }}
              />
            ) : undefined
          }
        >
          {props.label}
        </Button>
      </div>

      {/* Second Button */}
      <div style={{
        position: 'absolute',
        opacity: !showFirstButton ? 1 : 0,
        pointerEvents: !showFirstButton ? 'auto' : 'none',
      }}>
        <Button
          id={`${uuid}-second`}
          color={secondButtonProps.color ?? undefined}
          onClick={() => {
            console.log("second uuid:", `${uuid}-second`, secondButtonProps.label )

            messageSender({
              type: "GuiUpdateMessage",
              uuid: uuid,
              updates: { value: true },
            });
            setShowFirstButton(true);
          }}
          style={{
            height: "3.125em",
            minWidth: "120px",
          }}
          disabled={props.disabled ?? false}
          size="compact-lg"
          leftSection={
            secondButtonProps._icon_html ? (
              <div
                className={htmlIconWrapper}
                dangerouslySetInnerHTML={{ __html: secondButtonProps._icon_html }}
              />
            ) : undefined
          }
        >
          {secondButtonProps.label}
        </Button>
      </div>

      {/* Invisible placeholder */}
      <div style={{ 
        height: "3.125em", 
        minWidth: "120px", 
        visibility: "hidden" 
      }}></div>
    </Box>
  );
}
