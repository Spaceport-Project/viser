import './ButtonStyle.css'; // Import at the top of your component file  
import {ViewerContext} from "../App"
import { GuiButtonMessage } from "../WebsocketMessages";
import { GuiComponentContext } from "../ControlPanel/GuiComponentContext";
import { Box } from "@mantine/core";

import { Button } from "@mantine/core";
import React from "react";
import { htmlIconWrapper } from "./ComponentStyles.css";
// let showFirstButton: any, setShowFirstButton: (arg0: boolean) => void;
export default function ButtonComponent({
  uuid,
  props,
}: GuiButtonMessage) {
  const viewer = React.useContext(ViewerContext)!;

  const { messageSender } = React.useContext(GuiComponentContext)!;
  const [showFirstButton, setShowFirstButton] = React.useState(true);
  // if (!(props.visible ?? true) || !(props.visible_second ?? true)) return <></>;
  // if (props.visible && props.visible_second )
  // {
  //   console.error("visible and visible_second can not be true at the same time")
  //   return <></>;
  // }
  const getEnlargedIconHtml = (iconHtml: string | undefined): string | undefined => {
    if (!iconHtml) return undefined;
    // This adds a style attribute to scale any SVG or icon element
    return iconHtml.replace('<svg', '<svg style="width: 24px; height: 24px;"');
  };

  
  const iconStyle = {
    transform: 'scale(4.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };
const getIconStyle = (scale: number = 2) => {
    return { 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      transform: `scale(${scale})`,
      width: '100%',
      height: '100%'
    };
  };
  const containerStyle = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
  };
  const getButtonStyle = (customProps?: { 
    height?: string; 
    width?: string; 
    padding?: string;
    borderRadius?: string;
    
  }) => {
    return {
      height: customProps?.height || "4em",
      width: customProps?.width || "4em",
      minWidth: customProps?.width || "4em",
      // padding: customProps?.padding || "0.5em",
      borderRadius: customProps?.borderRadius || "8px",
      
      // backgroundColor: 'transparent',
      // color: '#228be6',
      // transition: 'background-color 0.3s ease', // Smooth transition  
      // '&:hover': {
      //     backgroundColor: '#228be6', // Color to display on hover
      //     color: '#ff', // Optional: Change text color on hover
      //   }

      // display: "flex",  
      // alignItems: "center",  
      // justifyContent: "center",  
      // overflow: "visible" 
      // overflow: "hidden",  
      // boxSizing: "border-box", // Ensures padding is included in the size  
    };
  };
  // If no secondButtonProps, render normal button
  if (!props.label_second) {
    return (
      <Box  mb="0.75em" style={{  width: "auto"  }}>
        <Button
          id={uuid}
          className="transparent-hover-button"  

          color={props.color ?? undefined}
          onClick={() => {
           

            messageSender({
              type: "GuiUpdateMessage",
              uuid: uuid,
              updates: { value: true },
            })
          }
          }
          variant="subtle"
          style={{
            ...getButtonStyle(),
            top:"1%",
            left:"0",
            // left:'calc(-25% - 4em)',
            position: 'relative'
            

          }}
          // styles={(theme) => ({  
          //   root: {
          //     border: 'none !important',
          //     background: 'transparent !important',
          //     '&:not(:disabled):hover': {
          //       background: `${props.color_second || '#228be6'} !important`,
          //       borderColor: `${props.color_second || '#228be6'} !important`,
          //     },
          //     '& svg, & i, & span, & *': {
          //       fill: `${props.color_second || '#228be6'} !important`,
          //       color: `${props.color_second || '#228be6'} !important`,
          //     },
          //     '&:hover svg, &:hover i, &:hover span, &:hover *': {
          //       fill: '#fff !important',
          //       color: '#fff !important',
          //     }
          //   },
          // })}  
        
          disabled={props.disabled ?? false}
          size="compact-xs"
          
         
          >
          {props._icon_html && (
            <div
              className={htmlIconWrapper}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                transform: 'scale(1.5)',
                margin: '0.8em',
              }}
              dangerouslySetInnerHTML={{ __html: getEnlargedIconHtml(props._icon_html) || '' }}
            />
          )}
        
          {/* {props.label} */}
        </Button>
      </Box>
    );
  }

  else {
  if  (props.visible) {
  return (

    <Box  mb="0.75em" style={{ width: "auto" } }  >

      
    
        <Button
         className="transparent-hover-button"  

          id={uuid}
          color={props.color ?? undefined}
          onClick={() => {
            if (props.label.includes("sound_off")) {
              viewer.audioWorkletPlayer.current!.setVolume(0);

            } else if (props.label.includes("Start_player")) {
              viewer.audioWorkletPlayer.current!.resumeContext();

            }


            messageSender({
              type: "GuiUpdateMessage",
              uuid: uuid,
              updates: { value: true },
            });

          }}
          variant="subtle"
          style={{
            
           
              ...getButtonStyle(),
            top:"1%",
            left:"0%",
            
            position: 'relative'
          }}
          // styles={(theme) => ({  
          //   root: {
          //     border: 'none !important',
          //     background: 'transparent !important',
          //     '&:not(:disabled):hover': {
          //       background: `${props.color_second || '#228be6'} !important`,
          //       borderColor: `${props.color_second || '#228be6'} !important`,
          //     },
          //     '& svg, & i, & span, & *': {
          //       fill: `${props.color_second || '#228be6'} !important`,
          //       color: `${props.color_second || '#228be6'} !important`,
          //     },
          //     '&:hover svg, &:hover i, &:hover span, &:hover *': {
          //       fill: '#fff !important',
          //       color: '#fff !important',
          //     }
          //   },
          // })}  
          disabled={props.disabled ?? false}
          size="compact-xs"

        
        >
          {props._icon_html && (
            <div
              className={htmlIconWrapper}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                transform: 'scale(1.5)',
                margin: '0.8em',
              }}
              dangerouslySetInnerHTML={{ __html: getEnlargedIconHtml(props._icon_html) || '' }}
            />
          )}
          {/* {props.label} */}
        </Button>
      </Box>
  )
  }
  else if (props.visible_second)
    return (
    <Box  mb="0.75em" style={{ width: "auto" } }  >
    
        <Button
                className="transparent-hover-button"  

          id={`${uuid}-second`}
          color={props.color_second ?? undefined}
          onClick={() => {
            if (props.label_second?.includes("sound_on")){
              viewer.audioWorkletPlayer.current!.setVolume(1);

            } else if (props.label_second?.includes("Pause_player")) {
              viewer.audioWorkletPlayer.current!.suspendContext();

            }
            messageSender({
              type: "GuiUpdateMessage",
              uuid: uuid,
              updates: { value: true },
            });

          }}
          variant="subtle"
          style={{
            ...getButtonStyle(),

            top:"1%",
            left:"0",

            position: 'relative'
            }}
          // styles={(theme) => ({  
          //   root: {
          //     border: 'none !important',
          //     background: 'transparent !important',
          //     '&:not(:disabled):hover': {
          //       background: `${props.color_second || '#228be6'} !important`,
          //       borderColor: `${props.color_second || '#228be6'} !important`,
          //     },
          //     '& svg, & i, & span, & *': {
          //       fill: `${props.color_second || '#228be6'} !important`,
          //       color: `${props.color_second || '#228be6'} !important`,
          //     },
          //     '&:hover svg, &:hover i, &:hover span, &:hover *': {
          //       fill: '#fff !important',
          //       color: '#fff !important',
          //     }
          //   },
          // })}  
          disabled={props.disabled ?? false}
          size="compact-xs"
        
        >
         {props._icon_html_second && (
            <div
              className={htmlIconWrapper}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                margin: '0.8em',
                transform: 'scale(1.5)'
              }}
              dangerouslySetInnerHTML={{ __html: getEnlargedIconHtml(props._icon_html_second) || '' }}
            />
          )}
          {/* {props.label_second} */}
        </Button>

    
    </Box>
  );
}
}









// export default function ButtonComponent({
//   uuid,
//   props: { visible, disabled, label, color, _icon_html: icon_html },
// }: GuiButtonMessage) {
  
//   const { messageSender } = React.useContext(GuiComponentContext)!;
//   if (!(visible ?? true)) return <></>;

//   return (
//     <Box mx="xs" mb="0.5em"  style={{ display: "inline-block", width: "auto" }}>  {/* Removed mb="0.5em" */}
//       <Button
//         id={uuid}
//         // fullWidth
//         color={color ?? undefined}
//         onClick={() =>
//           messageSender({
//             type: "GuiUpdateMessage",
//             uuid: uuid,
//             updates: { value: true },
//           })
//         }
//         style={{
//           height: "3.125em",
//           // width : "4em"
//           minWidth: "120px", // Add a minimum width to make buttons consistent  

//         }}
//         disabled={disabled ?? false}
//         size="compact-xs"
//         leftSection={
//           icon_html === null ? undefined : (
//             <div
//               className={htmlIconWrapper}
//               dangerouslySetInnerHTML={{ __html: icon_html }}
//             />
//           )
//         }
//       >
//         {label}
//       </Button>
//     </Box>
//   );
// }
