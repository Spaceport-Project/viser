import { Viewer  } from "gle-gaussian-splat-3d";
import { useEffect } from "react";

export function ViewSplat() {

    useEffect(() => {
      const viewer = new Viewer({
        ignoreDevicePixelRatio: false,
        gpuAcceleratedSort: true
      });
      viewer.addSplatScene('/point_cloud.ply', {
        'splatAlphaRemovalThreshold': 5,
        'showLoadingUI': true,
        'position': [0, 1, 0],
        'rotation': [0, 0, 0, 1],
        'scale': [1.5, 1.5, 1.5]
      }).then(() => {
        console.log("File loaded");
        viewer.start();
      })
    });
    return null;
  }