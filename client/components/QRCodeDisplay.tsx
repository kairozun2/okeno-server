import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import Svg, { Rect } from "react-native-svg";

function getQRMatrix(data: string, size: number): boolean[][] {
  const moduleCount = 25;
  const matrix: boolean[][] = Array(moduleCount).fill(null).map(() => Array(moduleCount).fill(false));
  
  const bytes = [];
  for (let i = 0; i < data.length; i++) {
    bytes.push(data.charCodeAt(i));
  }
  
  const seed = bytes.reduce((acc, b) => (acc * 31 + b) % 10000000, 1);
  let rand = seed;
  const pseudoRandom = () => {
    rand = (rand * 1103515245 + 12345) % 2147483648;
    return rand / 2147483648;
  };
  
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 7; j++) {
      const isFinderPattern = (i === 0 || i === 6 || j === 0 || j === 6) || 
                              (i >= 2 && i <= 4 && j >= 2 && j <= 4);
      matrix[i][j] = isFinderPattern;
      matrix[i][moduleCount - 7 + j] = isFinderPattern;
      matrix[moduleCount - 7 + i][j] = isFinderPattern;
    }
  }
  
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      const isAlignPattern = (i === 0 || i === 4 || j === 0 || j === 4) || (i === 2 && j === 2);
      matrix[moduleCount - 9 + i][moduleCount - 9 + j] = isAlignPattern;
    }
  }
  
  for (let i = 8; i < moduleCount - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }
  
  for (let i = 8; i < moduleCount; i++) {
    for (let j = 8; j < moduleCount; j++) {
      if ((i >= moduleCount - 9 && i < moduleCount - 4 && j >= moduleCount - 9 && j < moduleCount - 4)) {
        continue;
      }
      if (i === 6 || j === 6) continue;
      
      const byteIndex = Math.floor((i * moduleCount + j) / 8) % bytes.length;
      const bitIndex = (i * moduleCount + j) % 8;
      const dataValue = ((bytes[byteIndex] >> bitIndex) & 1) === 1;
      matrix[i][j] = pseudoRandom() > 0.5 ? dataValue : !dataValue;
    }
  }
  
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (i < 7 && j < 7) continue;
      const idx = i * 8 + j;
      if (idx < bytes.length * 8) {
        const byteIdx = Math.floor(idx / 8) % bytes.length;
        const bitIdx = idx % 8;
        matrix[i][j] = ((bytes[byteIdx] >> bitIdx) & 1) === 1;
        if (j < moduleCount - 7) {
          matrix[i][moduleCount - 8 + j] = ((bytes[(byteIdx + 1) % bytes.length] >> bitIdx) & 1) === 1;
        }
        if (i < moduleCount - 7) {
          matrix[moduleCount - 8 + i][j] = ((bytes[(byteIdx + 2) % bytes.length] >> bitIdx) & 1) === 1;
        }
      }
    }
  }
  
  return matrix;
}

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
  const matrix = getQRMatrix(value, size);
  const moduleCount = matrix.length;
  const moduleSize = size / moduleCount;
  const rects: React.ReactElement[] = [];

  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (matrix[row][col]) {
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
