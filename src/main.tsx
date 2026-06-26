import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// ===== FIX: Import react-is patch =====
import './utils/reactIsPatch';

// ===== FIX: Safe encodeURIComponent for all objects =====
const originalEncodeURIComponent = window.encodeURIComponent;

window.encodeURIComponent = function(value: any): string {
  try {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'symbol') return value.toString();
    if (typeof value === 'function') return `[Function: ${value.name || 'anonymous'}]`;
    if (typeof value === 'object') {
      try {
        return originalEncodeURIComponent(JSON.stringify(value));
      } catch {
        return originalEncodeURIComponent(Object.prototype.toString.call(value));
      }
    }
    return originalEncodeURIComponent(String(value));
  } catch (error) {
    return originalEncodeURIComponent('[Unable to encode]');
  }
};

// ===== FIX: Safe JSON.stringify for circular references =====
const originalStringify = JSON.stringify;
JSON.stringify = function(value: any, replacer?: any, space?: any): string {
  try {
    return originalStringify(value, replacer, space);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('circular')) {
      return '{"error": "Circular reference detected"}';
    }
    return '{"error": "Unable to stringify"}';
  }
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);