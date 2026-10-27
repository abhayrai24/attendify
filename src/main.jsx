import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { FeedbackProvider } from "./components/ui/FeedbackProvider.jsx";
import { AppStoreProvider } from "./store/AppStore.jsx";
import "./styles/index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <FeedbackProvider>
      <AppStoreProvider>
        <App />
      </AppStoreProvider>
    </FeedbackProvider>
  </StrictMode>,
);
