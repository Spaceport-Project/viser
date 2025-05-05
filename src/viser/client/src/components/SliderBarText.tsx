import { Box, Text, Slider } from '@mantine/core';
import { useContext} from 'react';
import { GuiSliderBarTextMessage } from "../WebsocketMessages";
import { GuiComponentContext } from "../ControlPanel/GuiComponentContext";
// import { GuiSliderMessage } from "../WebsocketMessages";

export default function SliderBarTextComponent({
  uuid,
  value,
  length,
  props: { visible, color, animated },
  onValueChange, // This will be called to notify parent component
}: GuiSliderBarTextMessage & { onValueChange?: (value: number) => void }) {
  if (!visible) return <></>;
  
  const { setValue } = useContext(GuiComponentContext)!;

  function formatTime(totalSeconds: number): string {
      const roundedSeconds = Math.round(totalSeconds);  
    
      const minutes = Math.floor(roundedSeconds / 60);
      const seconds =roundedSeconds % 60;
      
      // Pad seconds with leading zero if needed
      const paddedMinutes = minutes.toString().padStart(2, '0');  
    
      const paddedSeconds = seconds.toString().padStart(2, '0');
      
      return `${paddedMinutes}:${paddedSeconds}`;
    }
  const updateValue = (value: number) => setValue(uuid, value);

  // Internal state for the progress
  // const [progress, setProgress] = useState(value);

  // // Update internal progress when prop value changes
  // useEffect(() => {
  //   setProgress(value);
  // }, [value]);

  const timeToLeft = formatTime(value * length / 100);
  const totalTime = formatTime(length);

  // const handleSliderChange = (newValue: number) => {
  //   setProgress(newValue);
  //   // Notify parent component if callback is provided
  //   if (onValueChange) {
  //     onValueChange(newValue);
  //   }
  // };

  return (
    <Box pt="xs" style={{ width: '100%' }}>
      <Box
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          gap: 12,
        }}
      >
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Slider
             id={uuid}
            value={value}
            onChange={updateValue}
            color={color ?? undefined}
            radius="xs"
            min={0}
            max={100}
            label={null}
            styles={(theme) => ({
              track: {
                backgroundColor: color ?? theme.colors.blue[6], // Set your preferred color
              },
              bar: {
                backgroundColor: color ?? theme.colors.blue[4], // Set your preferred color
                transition: animated ? 'width 100ms linear' : 'none',
              },
              thumb: {
                borderWidth: 3,
                padding: 1,
                backgroundColor: theme.white,
                borderColor: color ?? theme.primaryColor,
                // boxShadow: 'none', 
              },
            })}
          />
        </Box>
        <Text
          size="sm"
          style={{
            width: 85,
            color: "white",
            minWidth: 85,
            textAlign: 'right',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {timeToLeft + '/' + totalTime}
        </Text>
      </Box>
    </Box>
  );
}


