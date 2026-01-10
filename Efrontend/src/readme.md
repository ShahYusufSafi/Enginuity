# React development


React lets you combine your markup (ex: html), CSS, and JavaScript into custom “components”, reusable UI elements for your app. The code code can be turned into a `<Component />`  you can render on any page. 
## 1. General structure of components
We define everything as a function, in return we have UI, and in between there can be states, navigations, and lots of other important things. Bellow is a general structure:

```tsx
// imports
import class from directory


export default function Name() {
    ..... // other process
    return ();
}
```
Usually for pages an empty aurgumented function is enough, however for other utils, hooks, and components we might use different complex aurguments. 

Also don't worry if you see many type annotations, it is very useful and a common prcatices in modular react development. In fact typescript is a type annotated language.


```tsx
// imports
import class from directory


export default function Name() {
export default function ({input}:{input: inputType}):outputType {
    ..... // other process
    return ();
}
```

We usually define the types prior to function defination, or even in a different directory, using an interface.


```tsx
// imports
import class from directory

export interface TypeName {
    // define all for example
    input1: int;
    input2: str:;
    // ........
}

export default function Name() {
export default function ({input1, input2}:TypeName):outputType {
    ..... // other process
    return ();
}
```
## 2. Imports and Exports
There are two types of ES module exports, and the import syntax must match:

1. **Named exports**
   Use when a module exports one or more named bindings.

   Export:
   ```tsx
   export const foo = ...
   export class Bar {}
   ```

   Import:
   
   ```tsx 
   import { foo, Bar } from './module'; 
   ```

2. **Default export**  
   Specifies the main component in the file. Use when a module exports exactly one primary value.

   Export:
   ```tsx 
   export default function Baz() {}
    ```
   Import:
   ```tsx 
   import Baz from './module';
   ```

**convention (professional)**

For classes / React components:
- Prefer default export
- File name = exported symbol

```tsx 
// DrawingEngine.ts
export default class DrawingEngine {}
```

For utilities / constants:

- Prefer named exports

```tsx 

export function snap() {}
export const EPS = 1e-6;
```

This convention scales well and reduces import mistakes.

## 3. React Components (JavaScript functions that return markup)

React apps are made of components (a piece of UI, that has it's own logic and appearance). They can be as small as a button and as large as a page.

There are following ways generally to create a component.

1. Function Component (Standard)
```jsx
// Standard component declaration
function Button({ children, onClick }) {
  return <button onClick={onClick}>{children}</button>;
}
export default Button;
```
2. Arrow Function Component
```jsx
// Modern arrow function syntax
const Button = ({ children, onClick }) => {
  return <button onClick={onClick}>{children}</button>;
};
export default Button;
```
3. Named Export Pattern
```jsx
// Multiple components in one file
export const PrimaryButton = (props) => { /* ... */ };
export const SecondaryButton = (props) => { /* ... */ };
export const IconButton = (props) => { /* ... */ };
```
🔧 Registry/Configuration Pattern
- What It Is: A component registry, usually for mapping them into standalone components. For example: navbar items, tools, menue items, and the like.
```typescript
// This is NOT a component declaration, but a COMPONENT REGISTRY
export const toolRegistry: Record<string, ToolDefinition> = {
  Search: {
    name: "Search",
    id: "SearchTool",
    action: () => { /* logic */ },
    Component: SearchBar, // ✅ Reference to actual component
  },
  Filter: {
    name: "Filter",
    id: "FilterTool",
    action: filterItems,
    Component: FilterPanel,
  },
};
```

Key Characteristics:
- Object-oriented configuration, not direct rendering

- Stores metadata about components (name, ID, actions)

- References components via Component property
 
- Centralized management of related components

Usage Example:
```jsx
// Dynamic component renderer using registry
const ToolRenderer = ({ toolId }) => {
  const toolConfig = toolRegistry[toolId];
  
  if (!toolConfig) return <div>Tool not found</div>;
  
  const { Component, props } = toolConfig;
  
  return <Component {...props} />;
};
// Usage: <ToolRenderer toolId="Search" />
```

📊 Comparison & Use Cases
When to Use Each Pattern:
Pattern	Use Case	Example
Direct Function	Simple, standalone components	Button, Input, Card
Arrow Function	Modern syntax, inline components	const Modal = () => {}
Registry Pattern	Plugin systems, dynamic UIs, toolbars	Toolbars, dashboard widgets, plugin architectures.

## 4. Nesting components

Once you have your components you can simply nest them:
```tsx

function MyButton() {
  return (
    <button>
      I'm a button
    </button>
  );
}

export default function MyApp() {
  return (
    <div>
      <h1>Welcome to my app</h1>
      <MyButton />
    </div>
  );
}
```
**Note:** `<MyButton />` starts with a capital letter. That’s how you know it’s a React component. React component names must always start with a capital letter, while HTML tags must be lowercase.

## 5. JSX markup syntax (not HTML):
Components return a JSX markup, not a HTML. ALthough it is optional, it is recommended.

- You have to use a wrapper `<> ...</>` or `<div>...</div>` into a shared parent.

If you have a lot of HTML to port to JSX, you can use an online converter. (https://transform.tools/html-to-jsx). 

## 6. Escaping back into javascript

Use a curly bracet, to use var names inside your markup. 
```jsx
return (
  <h1>
    {user.name}
  </h1>
);
```
Using a `"var"`, directly passes to HTML (markup) without rendering/reading, which is used in attributes for ex: css. 

However `{var}` reads it. 

```jsx
return (
  <img
    className="avatar"
    src={user.imageUrl}
  />
);
```
Here "avatar" is directly 

## 7. Hooks
Everyting starting with `use` is a hook, and is happenning at render time.
### 7.1 Compenent's memory ( `useState`)

We can use a `useSate` to store states of a component. It has a state (to show current State), and setState (to change the current state) props.

```tsx
import { useState } from 'react';

function MyButton() {
    const [count, setCount] = useState(0);
  // ...
}
```

Note that, each component has it's own state, for example, in bellow the state is from the parent of childrens (2 buttons), so while changing one, the other changes too.

```tsx
export default function MyApp() {
  const [count, setCount] = useState(0);

  function handleClick() {
    setCount(count + 1);
  }

  return (
    <div>
      <h1>Counters that update together</h1>
      <MyButton count={count} onClick={handleClick} />
      <MyButton count={count} onClick={handleClick} />
    </div>
  );
}
```
    
There are lot's of ways for more complicated management of states, like `zustand`, that are used in app you can check them.

### 7.2 Compenent's initializer (`useEffects`)
Effects are an escape hatch from the React paradigm. They let you “step outside” of React and synchronize your components with some external system like a non-React widget, network, or the browser DOM. If there is no external system involved (for example, if you want to update a component’s state when some props or state change), you shouldn’t need an Effect. Removing unnecessary Effects will make your code easier to follow, faster to run, and less error-prone.

