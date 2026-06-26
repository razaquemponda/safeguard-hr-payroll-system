// src/utils/reactIsPatch.ts

// This is a patch to fix the react-is import issue with recharts

// @ts-ignore - ignore type errors
import * as reactIs from 'react-is';

// Make sure the named exports exist on the imported object
// @ts-ignore
if (typeof reactIs.isFragment === 'undefined') {
  // @ts-ignore
  reactIs.isFragment = function isFragment() { return false; };
}

// @ts-ignore
if (typeof reactIs.isElement === 'undefined') {
  // @ts-ignore
  reactIs.isElement = function isElement() { return false; };
}

// @ts-ignore
if (typeof reactIs.isValidElementType === 'undefined') {
  // @ts-ignore
  reactIs.isValidElementType = function isValidElementType() { return false; };
}

export default reactIs;