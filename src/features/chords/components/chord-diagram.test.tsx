// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/lib/themes";

import { ChordDiagram } from "./chord-diagram";

jest.mock("react-native-svg", () => ({
  SvgXml: ({ xml, width, height }: { xml: string; width: number; height: number }) => {
    const { Text } = jest.requireActual("react-native");
    return <Text testID="svg">{`${xml}|${width}x${height}`}</Text>;
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

const bothSvgs = { svgHorizontal: "<h/>", svgVertical: "<v/>" };

describe("ChordDiagram", () => {
  test("picks the svg matching the orientation", () => {
    render(<ChordDiagram chord={bothSvgs} orientation="vertical" size={1} />, {
      wrapper,
    });

    expect(screen.getByTestId("svg")).toHaveTextContent(/^<v\/>\|/);
  });

  test("falls back to the other orientation when its svg is missing", () => {
    render(
      <ChordDiagram
        chord={{ svgHorizontal: "<h/>", svgVertical: null }}
        orientation="vertical"
        size={1}
      />,
      { wrapper },
    );

    expect(screen.getByTestId("svg")).toHaveTextContent(/^<h\/>\|/);
  });

  test("renders nothing when the chord has no svg at all", () => {
    render(
      <ChordDiagram
        chord={{ svgHorizontal: null, svgVertical: null }}
        orientation="horizontal"
        size={3}
      />,
      { wrapper },
    );

    expect(screen.queryByTestId("svg")).toBeNull();
  });

  test("scales the diagram with the size setting", () => {
    const { rerender } = render(
      <ChordDiagram chord={bothSvgs} orientation="horizontal" size={1} />,
      { wrapper },
    );
    expect(screen.getByTestId("svg")).toHaveTextContent(/\|133x54$/);

    rerender(<ChordDiagram chord={bothSvgs} orientation="horizontal" size={5} />);
    expect(screen.getByTestId("svg")).toHaveTextContent(/\|355x144$/);
  });
});
