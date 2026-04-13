import React from "react";
import ConcentricCircles from "./ConcentricCircles";
import BarChart from "./BarChart";

const MONTHLY_SALES = [
  { label: "Jan", value: 120 },
  { label: "Feb", value: 85 },
  { label: "Mar", value: 200 },
  { label: "Apr", value: 150 },
  { label: "May", value: 310 },
  { label: "Jun", value: 275 },
  { label: "Jul", value: 430 },
  { label: "Aug", value: 390 },
];

export default function App() {
  return (
    <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 48 }}>
      <BarChart
        data={MONTHLY_SALES}
        title="Monthly Sales"
        color="#6366f1"
      />
      <ConcentricCircles />
    </div>
  );
}
