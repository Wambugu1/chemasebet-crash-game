import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import Admin from './Admin'
import './index.css'

// Simple router based on URL path
const path = window.location.pathname;

let Component = App;
if (path === '/admin') {
  Component = Admin;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Component />
  </React.StrictMode>
);