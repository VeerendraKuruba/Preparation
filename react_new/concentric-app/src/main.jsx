import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ConcentricCircles from "./ConcentricCircles";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ConcentricCircles />
  </StrictMode>
);
