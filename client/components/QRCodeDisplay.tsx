import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Rect } from "react-native-svg";
import qrcode from "qrcode";

interface QRCodeDisplayProps {
  value: string;
  size: number;
  backgroundColor?: string;
  color?: string;
}

export function QRCodeDisplay({ 
  value, 
  size, 
  backgroundColor = "#fff",
  color = "#000" 
}: QRCodeDisplayProps) {
  // Use a more reliable way to generate the matrix
  const qr = qrcode.create(value, { errorCorrectionLevel: 'M' });
  const moduleCount = qr.modules.size;
  const moduleSize = size / moduleCount;
  const rects: React.ReactElement[] = [];

  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (qr.modules.get(row, col)) {
        rects.push(
          <Rect
            key={`${row}-${col}`}
            x={col * moduleSize}
            y={row * moduleSize}
            width={moduleSize}
            height={moduleSize}
            fill={color}
          />
        );
      }
    }
  }

  return (
    <View style={[styles.container, { width: size, height: size, backgroundColor }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {rects}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
});
