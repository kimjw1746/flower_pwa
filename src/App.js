// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import Main from "./components/Main";
import SearchResult from "./components/SearchResult";
import NaverShopping from "./components/NaverShopping";
import SearchAppBar from "./components/SearchAppbar";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="App">
        <SearchAppBar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/main" element={<Main />} />
          <Route path="/searchResult" element={<SearchResult />} />
          <Route path="/naverShopping/:key" element={<NaverShopping />} />
        </Routes>
        <footer style={{ textAlign: "center", padding: "20px", color: "#666", fontSize: "0.9rem" }}>
           @2021810019김주완.
        </footer>
      </div>
    </Router>
  );
}

export default App;