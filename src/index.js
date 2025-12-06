import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@atlaskit/css-reset";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
document.addEventListener("pointerdown", (e) => {
  console.log("Pointer hit:", e.target);
});