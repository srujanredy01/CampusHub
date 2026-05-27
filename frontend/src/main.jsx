import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./index.css";
import App from "./App";
import { store } from "./store";
import { injectStore } from "./services/api";

// Inject store into API client for auth state management (e.g., force logout on token expiry)
injectStore(store);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <ToastContainer
          position="top-right"
          autoClose={4000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          toastClassName="!rounded-2xl !shadow-float !font-sans !text-sm !border !border-surface-100"
          bodyClassName="!font-sans !text-slate-700"
          progressClassName="!bg-primary-500"
          limit={3}
        />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
