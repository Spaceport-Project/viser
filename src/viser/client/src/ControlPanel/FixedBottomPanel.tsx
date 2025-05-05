import {
    Box,
    Collapse,
    Paper,
    ScrollArea,
    useMantineColorScheme,
  } from "@mantine/core";
  import React from "react";
  import { useDisclosure } from "@mantine/hooks"; // Add this import  

  interface FixedBottomPanelContextType {
    wrapperRef: React.RefObject<HTMLDivElement>;
    expanded: boolean;
    width: string;
    maxHeight: number;
    toggleExpanded: () => void;
  }
  
  const FixedBottomPanelContext = React.createContext<FixedBottomPanelContextType | null>(null);
  
  interface FixedBottomPanelProps {
    children: React.ReactNode;
    width: string;
  }
  
  interface FixedBottomPanelHandleProps {
    children: React.ReactNode;
  }
  
  interface FixedBottomPanelContentsProps {
    children: React.ReactNode;
  }
  
  interface FixedBottomPanelHideWhenCollapsedProps {
    children: React.ReactNode;
  }
  
  /** A fixed panel at the bottom of the screen for displaying controls. */
  export default function FixedBottomPanel({
    children,
    width,
  }: {
    children: string | React.ReactNode;
    width: string ;
  }) {
    const panelWrapperRef = React.useRef<HTMLDivElement>(null);
    const [expanded, { toggle: toggleExpanded }] = useDisclosure(true);
    const [maxHeight, setMaxHeight] = React.useState<number>(800);
  
    // Update maxHeight on window resize
    React.useEffect(() => {
      const handleResize = (): void => {
        const newMaxHeight = window.innerHeight * 0.7; // 70% of viewport height
        setMaxHeight(newMaxHeight);
      };
  
      handleResize(); // Initial setup
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);
  
    return (
      <FixedBottomPanelContext.Provider
        value={{
          wrapperRef: panelWrapperRef,
          expanded,
          width,
          maxHeight,
          toggleExpanded,
        }}
      >
        <Paper
          radius="0"
          shadow="0.1em 0 1em 0 rgba(0,0,0,0.1)"
          style={{
            boxSizing: "border-box",
            width: width, // Use the provided width instead of "100%" 
            zIndex: 10,
            position: "fixed",
            bottom: 0,
            left: "50%", // Center horizontally
            transform: "translateX(-50%)", // Center horizontally
            margin: 0,
            overflow: "hidden",
            backgroundColor: "transparent", // Make background transparent  
            boxShadow: "none", // Remove shadow  
          }}
          ref={panelWrapperRef}
        >
          {children}
        </Paper>
        {/* <Paper
          radius="xs"
          shadow="0.1em 0 1em 0 rgba(0,0,0,0.1)"
          style={{
            boxSizing: "border-box",
            width: "100%", // Full width
            zIndex: 10,
            position: "fixed", // Fixed position
            bottom: 0, // Stick to bottom
            left: 0, // Align to left
            margin: 0,
            overflow: "hidden",
          }}
          ref={panelWrapperRef}
        >
          {children}
        </Paper> */}
      </FixedBottomPanelContext.Provider>
    );
  }
  
  /** Handle object for showing/hiding the panel */
  FixedBottomPanel.Handle = function FixedBottomPanelHandle({
    children,
  }:{
    children: string | React.ReactNode;
    
  }){
    const panelContext = React.useContext(FixedBottomPanelContext);
    if (!panelContext) {
      throw new Error('FixedBottomPanelHandle must be used within a FixedBottomPanel');
    }
  
    return (
      <Box
        style={(theme) => ({
          lineHeight: "1.5em",
          cursor: "pointer",
          position: "relative",
          fontWeight: 400,
          userSelect: "none",
          display: "flex",
          alignItems: "center",
          padding: "0 0.75em",
          height: "2.75em",
          // borderBottomWidth: panelContext.expanded ? "1px" : 0,
          // borderBottomStyle: "solid",
          // // backgroundColor: "transparent", // Make background transparent 
          // borderColor:
          //   useMantineColorScheme().colorScheme === "dark"
          //     ? theme.colors.dark[4]
          //     : theme.colors.gray[3],
        })}
        onClick={panelContext.toggleExpanded}
      >
        {children}
      </Box>
    );  
  };
  
  

  FixedBottomPanel.Contents = function FixedBottomPanelContents({
    children,
  }: {
    children: string | React.ReactNode;
  }) {
    const context = React.useContext(FixedBottomPanelContext)!;
    return <Collapse  in={context.expanded}>
       {/* <ScrollArea.Autosize mah={context.maxHeight}>
            <Box
             
              w={context.width}
                  style={{
                            display: "flex",
                            flexDirection: "row", // Make children flow horizontally
                            // flexWrap: "wrap", // Allow wrapping if too many buttons
                            // gap: "10px", // Add space between buttons
                            // padding: "15px", // Add some padding around the buttons
                            backgroundColor: "transparent",
                            // alignItems: "center",     // Center vertically  
                            // justifyContent: "center", // Center the buttons horizontally  
              
                            justifyContent: "flex-start", // Center buttons horizontally
                            //  alignItems: "center", // Center buttons vertically
                    }}
              >
              {children}
            </Box>
          </ScrollArea.Autosize> */}
          {children}
          </Collapse>;
  };

  /** Contents of the panel */
  // FixedBottomPanel.Contents = function FixedBottomPanelContents({
  //   children,
  // }: FixedBottomPanelContentsProps): JSX.Element {
  //   const context = React.useContext(FixedBottomPanelContext);
  
  //   if (!context) {
  //     throw new Error('FixedBottomPanelContents must be used within a FixedBottomPanel');
  //   }
  
  //   return (
  //     <Collapse in={context.expanded}>
  //       <ScrollArea.Autosize mah={context.maxHeight}>
  //         <Box w={"100%"}
  //             style={{
  //             display: "flex",
  //             flexDirection: "row", // Make children flow horizontally
  //             flexWrap: "wrap", // Allow wrapping if too many buttons
  //             gap: "10px", // Add space between buttons
  //             // padding: "15px", // Add some padding around the buttons
  //             backgroundColor: "transparent",
  //             alignItems: "center",     // Center vertically  
  //             // justifyContent: "center", // Center the buttons horizontally  

  //             // justifyContent: "flex-start", // Center buttons horizontally
  //             //  alignItems: "center", // Center buttons vertically
  //           }}
  //         > 
  //           {children}
  //         </Box>
  //       </ScrollArea.Autosize>
  //     </Collapse>
  //   );
    
   
  // };
  
  /** Hides contents when panel is collapsed */
  FixedBottomPanel.HideWhenCollapsed = function FixedBottomPanelHideWhenCollapsed({
    children,
  }: {
    children: React.ReactNode;
  })  {
    // const context = React.useContext(FixedBottomPanelContext);
    const expanded = React.useContext(FixedBottomPanelContext)?.expanded ?? true;

    // if (!context) {
    //   throw new Error('FixedBottomPanelHideWhenCollapsed must be used within a FixedBottomPanel');
    // }
  
    return expanded ? children : null;
  };